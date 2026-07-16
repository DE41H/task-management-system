import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { Teams } from '../api/endpoints'
import { useTeams } from '../components/AppShell'
import { ConfirmDialog } from '../components/Modal'
import { useToast } from '../components/ToastProvider'
import { formatDateTime } from '../lib/format'

export function TeamSettingsPage() {
  const { teamId } = useParams()
  const { reload: reloadTeams } = useTeams()
  const toast = useToast()
  const navigate = useNavigate()

  const [team, setTeam] = useState(null)
  const [name, setName] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    Teams.get(teamId)
      .then((t) => {
        setTeam(t)
        setName(t.name)
      })
      .catch((err) => toast.error(err))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamId])

  const rename = async (e) => {
    e.preventDefault()
    setBusy(true)
    try {
      const updated = await Teams.update(teamId, { name: name.trim() })
      setTeam(updated)
      setName(updated.name)
      await reloadTeams()
      toast.success('Team renamed')
    } catch (err) {
      toast.error(err)
    } finally {
      setBusy(false)
    }
  }

  const deleteTeam = async () => {
    setBusy(true)
    try {
      await Teams.remove(teamId)
      toast.success('Team deleted')
      await reloadTeams()
      navigate('/')
    } catch (err) {
      toast.error(err)
      setBusy(false)
      setDeleting(false)
    }
  }

  if (!team) return <div className="spinner" />

  return (
    <>
      <header className="page-header">
        <span className="page-title">{team.name} · Settings</span>
      </header>

      <div className="page-body narrow">
        <div className="section-card">
          <h3>Team name</h3>
          <p className="hint">Created {formatDateTime(team.created_at)}</p>
          <form onSubmit={rename} style={{ display: 'flex', gap: 8 }}>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
            <button className="btn btn-primary" disabled={busy || !name.trim() || name.trim() === team.name}>
              Save
            </button>
          </form>
        </div>

        <div className="section-card danger-zone">
          <h3>Danger zone</h3>
          <p className="hint">Deleting a team permanently removes its projects, tasks, and activity.</p>
          <button className="btn btn-danger" onClick={() => setDeleting(true)}>
            Delete team
          </button>
        </div>
      </div>

      {deleting && (
        <ConfirmDialog
          title="Delete team"
          message={`Delete "${team.name}" and everything in it? This cannot be undone.`}
          onConfirm={deleteTeam}
          onClose={() => setDeleting(false)}
          busy={busy}
        />
      )}
    </>
  )
}
