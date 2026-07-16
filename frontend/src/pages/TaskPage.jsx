import { Check, MoreHorizontal, Pencil, Trash2, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import { Comments, Projects, Tasks } from '../api/endpoints'
import { useAuth } from '../auth/AuthContext'
import { useTeams } from '../components/AppShell'
import { Avatar } from '../components/Avatar'
import { Dropdown } from '../components/Dropdown'
import { InfiniteLoader } from '../components/InfiniteLoader'
import { ConfirmDialog } from '../components/Modal'
import { PriorityIcon, priorityLabel, TASK_PRIORITIES } from '../components/PriorityIcon'
import { StatusIcon, statusLabel, TASK_STATUSES } from '../components/StatusIcon'
import { useToast } from '../components/ToastProvider'
import { useMembers } from '../hooks/useMembers'
import { usePaged } from '../hooks/usePaged'
import { formatDateTime, isoToLocalInput, localInputToIso, relativeTime } from '../lib/format'

export function TaskPage() {
  const { teamId, projectId, taskId } = useParams()
  const { teams } = useTeams()
  const navigate = useNavigate()
  const toast = useToast()
  const team = teams.find((t) => t.id === teamId)
  const { members, userById } = useMembers(teamId)

  const [task, setTask] = useState(null)
  const [project, setProject] = useState(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    Tasks.get(teamId, projectId, taskId)
      .then((t) => {
        setTask(t)
        setTitle(t.title)
        setDescription(t.description || '')
      })
      .catch((err) => {
        toast.error(err)
        navigate(`/teams/${teamId}/projects/${projectId}`, { replace: true })
      })
    Projects.get(teamId, projectId).then(setProject).catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamId, projectId, taskId])

  const patchTask = async (body) => {
    try {
      const updated = await Tasks.update(teamId, projectId, taskId, body)
      setTask(updated)
      setTitle(updated.title)
      setDescription(updated.description || '')
    } catch (err) {
      toast.error(err)
      if (task) {
        setTitle(task.title)
        setDescription(task.description || '')
      }
    }
  }

  const deleteTask = async () => {
    setBusy(true)
    try {
      await Tasks.remove(teamId, projectId, taskId)
      toast.success('Task deleted')
      navigate(`/teams/${teamId}/projects/${projectId}`)
    } catch (err) {
      toast.error(err)
      setBusy(false)
      setDeleting(false)
    }
  }

  if (!task) return <div className="spinner" />

  const toggleAssignee = (userId) => {
    const next = task.assignees.includes(userId)
      ? task.assignees.filter((id) => id !== userId)
      : [...task.assignees, userId]
    patchTask({ assignees: next })
  }

  return (
    <>
      <header className="page-header">
        <nav className="breadcrumb">
          <Link to={`/teams/${teamId}/projects`}>{team?.name ?? 'Team'}</Link>
          <span className="sep">/</span>
          <Link to={`/teams/${teamId}/projects/${projectId}`}>{project?.title ?? 'Project'}</Link>
          <span className="sep">/</span>
          <span className="current">{task.title}</span>
        </nav>
        <span className="spacer" />
        <Dropdown
          align="right"
          trigger={
            <button className="btn btn-ghost btn-icon" aria-label="Task actions">
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
              Delete task
            </button>
          )}
        </Dropdown>
      </header>

      <div className="page-body">
        <div className="task-layout">
          <div className="task-main">
            <input
              className="title-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={() => {
                const t = title.trim()
                if (t && t !== task.title) patchTask({ title: t })
                else setTitle(task.title)
              }}
              onKeyDown={(e) => e.key === 'Enter' && e.target.blur()}
            />
            <textarea
              className="desc-input"
              value={description}
              placeholder="Add a description…"
              onChange={(e) => setDescription(e.target.value)}
              onBlur={() => {
                if (description !== (task.description || '')) patchTask({ description })
              }}
            />

            <CommentsSection teamId={teamId} projectId={projectId} taskId={taskId} userById={userById} />
          </div>

          <aside className="task-props">
            <div className="prop-row">
              <span className="prop-label">Status</span>
              <Dropdown
                trigger={
                  <button className="prop-trigger">
                    <StatusIcon status={task.status} />
                    {statusLabel(task.status)}
                  </button>
                }
              >
                {(close) => TASK_STATUSES.map((s) => (
                  <button
                    key={s.value}
                    className="menu-item"
                    onClick={() => {
                      close()
                      if (s.value !== task.status) patchTask({ status: s.value })
                    }}
                  >
                    <StatusIcon status={s.value} />
                    {s.label}
                    {s.value === task.status && <Check size={13} style={{ marginLeft: 'auto' }} />}
                  </button>
                ))}
              </Dropdown>
            </div>

            <div className="prop-row">
              <span className="prop-label">Priority</span>
              <Dropdown
                trigger={
                  <button className="prop-trigger">
                    <PriorityIcon priority={task.priority} />
                    {priorityLabel(task.priority)}
                  </button>
                }
              >
                {(close) => TASK_PRIORITIES.map((p) => (
                  <button
                    key={p.value}
                    className="menu-item"
                    onClick={() => {
                      close()
                      if (p.value !== task.priority) patchTask({ priority: p.value })
                    }}
                  >
                    <PriorityIcon priority={p.value} />
                    {p.label}
                    {p.value === task.priority && <Check size={13} style={{ marginLeft: 'auto' }} />}
                  </button>
                ))}
              </Dropdown>
            </div>

            <div className="prop-row">
              <span className="prop-label">Assignees</span>
              <Dropdown
                trigger={
                  <button className="prop-trigger">
                    {task.assignees.length === 0
                      ? 'Add assignees'
                      : task.assignees.map((id) => userById[id]?.username ?? '…').join(', ')}
                  </button>
                }
              >
                {() => (
                  <>
                    <div className="menu-label">Team members</div>
                    {members.map((m) => (
                      <button key={m.id} className="menu-item" onClick={() => toggleAssignee(m.user.id)}>
                        <Avatar user={m.user} size={16} />
                        {m.user.username}
                        {task.assignees.includes(m.user.id) && <Check size={13} style={{ marginLeft: 'auto' }} />}
                      </button>
                    ))}
                  </>
                )}
              </Dropdown>
            </div>

            <div className="prop-row">
              <span className="prop-label">Due</span>
              <span className="prop-value" style={{ gap: 4 }}>
                <input
                  type="datetime-local"
                  className="input"
                  style={{ height: 28, fontSize: 12.5, width: 170 }}
                  value={isoToLocalInput(task.due)}
                  onChange={(e) => patchTask({ due: localInputToIso(e.target.value) })}
                />
                {task.due && (
                  <button className="btn btn-ghost btn-icon" title="Clear due date" onClick={() => patchTask({ due: null })}>
                    <X size={13} />
                  </button>
                )}
              </span>
            </div>

            {task.is_overdue && (
              <div className="prop-row">
                <span className="prop-label" />
                <span className="chip overdue">Overdue</span>
              </div>
            )}

            <div className="prop-row">
              <span className="prop-label">Creator</span>
              <span className="prop-value">
                {task.creator ? (
                  <>
                    <Avatar user={userById[task.creator] ?? { id: task.creator, username: '?' }} size={16} />
                    {userById[task.creator]?.username ?? 'Former member'}
                  </>
                ) : (
                  '—'
                )}
              </span>
            </div>

            <div className="prop-row">
              <span className="prop-label">Created</span>
              <span className="prop-value" style={{ color: 'var(--text-muted)' }}>{formatDateTime(task.created_at)}</span>
            </div>
            <div className="prop-row">
              <span className="prop-label">Updated</span>
              <span className="prop-value" style={{ color: 'var(--text-muted)' }}>{formatDateTime(task.updated_at)}</span>
            </div>
          </aside>
        </div>
      </div>

      {deleting && (
        <ConfirmDialog
          title="Delete task"
          message={`Delete "${task.title}"? This cannot be undone.`}
          onConfirm={deleteTask}
          onClose={() => setDeleting(false)}
          busy={busy}
        />
      )}
    </>
  )
}

