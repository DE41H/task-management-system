import { ArrowRight, Layers, Link2, Plus, Search, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { Projects } from '../api/endpoints'
import { useTeams } from '../components/AppShell'
import { ContextMenu, useContextMenu } from '../components/ContextMenu'
import { EmptyState } from '../components/EmptyState'
import { InfiniteLoader } from '../components/InfiniteLoader'
import { ConfirmDialog, Modal } from '../components/Modal'
import { useToast } from '../components/ToastProvider'
import { usePaged } from '../hooks/usePaged'
import { relativeTime } from '../lib/format'

export function ProjectsPage() {
  const { teamId } = useParams()
  const { teams } = useTeams()
  const navigate = useNavigate()
  const team = teams.find((t) => t.id === teamId)

  const toast = useToast()
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [creating, setCreating] = useState(false)
  const [deleting, setDeleting] = useState(null) // project pending deletion
  const [busy, setBusy] = useState(false)
  const { menuState, openMenu, closeMenu } = useContextMenu()
  const [menuTarget, setMenuTarget] = useState(null)

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 300)
    return () => clearTimeout(t)
  }, [searchInput])

  const paged = usePaged((page) => Projects.list(teamId, { page, search }), [teamId, search])

  const copyLink = (project) => {
    navigator.clipboard?.writeText(`${window.location.origin}/teams/${teamId}/projects/${project.id}`)
    toast.success('Project link copied')
  }

  const deleteProject = async () => {
    setBusy(true)
    try {
      await Projects.remove(teamId, deleting.id)
      toast.success(`Project "${deleting.title}" deleted`)
      paged.reload()
    } catch (err) {
      toast.error(err)
    } finally {
      setBusy(false)
      setDeleting(null)
    }
  }

  return (
    <>
      <header className="page-header">
        <span className="page-title">{team ? `${team.name} · Projects` : 'Projects'}</span>
        <span className="spacer" />
        <div style={{ position: 'relative' }}>
          <Search size={13} style={{ position: 'absolute', left: 9, top: 7, color: 'var(--text-faint)' }} />
          <input
            className="input pill"
            style={{ paddingLeft: 28, width: 200 }}
            placeholder="Search projects…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setCreating(true)}>
          <Plus size={13} />
          New project
        </button>
      </header>

      <div className="page-body">
        {paged.loading && paged.items.length === 0 ? (
          <div className="spinner" />
        ) : paged.items.length === 0 ? (
          <EmptyState
            icon={Layers}
            title={search ? 'No projects match your search' : 'No projects yet'}
            hint={search ? 'Try a different search term.' : 'Create the first project for this team.'}
          />
        ) : (
          <div className="rows">
            {paged.items.map((project) => (
              <div
                key={project.id}
                className="row"
                onClick={() => navigate(project.id)}
                onContextMenu={(e) => {
                  setMenuTarget(project)
                  openMenu(e)
                }}
              >
                <Layers size={14} color="var(--text-muted)" />
                <span className="row-title">{project.title}</span>
                {project.description && <span className="row-sub">{project.description}</span>}
                <span className="row-spacer" />
                <span className="row-sub">{relativeTime(project.created_at)}</span>
              </div>
            ))}
          </div>
        )}
        <InfiniteLoader paged={paged} noun="projects" />
      </div>

      <ContextMenu state={menuState} onClose={closeMenu} label={menuTarget?.title}>
        {(close) => (
          <>
            <button className="menu-item" onClick={() => { close(); navigate(menuTarget.id) }}>
              <ArrowRight size={14} />
              Open project
            </button>
            <button className="menu-item" onClick={() => { close(); copyLink(menuTarget) }}>
              <Link2 size={14} />
              Copy link
            </button>
            <div className="menu-sep" />
            <button className="menu-item danger" onClick={() => { close(); setDeleting(menuTarget) }}>
              <Trash2 size={14} />
              Delete project
            </button>
          </>
        )}
      </ContextMenu>

      {deleting && (
        <ConfirmDialog
          title="Delete project"
          message={`Delete "${deleting.title}"? All of its tasks and comments will be removed. This cannot be undone.`}
          confirmLabel="Delete"
          onConfirm={deleteProject}
          onClose={() => setDeleting(null)}
          busy={busy}
        />
      )}

      {creating && (
        <CreateProjectModal
          teamId={teamId}
          onClose={() => setCreating(false)}
          onCreated={(project) => {
            setCreating(false)
            navigate(project.id)
          }}
        />
      )}
    </>
  )
}

function CreateProjectModal({ teamId, onClose, onCreated }) {
  const toast = useToast()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    try {
      const project = await Projects.create(teamId, {
        title: title.trim(),
        description: description.trim() || null,
      })
      toast.success(`Project "${project.title}" created`)
      onCreated(project)
    } catch (err) {
      toast.error(err)
      setBusy(false)
    }
  }

  return (
    <Modal title="New project" onClose={onClose}>
      <form onSubmit={submit}>
        <div className="field">
          <label htmlFor="project-title">Title</label>
          <input id="project-title" className="input" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus required />
        </div>
        <div className="field">
          <label htmlFor="project-desc">Description</label>
          <textarea id="project-desc" className="textarea" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional" />
        </div>
        <div className="modal-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={busy || !title.trim()}>
            Create project
          </button>
        </div>
      </form>
    </Modal>
  )
}
