import { Check, ChevronDown, LogOut, UserMinus, Users } from 'lucide-react'
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { Members } from '../api/endpoints'
import { useAuth } from '../auth/AuthContext'
import { useTeams } from '../components/AppShell'
import { Avatar } from '../components/Avatar'
import { ContextMenu, useContextMenu } from '../components/ContextMenu'
import { Dropdown } from '../components/Dropdown'
import { EmptyState } from '../components/EmptyState'
import { InfiniteLoader } from '../components/InfiniteLoader'
import { ConfirmDialog } from '../components/Modal'
import { useToast } from '../components/ToastProvider'
import { usePaged } from '../hooks/usePaged'
import { ROLES } from '../lib/roles'

export function MembersPage() {
  const { teamId } = useParams()
  const { teams, reload: reloadTeams } = useTeams()
  const { user } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const team = teams.find((t) => t.id === teamId)

  const paged = usePaged((page) => Members.list(teamId, { page }), [teamId])
  const [removing, setRemoving] = useState(null) // membership being removed
  const [busy, setBusy] = useState(false)
  const { menuState, openMenu, closeMenu } = useContextMenu()
  const [menuTarget, setMenuTarget] = useState(null)

  const changeRole = async (membership, role) => {
    try {
      await Members.setRole(teamId, membership.id, role)
      toast.success(`${membership.user.username} is now ${role}`)
      paged.reload()
    } catch (err) {
      toast.error(err)
    }
  }

  const removeMember = async () => {
    const isSelf = removing.user.id === user.id
    setBusy(true)
    try {
      await Members.remove(teamId, removing.id)
      if (isSelf) {
        toast.success(`You left ${team?.name ?? 'the team'}`)
        await reloadTeams()
        navigate('/')
      } else {
        toast.success(`${removing.user.username} removed from the team`)
        paged.reload()
      }
    } catch (err) {
      toast.error(err)
    } finally {
      setBusy(false)
      setRemoving(null)
    }
  }

  return (
    <>
      <header className="page-header">
        <span className="page-title">{team ? `${team.name} · Members` : 'Members'}</span>
        <span className="spacer" />
        <span className="row-sub">{paged.count} member{paged.count === 1 ? '' : 's'}</span>
      </header>

      <div className="page-body">
        {paged.loading && paged.items.length === 0 ? (
          <div className="spinner" />
        ) : paged.items.length === 0 ? (
          <EmptyState icon={Users} title="No members" />
        ) : (
          <div className="rows">
            {paged.items.map((membership) => {
              const isSelf = membership.user.id === user.id
              return (
                <div
                  key={membership.id}
                  className="row static"
                  onContextMenu={(e) => {
                    setMenuTarget(membership)
                    openMenu(e)
                  }}
                >
                  <Avatar user={membership.user} size={26} />
                  <div style={{ minWidth: 0 }}>
                    <div className="row-title">
                      {membership.user.username}
                      {isSelf && <span style={{ color: 'var(--text-faint)', fontWeight: 400 }}> (you)</span>}
                    </div>
                    <div className="row-sub">{membership.user.email}</div>
                  </div>
                  <span className="row-spacer" />
                  <Dropdown
                    align="right"
                    trigger={
                      <button className="btn btn-secondary btn-sm">
                        <span className="badge role">{membership.role}</span>
                        <ChevronDown size={13} />
                      </button>
                    }
                  >
                    {(close) => (
                      <>
                        <div className="menu-label">Change role</div>
                        {ROLES.map((r) => (
                          <button
                            key={r.value}
                            className="menu-item"
                            onClick={() => {
                              close()
                              if (r.value !== membership.role) changeRole(membership, r.value)
                            }}
                          >
                            {r.label}
                            {r.value === membership.role && <Check size={13} style={{ marginLeft: 'auto' }} />}
                          </button>
                        ))}
                      </>
                    )}
                  </Dropdown>
                  <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }} onClick={() => setRemoving(membership)}>
                    {isSelf ? 'Leave' : 'Remove'}
                  </button>
                </div>
              )
            })}
          </div>
        )}
        <InfiniteLoader paged={paged} noun="members" />
      </div>

      <ContextMenu state={menuState} onClose={closeMenu} label={menuTarget?.user.username}>
        {(close) => (
          <>
            <div className="menu-label">Change role</div>
            {ROLES.map((r) => (
              <button
                key={r.value}
                className="menu-item"
                onClick={() => {
                  close()
                  if (r.value !== menuTarget.role) changeRole(menuTarget, r.value)
                }}
              >
                {r.label}
                {r.value === menuTarget?.role && <Check size={13} style={{ marginLeft: 'auto' }} />}
              </button>
            ))}
            <div className="menu-sep" />
            <button className="menu-item danger" onClick={() => { close(); setRemoving(menuTarget) }}>
              {menuTarget?.user.id === user.id ? <LogOut size={14} /> : <UserMinus size={14} />}
              {menuTarget?.user.id === user.id ? 'Leave team' : 'Remove member'}
            </button>
          </>
        )}
      </ContextMenu>

      {removing && (
        <ConfirmDialog
          title={removing.user.id === user.id ? 'Leave team' : 'Remove member'}
          message={
            removing.user.id === user.id
              ? `Leave ${team?.name ?? 'this team'}? You will lose access to its projects.`
              : `Remove ${removing.user.username} from ${team?.name ?? 'this team'}?`
          }
          confirmLabel={removing.user.id === user.id ? 'Leave' : 'Remove'}
          onConfirm={removeMember}
          onClose={() => setRemoving(null)}
          busy={busy}
        />
      )}
    </>
  )
}
