import {
  Activity,
  ArrowRight,
  Check,
  ChevronDown,
  Copy,
  Inbox,
  Layers,
  Mail,
  Plus,
  Settings,
  Users,
} from 'lucide-react'
import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { NavLink, Outlet, useMatch, useNavigate } from 'react-router-dom'

import { Auth, Teams } from '../api/endpoints'
import { useAuth } from '../auth/AuthContext'
import { Avatar } from './Avatar'
import { ContextMenu, useContextMenu } from './ContextMenu'
import { Dropdown } from './Dropdown'
import { Modal } from './Modal'
import { useToast } from './ToastProvider'

const TeamsContext = createContext(null)

export function useTeams() {
  return useContext(TeamsContext)
}

export function AppShell() {
  const [teams, setTeams] = useState([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [inviteCount, setInviteCount] = useState(0)

  // First page (20 teams) is plenty for a test UI.
  const reload = useCallback(() => {
    return Teams.list()
      .then((data) => setTeams(data.results))
      .finally(() => setLoading(false))
  }, [])

  const reloadInviteCount = useCallback(() => {
    Auth.myInvites()
      .then((data) =>
        setInviteCount(data.results.filter((i) => i.status === 'pending' && !i.is_expired).length),
      )
      .catch(() => {})
  }, [])

  useEffect(() => {
    reload().catch(() => {})
    reloadInviteCount()
  }, [reload, reloadInviteCount])

  const ctx = {
    teams,
    loading,
    reload,
    inviteCount,
    reloadInviteCount,
    openCreateTeam: () => setCreating(true),
  }

  return (
    <TeamsContext.Provider value={ctx}>
      <div className="app-shell">
        <Sidebar />
        <main className="main">
          <Outlet />
        </main>
      </div>
      {creating && <CreateTeamModal onClose={() => setCreating(false)} />}
    </TeamsContext.Provider>
  )
}

function Sidebar() {
  const { user } = useAuth()
  const { inviteCount } = useTeams()
  const match = useMatch('/teams/:teamId/*')
  const teamId = match?.params.teamId

  const navClass = ({ isActive }) => `nav-item${isActive ? ' active' : ''}`

  return (
    <aside className="sidebar">
      <TeamSwitcher activeTeamId={teamId} />

      <div className="nav-section">
        <NavLink to="/inbox" className={navClass}>
          <Inbox size={15} />
          Inbox
          {inviteCount > 0 && <span className="nav-badge">{inviteCount}</span>}
        </NavLink>
        <NavLink to="/profile" className={navClass}>
          <Avatar user={user} size={16} />
          Profile
        </NavLink>
      </div>

      {teamId && (
        <div className="nav-section">
          <div className="nav-section-title">Team</div>
          <NavLink to={`/teams/${teamId}/projects`} className={navClass}>
            <Layers size={15} />
            Projects
          </NavLink>
          <NavLink to={`/teams/${teamId}/members`} className={navClass}>
            <Users size={15} />
            Members
          </NavLink>
          <NavLink to={`/teams/${teamId}/invites`} className={navClass}>
            <Mail size={15} />
            Invites
          </NavLink>
          <NavLink to={`/teams/${teamId}/activity`} className={navClass}>
            <Activity size={15} />
            Activity
          </NavLink>
          <NavLink to={`/teams/${teamId}/settings`} className={navClass}>
            <Settings size={15} />
            Settings
          </NavLink>
        </div>
      )}
    </aside>
  )
}

function TeamSwitcher({ activeTeamId }) {
  const { teams, openCreateTeam } = useTeams()
  const toast = useToast()
  const navigate = useNavigate()
  const active = teams.find((t) => t.id === activeTeamId)
  const { menuState, openMenu, closeMenu } = useContextMenu()
  const [menuTeam, setMenuTeam] = useState(null)

  const copyId = (team) => {
    navigator.clipboard?.writeText(team.id)
    toast.success('Team ID copied')
  }

  return (
    <>
    <Dropdown
      align="left"
      trigger={
        <button className="nav-item" style={{ width: '100%', border: 0, background: 'none', fontWeight: 600 }}>
          <span
            className="avatar"
            style={{ width: 18, height: 18, fontSize: 9, borderRadius: 5, background: 'var(--accent)' }}
          >
            {(active?.name || 'T').slice(0, 1).toUpperCase()}
          </span>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {active?.name || 'TMS'}
          </span>
          <ChevronDown size={14} style={{ marginLeft: 'auto' }} />
        </button>
      }
    >
      {(close) => (
        <>
          <div className="menu-label">Teams</div>
          {teams.length === 0 && (
            <div className="menu-item" style={{ color: 'var(--text-muted)', cursor: 'default' }}>
              No teams yet
            </div>
          )}
          {teams.map((team) => (
            <button
              key={team.id}
              className="menu-item"
              onClick={() => {
                close()
                navigate(`/teams/${team.id}/projects`)
              }}
              onContextMenu={(e) => {
                setMenuTeam(team)
                openMenu(e)
              }}
            >
              <span
                className="avatar"
                style={{ width: 16, height: 16, fontSize: 8, borderRadius: 4, background: 'var(--accent)' }}
              >
                {team.name.slice(0, 1).toUpperCase()}
              </span>
              {team.name}
              {team.id === activeTeamId && <Check size={14} style={{ marginLeft: 'auto' }} />}
            </button>
          ))}
          <div className="menu-sep" />
          <button
            className="menu-item"
            onClick={() => {
              close()
              openCreateTeam()
            }}
          >
            <Plus size={14} />
            Create team
          </button>
        </>
      )}
    </Dropdown>

    <ContextMenu state={menuState} onClose={closeMenu} label={menuTeam?.name}>
      {(closeCtx) => (
        <>
          <button className="menu-item" onClick={() => { closeCtx(); navigate(`/teams/${menuTeam.id}/projects`) }}>
            <ArrowRight size={14} />
            Open team
          </button>
          <button className="menu-item" onClick={() => { closeCtx(); navigate(`/teams/${menuTeam.id}/settings`) }}>
            <Settings size={14} />
            Team settings
          </button>
          <div className="menu-sep" />
          <button className="menu-item" onClick={() => { closeCtx(); copyId(menuTeam) }}>
            <Copy size={14} />
            Copy team ID
          </button>
        </>
      )}
    </ContextMenu>
    </>
  )
}

function CreateTeamModal({ onClose }) {
  const { reload } = useTeams()
  const toast = useToast()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    try {
      const team = await Teams.create({ name: name.trim() })
      await reload()
      toast.success(`Team "${team.name}" created`)
      onClose()
      navigate(`/teams/${team.id}/projects`)
    } catch (err) {
      toast.error(err)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal title="Create team" onClose={onClose} width={400}>
      <form onSubmit={submit}>
        <div className="field">
          <label htmlFor="team-name">Team name</label>
          <input
            id="team-name"
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Engineering"
            autoFocus
            required
          />
        </div>
        <div className="modal-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={busy || !name.trim()}>
            Create team
          </button>
        </div>
      </form>
    </Modal>
  )
}
