import { ArrowRight, CircleDashed, Link2, MoreHorizontal, Plus, Search, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import { Projects, Tasks } from '../api/endpoints'
import { useTeams } from '../components/AppShell'
import { AvatarStack } from '../components/Avatar'
import { ContextMenu, useContextMenu } from '../components/ContextMenu'
import { Dropdown } from '../components/Dropdown'
import { EmptyState } from '../components/EmptyState'
import { InfiniteLoader } from '../components/InfiniteLoader'
import { ConfirmDialog, Modal } from '../components/Modal'
import { PriorityIcon, TASK_PRIORITIES } from '../components/PriorityIcon'
import { StatusIcon, TASK_STATUSES } from '../components/StatusIcon'
import { useToast } from '../components/ToastProvider'
import { useMembers } from '../hooks/useMembers'
import { usePaged } from '../hooks/usePaged'
import { formatDate, localInputToIso } from '../lib/format'

const ORDERINGS = [
  { value: '-created_at', label: 'Newest first' },
  { value: 'created_at', label: 'Oldest first' },
  { value: 'due', label: 'Due date ↑' },
  { value: '-due', label: 'Due date ↓' },
]

export function ProjectPage() {
  const { teamId, projectId } = useParams()
  const { teams } = useTeams()
  const navigate = useNavigate()
  const toast = useToast()
  const team = teams.find((t) => t.id === teamId)
  const { members, userById } = useMembers(teamId)

  const [project, setProject] = useState(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [creating, setCreating] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [busy, setBusy] = useState(false)
  const { menuState, openMenu, closeMenu } = useContextMenu()
  const [menuTask, setMenuTask] = useState(null)
  const [deletingTask, setDeletingTask] = useState(null)

  useEffect(() => {
    Projects.get(teamId, projectId)
      .then((p) => {
        setProject(p)
        setTitle(p.title)
        setDescription(p.description || '')
      })
      .catch((err) => {
        toast.error(err)
        navigate(`/teams/${teamId}/projects`, { replace: true })
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamId, projectId])

  const [filters, setFilters] = useState({ status: '', priority: '', ordering: '-created_at' })
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 300)
    return () => clearTimeout(t)
  }, [searchInput])

  const paged = usePaged(
    (page) => Tasks.list(teamId, projectId, { page, search, ...filters }),
    [teamId, projectId, search, filters.status, filters.priority, filters.ordering],
  )

  const patchProject = async (body) => {
    try {
      const updated = await Projects.update(teamId, projectId, body)
      setProject(updated)
      setTitle(updated.title)
      setDescription(updated.description || '')
    } catch (err) {
      toast.error(err)
      setTitle(project.title)
      setDescription(project.description || '')
    }
  }

  const deleteProject = async () => {
    setBusy(true)
    try {
      await Projects.remove(teamId, projectId)
      toast.success('Project deleted')
      navigate(`/teams/${teamId}/projects`)
    } catch (err) {
      toast.error(err)
      setBusy(false)
      setDeleting(false)
    }
  }

  const updateTask = async (task, body) => {
    try {
      await Tasks.update(teamId, projectId, task.id, body)
      paged.reload()
    } catch (err) {
      toast.error(err)
    }
  }

  const copyTaskLink = (task) => {
    navigator.clipboard?.writeText(
      `${window.location.origin}/teams/${teamId}/projects/${projectId}/tasks/${task.id}`,
    )
    toast.success('Task link copied')
  }

  const deleteTask = async () => {
    setBusy(true)
    try {
      await Tasks.remove(teamId, projectId, deletingTask.id)
      toast.success('Task deleted')
      paged.reload()
    } catch (err) {
      toast.error(err)
    } finally {
      setBusy(false)
      setDeletingTask(null)
    }
  }

  if (!project) return <div className="spinner" />

  const setFilter = (key) => (e) => setFilters((f) => ({ ...f, [key]: e.target.value }))

  return (
    <>
      <header className="page-header">
        <nav className="breadcrumb">
          <Link to={`/teams/${teamId}/projects`}>{team?.name ?? 'Team'}</Link>
          <span className="sep">/</span>
          <Link to={`/teams/${teamId}/projects`}>Projects</Link>
          <span className="sep">/</span>
          <span className="current">{project.title}</span>
        </nav>
        <span className="spacer" />
        <Dropdown
          align="right"
          trigger={
            <button className="btn btn-ghost btn-icon" aria-label="Project actions">
              <MoreHorizontal size={15} />
            </button>
          }
        >
          {(close) => (
            <button
              className="menu-item danger"
              onClick={() => {
                close()
                setDeleting(true)
              }}
            >
              <Trash2 size={14} />
              Delete project
            </button>
          )}
        </Dropdown>
        <button className="btn btn-primary btn-sm" onClick={() => setCreating(true)}>
          <Plus size={13} />
          New task
        </button>
      </header>

      <div className="page-body">
        <input
          className="title-input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={() => {
            const t = title.trim()
            if (t && t !== project.title) patchProject({ title: t })
            else setTitle(project.title)
          }}
          onKeyDown={(e) => e.key === 'Enter' && e.target.blur()}
        />
        <textarea
          className="desc-input"
          value={description}
          placeholder="Add a description…"
          onChange={(e) => setDescription(e.target.value)}
          onBlur={() => {
            if (description !== (project.description || '')) patchProject({ description: description || null })
          }}
        />

        <div className="filter-bar" style={{ marginTop: 18 }}>
          <select className={`select pill${filters.status ? ' engaged' : ''}`} value={filters.status} onChange={setFilter('status')}>
            <option value="">All statuses</option>
            {TASK_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
          <select className={`select pill${filters.priority ? ' engaged' : ''}`} value={filters.priority} onChange={setFilter('priority')}>
            <option value="">All priorities</option>
            {TASK_PRIORITIES.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
          <select className="select pill" value={filters.ordering} onChange={setFilter('ordering')}>
            {ORDERINGS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <div style={{ position: 'relative' }}>
            <Search size={13} style={{ position: 'absolute', left: 9, top: 7, color: 'var(--text-faint)' }} />
            <input
              className="input pill"
              style={{ paddingLeft: 28, width: 180 }}
              placeholder="Search tasks…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>
        </div>

        {paged.loading && paged.items.length === 0 ? (
          <div className="spinner" />
        ) : paged.items.length === 0 ? (
          <EmptyState
            icon={CircleDashed}
            title="No tasks found"
            hint={search || filters.status || filters.priority ? 'Try clearing the filters.' : 'Create the first task for this project.'}
          />
        ) : (
          <div className="rows">
            {paged.items.map((task) => (
              <div
                key={task.id}
                className="row"
                onClick={() => navigate(`tasks/${task.id}`)}
                onContextMenu={(e) => {
                  setMenuTask(task)
                  openMenu(e)
                }}
              >
                <PriorityIcon priority={task.priority} />
                <StatusIcon status={task.status} />
                <span className="row-title">{task.title}</span>
                <span className="row-spacer" />
                {task.due && (
                  <span className={`chip${task.is_overdue ? ' overdue' : ''}`}>{formatDate(task.due)}</span>
                )}
                <AvatarStack users={task.assignees.map((id) => userById[id]).filter(Boolean)} />
              </div>
            ))}
          </div>
        )}
        <InfiniteLoader paged={paged} noun="tasks" />
      </div>

      <ContextMenu state={menuState} onClose={closeMenu} label={menuTask?.title}>
        {(close) => (
          <>
            <button className="menu-item" onClick={() => { close(); navigate(`tasks/${menuTask.id}`) }}>
              <ArrowRight size={14} />
              Open task
            </button>
            <div className="menu-sep" />
            <div className="menu-label">Status</div>
            {TASK_STATUSES.map((s) => (
              <button
                key={s.value}
                className="menu-item"
                onClick={() => { close(); if (s.value !== menuTask.status) updateTask(menuTask, { status: s.value }) }}
              >
                <StatusIcon status={s.value} />
                {s.label}
              </button>
            ))}
            <div className="menu-label">Priority</div>
            {TASK_PRIORITIES.map((p) => (
              <button
                key={p.value}
                className="menu-item"
                onClick={() => { close(); if (p.value !== menuTask.priority) updateTask(menuTask, { priority: p.value }) }}
              >
                <PriorityIcon priority={p.value} />
                {p.label}
              </button>
            ))}
            <div className="menu-sep" />
            <button className="menu-item" onClick={() => { close(); copyTaskLink(menuTask) }}>
              <Link2 size={14} />
              Copy link
            </button>
            <button className="menu-item danger" onClick={() => { close(); setDeletingTask(menuTask) }}>
              <Trash2 size={14} />
              Delete task
            </button>
          </>
        )}
      </ContextMenu>

      {deletingTask && (
        <ConfirmDialog
          title="Delete task"
          message={`Delete "${deletingTask.title}"? This cannot be undone.`}
          onConfirm={deleteTask}
          onClose={() => setDeletingTask(null)}
          busy={busy}
        />
      )}

      {creating && (
        <CreateTaskModal
          teamId={teamId}
          projectId={projectId}
          members={members}
          onClose={() => setCreating(false)}
          onCreated={() => {
            setCreating(false)
            paged.reload()
          }}
        />
      )}
      {deleting && (
        <ConfirmDialog
          title="Delete project"
          message={`Delete "${project.title}" and all of its tasks? This cannot be undone.`}
          onConfirm={deleteProject}
          onClose={() => setDeleting(false)}
          busy={busy}
        />
      )}
    </>
  )
}

function CreateTaskModal({ teamId, projectId, members, onClose, onCreated }) {
  const toast = useToast()
  const [form, setForm] = useState({
    title: '',
    description: '',
    status: 'active',
    priority: 'low',
    due: '',
  })
  const [assignees, setAssignees] = useState([])
  const [busy, setBusy] = useState(false)

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const toggleAssignee = (userId) =>
    setAssignees((list) => (list.includes(userId) ? list.filter((id) => id !== userId) : [...list, userId]))

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    try {
      const body = {
        title: form.title.trim(),
        description: form.description.trim(),
        status: form.status,
        priority: form.priority,
        due: localInputToIso(form.due),
      }
      // Sending `assignees` requires the task:assign scope — omit it when empty
      // so lower roles can still create unassigned tasks.
      if (assignees.length > 0) body.assignees = assignees
      const task = await Tasks.create(teamId, projectId, body)
      toast.success(`Task "${task.title}" created`)
      onCreated(task)
    } catch (err) {
      toast.error(err)
      setBusy(false)
    }
  }

  return (
    <Modal title="New task" onClose={onClose}>
      <form onSubmit={submit}>
        <div className="field">
          <label htmlFor="task-title">Title</label>
          <input id="task-title" className="input" value={form.title} onChange={set('title')} autoFocus required />
        </div>
        <div className="field">
          <label htmlFor="task-desc">Description</label>
          <textarea id="task-desc" className="textarea" value={form.description} onChange={set('description')} />
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <div className="field" style={{ flex: 1 }}>
            <label htmlFor="task-status">Status</label>
            <select id="task-status" className="select" value={form.status} onChange={set('status')}>
              {TASK_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          <div className="field" style={{ flex: 1 }}>
            <label htmlFor="task-priority">Priority</label>
            <select id="task-priority" className="select" value={form.priority} onChange={set('priority')}>
              {TASK_PRIORITIES.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="field">
          <label htmlFor="task-due">Due</label>
          <input id="task-due" type="datetime-local" className="input" value={form.due} onChange={set('due')} />
        </div>
        <div className="field">
          <label>Assignees</label>
          <div className="check-list">
            {members.length === 0 && (
              <span style={{ color: 'var(--text-faint)', padding: '5px 7px' }}>No members found</span>
            )}
            {members.map((m) => (
              <label key={m.id} className="check-item">
                <input type="checkbox" checked={assignees.includes(m.user.id)} onChange={() => toggleAssignee(m.user.id)} />
                {m.user.username}
                <span style={{ color: 'var(--text-faint)', fontSize: 12 }}>{m.role}</span>
              </label>
            ))}
          </div>
        </div>
        <div className="modal-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={busy || !form.title.trim()}>
            Create task
          </button>
        </div>
      </form>
    </Modal>
  )
}
