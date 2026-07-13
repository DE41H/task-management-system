<div align="center">

# Engineering Decisions

*Why TMS is built the way it is — every non-obvious choice, recorded as a mini-ADR.*

</div>

---

## Index

| # | Decision |
|---|----------|
| 01 | [UUIDv7 primary keys everywhere](#adr-01--uuidv7-primary-keys-everywhere) |
| 02 | [Multi-tenancy through URL-scoped querysets](#adr-02--multi-tenancy-through-url-scoped-querysets) |
| 03 | [RBAC as a code-defined role → scope map](#adr-03--rbac-as-a-code-defined-role--scope-map) |
| 04 | [Database constraints as the source of truth](#adr-04--database-constraints-as-the-source-of-truth) |
| 05 | [Invitations as an explicit state machine](#adr-05--invitations-as-an-explicit-state-machine) |
| 06 | [Activity logs as denormalized snapshots](#adr-06--activity-logs-as-denormalized-snapshots) |
| 07 | [Stateless JWT auth with rotation & blacklist](#adr-07--stateless-jwt-auth-with-rotation--blacklist) |
| 08 | [Per-operation transactions](#adr-08--per-operation-transactions) |
| 09 | [PostgreSQL with native connection pooling](#adr-09--postgresql-with-native-connection-pooling) |
| 10 | [URL-path API versioning from day one](#adr-10--url-path-api-versioning-from-day-one) |
| 11 | [uv-based multi-stage container build](#adr-11--uv-based-multi-stage-container-build) |
| 12 | [Custom user model with unique email](#adr-12--custom-user-model-with-unique-email) |

---

## ADR-01 — UUIDv7 primary keys everywhere

**Context.** Sequential integer IDs leak business information (row counts, growth rate) and make resources enumerable. Random UUIDv4s avoid that but fragment B-tree indexes, hurting insert locality on Postgres.

**Decision.** A shared abstract `BaseModel` (`base/models.py`) gives every table a **UUIDv7** primary key (via `uuid6`) plus `created_at` / `updated_at` timestamps. UUIDv7 embeds a millisecond timestamp, so keys are time-ordered.

**Consequences.**
- IDs are globally unique, non-enumerable, and safe to expose in URLs.
- Time-ordering means `ORDER BY id` doubles as creation order — list endpoints sort by `-id` with no extra index.
- Index pages fill append-mostly, avoiding the UUIDv4 fragmentation penalty.

---

## ADR-02 — Multi-tenancy through URL-scoped querysets

**Context.** Every resource belongs to a team. Authorization bugs in multi-tenant systems most often come from a single forgotten ownership check.

**Decision.** The URL hierarchy *is* the tenancy model: `/teams/{team}/projects/{project}/tasks/{task}/`. Every `get_queryset` filters through the full chain from the URL kwargs (e.g. `Task.objects.filter(project_id=..., project__team_id=...)`). Permission classes decide *what you may do*; querysets decide *what exists for you*.

**Consequences.**
- Cross-tenant access fails as a **404 at the ORM level** — even if a permission check were wrong, the object is simply not found. Defense in depth.
- 404 (rather than 403) avoids confirming that a foreign resource exists.
- Slightly longer JOINs per request — a deliberate trade for safety.

---

## ADR-03 — RBAC as a code-defined role → scope map

**Context.** Four team roles need fine-grained, auditable permissions. Alternatives considered: Django's group/permission tables, `django-guardian` object permissions, or a hand-rolled mapping.

**Decision.** Roles and scopes live in code (`teams/permissions.py`): a `Scope` catalog (`task:assign`, `team:invite`, …) and a `SCOPES` dict building each role as a **superset of the role below it**. A `HasPermission(*scopes)` factory produces DRF permission classes that resolve the caller's membership once per request (cached on the request object) and compose with `|` for object-level refinements (task assignees, comment authors, invite receivers).

**Consequences.**
- The entire permission matrix is readable in ~20 lines and versioned with the code — no hidden state in database tables.
- Adding a scope or role is a one-file change, reviewed like any other diff.
- Per-user permission overrides are intentionally out of scope — roles stay the single source of authority, which keeps the model simple and predictable.

---

## ADR-04 — Database constraints as the source of truth

**Context.** Application-level validation alone cannot survive concurrent requests — two simultaneous writes can both pass a "does it already exist?" check.

**Decision.** Every invariant that *can* be a constraint *is* one:

| Invariant | Constraint |
|-----------|------------|
| One membership per user per team | `UniqueConstraint(user, team)` |
| Unique project titles within a team | `UniqueConstraint(team, title)` |
| Unique task titles within a project | `UniqueConstraint(project, title)` |
| You cannot invite yourself | `CheckConstraint(sender ≠ receiver)` |

Views translate `IntegrityError` into friendly `400` responses, letting the database arbitrate races instead of pre-checking and hoping.

**Consequences.**
- Race conditions on uniqueness are *resolved by Postgres*, not merely made unlikely.
- By convention, `IntegrityError` is caught around the transaction boundary (or re-raised immediately inside it), keeping the catch-and-translate pattern transaction-safe.
- Invariants that span rows — such as "a team always has at least one owner" — are enforced by in-transaction checks; strengthening these with row-level locking is on the roadmap.

---

## ADR-05 — Invitations as an explicit state machine

**Context.** Joining a team requires consent from both sides: a privileged member offers, the receiver decides. Directly creating memberships would put that whole negotiation on one actor.

**Decision.** An `Invitation` model with a four-state lifecycle — `pending → accepted | rejected | cancelled` — plus a 3-day default expiry. Invitations are always born `pending`; serializer rules enforce the transitions: only pending, unexpired invites may change state; only the **receiver** may accept or reject; invite-scoped members may cancel. On accept, the membership is created **in the same transaction** as the status change, with the unique membership constraint (ADR-04) as the concurrency backstop.

**Consequences.**
- Double-accepts and accept-after-join collapse into a clean `400` via the constraint — never a duplicate membership.
- Expiry is evaluated at read time (`is_expired` property) — no cron job needed to sweep stale invites.
- Role escalation is bounded: maintainers cannot mint owners.

---

## ADR-06 — Activity logs as denormalized snapshots

**Context.** Teams need a human-readable "what happened" feed. Structured event sourcing (actor / verb / object tables) is powerful but heavy, and rendering must survive the referenced objects being renamed or deleted.

**Decision.** `Log` rows store a **pre-rendered content string** (e.g. *"ada created task 'Ship v1'"*) with the acting user (`SET_NULL` on user deletion) and team (`CASCADE`). Writes go through a single `Log.record()` classmethod, called from the view layer — the only layer that knows *who* acted. A composite `(team, -id)` index matches the read pattern: newest-first per team.

**Consequences.**
- Log lines are immutable snapshots — renames and deletions never retroactively rewrite history.
- The feed endpoint is one indexed query with a `select_related('user')`.
- This is an audit feed by design, not an analytics store — aggregation stays out of scope.
- Logging lives in `perform_*` hooks rather than model `save()` — the view layer is the only place the acting user is known, and it keeps models free of request concerns.

---

## ADR-07 — Stateless JWT auth with rotation & blacklist

**Context.** The API serves programmatic clients and a future SPA; session cookies would drag CSRF concerns into every client.

**Decision.** `djangorestframework-simplejwt` with deliberately tight settings: **15-minute access tokens**, 1-day refresh tokens, `ROTATE_REFRESH_TOKENS` + `BLACKLIST_AFTER_ROTATION` so every refresh invalidates its predecessor. Logout blacklists the refresh token.

**Consequences.**
- A leaked access token is useful for at most 15 minutes; a leaked refresh token dies on first legitimate rotation.
- Stateless verification keeps auth off the database for every request — only refresh and logout touch the blacklist table.
- Any credential or membership change takes full effect within the 15-minute access window.

---

## ADR-08 — Per-operation transactions

**Context.** Several operations write twice or more: create team + owner membership + log; accept invite + create membership; every mutation + its activity log. A failure between writes must not leave half-applied state.

**Decision.** Every multi-write `perform_*` method across `teams/`, `projects/`, and `tasks/` is wrapped in `transaction.atomic`, making *change + log* a single unit.

**Consequences.**
- The activity feed can never show an action that rolled back, and no action commits without its log line.
- Read-only requests stay transaction-free — the cost is paid only where writes happen.
- `ATOMIC_REQUESTS` (one transaction per request) remains a candidate consolidation as the API grows.

---

## ADR-09 — PostgreSQL with native connection pooling

**Context.** Gunicorn runs multiple workers; per-request connection setup is measurable latency, and an external pooler (pgbouncer) is another moving part this deployment doesn't yet need.

**Decision.** PostgreSQL 17 via **psycopg 3** with Django's built-in pool (`OPTIONS: {'pool': True}`). Redis backs the cache and DRF throttle counters (60/min anonymous, 120/min authenticated).

**Consequences.**
- Warm connections per worker without extra infrastructure.
- Postgres-only features (enforced check constraints, composite indexes) are used freely — database portability is explicitly a non-goal.

---

## ADR-10 — URL-path API versioning from day one

**Context.** Retrofitting versioning onto a live API is painful; clients hardcode paths immediately.

**Decision.** DRF `URLPathVersioning` with `/api/v1/` as the only allowed version, plus global defaults that make every endpoint uniform: page-number pagination (20/page), throttling, and a drf-spectacular OpenAPI schema served at `/api/v1/docs/` and `/api/v1/redoc/`.

**Consequences.**
- Breaking changes get a home (`/api/v2/`) without archaeology.
- The version is explicit in every URL, log line, and client config.

---

## ADR-11 — uv-based multi-stage container build

**Context.** Images should be small, reproducible, and not run as root; dependency resolution should be locked and fast.

**Decision.** A two-stage Dockerfile: an `astral-sh/uv` builder runs `uv sync --frozen` (dependencies first, for layer caching; bytecode precompiled), then a slim `python:3.13` runtime stage copies the virtualenv and runs as a dedicated **non-root** user. Compose runs migrations and `collectstatic` on boot; nginx terminates TLS (Let's Encrypt), redirects HTTP→HTTPS, and serves static files with 28-day caching. `/health/` reports database and cache connectivity with latencies for external monitors.

**Consequences.**
- `uv.lock` makes builds reproducible; the runtime image carries no build toolchain.
- Zero-step deploys via auto-migration on boot — a good fit for the current single-node topology.

---

## ADR-12 — Custom user model with unique email

**Context.** Swapping Django's user model after the first migration is effectively impossible — it is the framework's hardest-to-reverse decision.

**Decision.** `CustomUser(AbstractUser, BaseModel)` from day one — inheriting UUIDv7 keys and timestamps, and making `email` **unique** at the database level. Registration runs new passwords through Django's full validator stack against the would-be user's attributes.

**Consequences.**
- Future auth changes (email login, SSO fields) are ordinary migrations, not a rebuild.
- Username remains the login credential for now; unique email keeps a future switch to email-login a small, safe change.

---

## Looking ahead

A few refinements are queued behind the current milestone, in rough priority order:

1. **Test suite** — permission-matrix and invitation-lifecycle coverage first; both are tabular and high-value.
2. **Row-level locking** — `select_for_update` on the team row to serialize concurrent membership changes under the last-owner invariant.
3. **Invite delivery** — background email notifications and a receiver-facing invite inbox.
4. **Transaction consolidation** — evaluate `ATOMIC_REQUESTS` as the successor to per-view wrappers.

---

<div align="center">

*A decision isn't done until it's written down.*

</div>