function CommentsSection({ teamId, projectId, taskId, userById }) {
  const { user } = useAuth()
  const toast = useToast()
  const [draft, setDraft] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editText, setEditText] = useState('')
  const [busy, setBusy] = useState(false)

  const paged = usePaged(
    (page) => Comments.list(teamId, projectId, taskId, { page }),
    [teamId, projectId, taskId],
  )

  const addComment = async (e) => {
    e.preventDefault()
    if (!draft.trim()) return
    setBusy(true)
    try {
      await Comments.create(teamId, projectId, taskId, { content: draft.trim() })
      setDraft('')
      paged.reload()
    } catch (err) {
      toast.error(err)
    } finally {
      setBusy(false)
    }
  }

  const saveEdit = async (commentId) => {
    try {
      await Comments.update(teamId, projectId, taskId, commentId, { content: editText.trim() })
      setEditingId(null)
      paged.reload()
    } catch (err) {
      toast.error(err)
    }
  }

  const remove = async (commentId) => {
    try {
      await Comments.remove(teamId, projectId, taskId, commentId)
      paged.reload()
    } catch (err) {
      toast.error(err)
    }
  }

  return (
    <div className="comments">
      <h3>Comments{paged.count > 0 ? ` · ${paged.count}` : ''}</h3>

      {paged.items.map((comment) => {
        const author = userById[comment.author]
        return (
          <div key={comment.id} className="comment">
            <Avatar user={author ?? { id: comment.author, username: '?' }} size={24} />
            <div className="comment-body">
              <div className="comment-head">
                <span className="comment-author">
                  {author?.username ?? (comment.author === user.id ? user.username : 'Former member')}
                </span>
                <span className="comment-time" title={formatDateTime(comment.created_at)}>
                  {relativeTime(comment.created_at)}
                  {comment.updated_at !== comment.created_at && ' · edited'}
                </span>
              </div>
              {editingId === comment.id ? (
                <div>
                  <textarea className="textarea" value={editText} onChange={(e) => setEditText(e.target.value)} autoFocus />
                  <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                    <button className="btn btn-primary btn-sm" onClick={() => saveEdit(comment.id)} disabled={!editText.trim()}>
                      Save
                    </button>
                    <button className="btn btn-secondary btn-sm" onClick={() => setEditingId(null)}>
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <p className="comment-text">{comment.content}</p>
              )}
            </div>
            {editingId !== comment.id && (
              <div className="comment-actions">
                <button
                  className="btn btn-ghost btn-icon"
                  title="Edit comment"
                  onClick={() => {
                    setEditingId(comment.id)
                    setEditText(comment.content)
                  }}
                >
                  <Pencil size={13} />
                </button>
                <button className="btn btn-ghost btn-icon" title="Delete comment" onClick={() => remove(comment.id)}>
                  <Trash2 size={13} />
                </button>
              </div>
            )}
          </div>
        )
      })}

      <InfiniteLoader paged={paged} noun="comments" />

      <form onSubmit={addComment} style={{ display: 'flex', gap: 10, marginTop: 12 }}>
        <Avatar user={user} size={24} />
        <div style={{ flex: 1 }}>
          <textarea
            className="textarea"
            placeholder="Leave a comment…"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
            <button className="btn btn-primary btn-sm" disabled={busy || !draft.trim()}>
              Comment
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
