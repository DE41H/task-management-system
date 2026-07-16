<div align="center">

# Engineering Decisions

*Why TMS is built the way it is — every non-obvious choice, recorded as a mini-ADR.*

</div>

---

## Index

| # | Decision |
|---|----------|
| 00 | [Django + DRF as the foundation](#adr-00--django--drf-as-the-foundation) |
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
| 13 | [Celery + Redis for background email delivery](#adr-13--celery--redis-for-background-email-delivery) |

Also: [Problems faced & debugging](#problems-faced--debugging) · [Looking ahead](#looking-ahead)

---

## ADR-00 — Django + DRF as the foundation

**Context.** The system is a relational, permission-heavy CRUD API: four entity levels (team → project → task → comment), a role matrix enforced on every endpoint, and auth with token lifecycle management. Candidates considered: Django + DRF, FastAPI + SQLAlchemy, and Express/NestJS.

**Decision.** **Django 6 with Django REST Framework.** Django ships the parts this task grades — ORM with migrations, a hardened auth/password stack, and an admin — while DRF's building blocks map almost one-to-one onto the requirements: serializers (validation), composable permission classes (RBAC), viewsets + routers (CRUD), and built-in pagination, throttling, filtering, and versioning. The surrounding ecosystem (simplejwt, django-filter, drf-spectacular, Anymail, Celery integration) is mature enough that no security-critical component had to be hand-rolled.

**Consequences.**
- Authentication, password hashing, and validation come battle-tested rather than bespoke — the highest-risk code in the project is the least custom.
- The stack is sync-first. That fits a CRUD-bound workload behind gunicorn workers; if real-time features land (see roadmap), Django Channels is the incremental path.
- DRF's conventions carry more "magic" than a micro-framework — mitigated by keeping each app small and the permission model explicit in one file.

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
- Invariants that span rows — such as "a team always has at least one owner" — are enforced by in-transaction checks. The leave/remove path serializes these with a `select_for_update` on the team row; extending the same locking to the role-change path is on the roadmap.

---

## ADR-05 — Invitations as an explicit state machine

**Context.** Joining a team requires consent from both sides: a privileged member offers, the receiver decides. Directly creating memberships would put that whole negotiation on one actor.

**Decision.** An `Invitation` model with a four-state lifecycle — `pending → accepted | rejected | cancelled` — plus a 3-day default expiry. Receivers are addressed by **email** (a `SlugRelatedField` resolves the address to a user at the API boundary, while the database keeps a plain foreign key), and each user has an inbox of invitations addressed to them at `/auth/invites/`. Invitations are always born `pending`; serializer rules enforce the transitions: only pending, unexpired invites may change state; only the **receiver** may accept or reject; invite-scoped members may cancel. On accept, the membership is created **in the same transaction** as the status change, with the unique membership constraint (ADR-04) as the concurrency backstop.

**Consequences.**
- Inviting works the way people think — "invite this email" — with no client-side user-ID lookup step, and a miss resolves to a clean field-level `400`.
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

**Context.** The API serves programmatic clients and the bundled React SPA; session cookies would drag CSRF concerns into every client.

**Decision.** `djangorestframework-simplejwt` with deliberately tight settings: **15-minute access tokens**, 1-day refresh tokens, `ROTATE_REFRESH_TOKENS` + `BLACKLIST_AFTER_ROTATION` so every refresh invalidates its predecessor. Logout blacklists the refresh token, and a **password change blacklists every outstanding refresh token** for the user, ending all other sessions.

**Consequences.**
- A leaked access token is useful for at most 15 minutes; a leaked refresh token dies on first legitimate rotation — or immediately, on the next password change.
- Stateless verification keeps auth off the database for every request — only refresh, logout, and password change touch the blacklist table.
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

**Decision.** A two-stage Dockerfile: an `astral-sh/uv` builder runs `uv sync --frozen` (dependencies first, for layer caching; bytecode precompiled), then a slim `python:3.13` runtime stage copies the virtualenv and runs as a dedicated **non-root** user. Compose runs migrations and `collectstatic` on boot; nginx terminates TLS (Let's Encrypt), redirects HTTP→HTTPS, and serves static files with one-year immutable caching and gzip. `/health/` reports database and cache connectivity with latencies for external monitors.

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

## ADR-13 — Celery + Redis for background email delivery

**Context.** Invitations, task assignments, and status changes trigger emails. Sending them inline would couple request latency — and worse, request *success* — to a third-party email provider.

**Decision.** **Celery** workers with Redis as the broker (already deployed for caching and throttling), delivering through Anymail → Resend. Three rules shape the integration:

1. **Dispatch on commit** — every `.delay()` is wrapped in `transaction.on_commit`, so an email can never be sent for a write that rolled back.
2. **IDs over payloads** — tasks receive object IDs and re-read fresh state, never serialized snapshots that could go stale in the queue.
3. **Retry with backoff** — provider/network errors auto-retry up to 5 times with exponential backoff; a flaky SMTP moment doesn't drop mail.

`django-celery-beat` (database scheduler) is wired in as the home for future periodic jobs. Task payloads use msgpack for compactness.

**Consequences.**
- API latency is independent of the email provider; a Resend outage degrades to delayed mail, not failed requests.
- Dedicated worker and beat containers ship in both compose stacks — the dev/prod topology is identical.
- The activity-log-style guarantee extends to email: no notification without its committed action.

---

## Problems faced & debugging

The bugs that shaped the codebase, and how they were run down. Each one is visible in the git history.

### 1. Concurrent registration race

Two simultaneous signups with the same email both passed DRF's unique validators (each transaction couldn't see the other's uncommitted row), and the loser crashed with an unhandled `IntegrityError` → 500. Reproduced with parallel `curl` requests. The fix — catch `IntegrityError` at the create boundary and translate it into a field-level `400` — became the general pattern later formalized in [ADR-04](#adr-04--database-constraints-as-the-source-of-truth): let Postgres arbitrate races, translate at the edge.

### 2. The last-owner invariant, twice

The "a team must keep at least one owner" rule broke two ways before it held:

- **Wrong exclusion.** The owner-count check excluded rows by *user* (`exclude(user_id=...)`) instead of by the *membership being changed* (`exclude(id=instance.id)`), so demoting an owner miscounted whenever the requester was also an owner.
- **Check outside the transaction.** The removal-path check originally lived in `get_object()`, which runs before `perform_destroy`'s `@atomic` block — so under concurrency, two removals could each pass the check and then both commit, stranding the team ownerless. The check moved inside the transaction, guarded by `select_for_update` on the team row to serialize concurrent departures.

### 3. Silent pagination misordering

DRF logged `UnorderedObjectListWarning` on list endpoints — page contents weren't stable across requests because the querysets had no explicit ordering. Since UUIDv7 keys are time-ordered ([ADR-01](#adr-01--uuidv7-primary-keys-everywhere)), appending `order_by('-id')` to every list queryset fixed ordering without any new index.

### 4. Docker dev stack: the bind-mount vs virtualenv fight

The dev compose bind-mounts the source tree (`..:/app`) for hot reload — which silently *shadowed* the image's `/app/.venv`, so containers started with no dependencies. The fix is an anonymous volume for `/app/.venv` layered over the bind mount. A follow-up typo then put that volume entry under `env_file:` instead of `volumes:` in the beat service, which took a compose-config diff against the working services to spot.

### 5. Health-check deadlock in production

The backend container had a Docker healthcheck probing `http://127.0.0.1:8000/health/`, and nginx/Celery waited on `service_healthy`. In production `SECURE_SSL_REDIRECT` answers plain-HTTP probes with a `301` — the probe followed it to an HTTPS port that doesn't exist inside the container, failed forever, and the whole stack deadlocked at startup. Resolution: drop the internal probe (Docker's `depends_on` gains little for a stateless web process) and keep `/health/` for external monitors, which arrive through nginx over TLS.

### 6. gunicorn refusing to start as non-root

The hardened image creates a system user with `useradd -r`, which doesn't create a home directory — and gunicorn crashed at boot trying to resolve one. Fixed with `useradd -r -m`. A reminder that "run as non-root" is a checklist item with sharp edges: the runtime needs a real, writable identity, not just a UID.

---

## Looking ahead

A few refinements are queued behind the current milestone:

1. **Row-level locking on role changes** — extend the `select_for_update` already guarding member removal to the owner-demotion path.
2. **Fuzzy search** — Postgres `pg_trgm` similarity on task titles, upgrading the current `icontains` search.
3. **Response caching** — Redis-backed caching for hot, read-heavy endpoints (team member lists, activity feeds).
4. **Real-time updates** — live task and comment events over WebSockets via Django Channels.
5. **OAuth sign-in** — Google as a second identity path alongside password auth.
6. **API test suite** — automated tests asserting every cell of the RBAC permission matrix.

---

<div align="center">

*A decision isn't done until it's written down.*

</div>
