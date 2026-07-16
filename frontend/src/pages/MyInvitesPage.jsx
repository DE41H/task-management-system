import { Check, Inbox, X } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { Auth, Invites } from '../api/endpoints'
import { useTeams } from '../components/AppShell'
import { ContextMenu, useContextMenu } from '../components/ContextMenu'
import { EmptyState } from '../components/EmptyState'
import { InfiniteLoader } from '../components/InfiniteLoader'
import { useToast } from '../components/ToastProvider'
import { usePaged } from '../hooks/usePaged'
import { formatDateTime, relativeTime } from '../lib/format'

export function MyInvitesPage() {
  const { reload: reloadTeams, reloadInviteCount } = useTeams()
  const toast = useToast()
  const navigate = useNavigate()

  const paged = usePaged((page) => Auth.myInvites({ page }), [])
  const { menuState, openMenu, closeMenu } = useContextMenu()
  const [menuTarget, setMenuTarget] = useState(null)

  const respond = async (invite, status) => {
    try {
      await Invites.setStatus(invite.team, invite.id, status)
      paged.reload()
      reloadInviteCount()
      if (status === 'accepted') {
        toast.success('Invite accepted — welcome to the team!')
        await reloadTeams()
        navigate(`/teams/${invite.team}/projects`)
      } else {
        toast.success('Invite rejected')
      }
    } catch (err) {
      toast.error(err)
    }
  }

  return (
    <>
      <header className="page-header">
        <span className="page-title">Inbox</span>
        <span className="spacer" />
        <span className="row-sub">Invitations addressed to you</span>
      </header>

      <div className="page-body">
        {paged.loading && paged.items.length === 0 ? (
          <div className="spinner" />
        ) : paged.items.length === 0 ? (
          <EmptyState icon={Inbox} title="No invitations" hint="Team invites sent to your email will show up here." />
        ) : (
          <div className="rows">
            {paged.items.map((invite) => {
              const actionable = invite.status === 'pending' && !invite.is_expired
              return (
                <div
                  key={invite.id}
                  className="row static"
                  onContextMenu={(e) => {
                    setMenuTarget(invite)
                    openMenu(e)
                  }}
                >
                  <Inbox size={14} color="var(--text-muted)" />
                  <div style={{ minWidth: 0 }}>
                    <div className="row-title">
                      Join as <span className="badge role">{invite.role}</span>
                    </div>
                    <div className="row-sub">
                      Team {String(invite.team).slice(0, 8)}… · {relativeTime(invite.created_at)} · expires{' '}
                      {formatDateTime(invite.expiry)}
                    </div>
                  </div>
                  <span className="row-spacer" />
                  {actionable ? (
                    <>
                      <button className="btn btn-primary btn-sm" onClick={() => respond(invite, 'accepted')}>
                        Accept
                      </button>
                      <button className="btn btn-secondary btn-sm" onClick={() => respond(invite, 'rejected')}>
                        Reject
                      </button>
                    </>
                  ) : invite.is_expired && invite.status === 'pending' ? (
                    <span className="badge expired">Expired</span>
                  ) : (
                    <span className={`badge ${invite.status}`}>{invite.status}</span>
                  )}
                </div>
              )
            })}
          </div>
        )}
        <InfiniteLoader paged={paged} noun="invites" />
      </div>

      <ContextMenu state={menuState} onClose={closeMenu} label="Invitation">
        {(close) => {
          const actionable = menuTarget?.status === 'pending' && !menuTarget?.is_expired
          if (!actionable) {
            return (
              <div className="menu-item" style={{ color: 'var(--text-muted)', cursor: 'default' }}>
                No actions available
              </div>
            )
          }
          return (
            <>
              <button className="menu-item" onClick={() => { close(); respond(menuTarget, 'accepted') }}>
                <Check size={14} />
                Accept invite
              </button>
              <button className="menu-item danger" onClick={() => { close(); respond(menuTarget, 'rejected') }}>
                <X size={14} />
                Reject invite
              </button>
            </>
          )
        }}
      </ContextMenu>
    </>
  )
}
