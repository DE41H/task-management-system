import { Copy, Mail, Plus, XCircle } from 'lucide-react'
import { useState } from 'react'
import { useParams } from 'react-router-dom'

import { Invites } from '../api/endpoints'
import { useTeams } from '../components/AppShell'
import { ContextMenu, useContextMenu } from '../components/ContextMenu'
import { EmptyState } from '../components/EmptyState'
import { InfiniteLoader } from '../components/InfiniteLoader'
import { Modal } from '../components/Modal'
import { useToast } from '../components/ToastProvider'
import { usePaged } from '../hooks/usePaged'
import { formatDateTime, relativeTime } from '../lib/format'
import { ROLES } from '../lib/roles'

export function TeamInvitesPage() {
  const { teamId } = useParams()
  const { teams } = useTeams()
  const toast = useToast()
  const team = teams.find((t) => t.id === teamId)

  const paged = usePaged((page) => Invites.list(teamId, { page }), [teamId])
  const [sending, setSending] = useState(false)
  const { menuState, openMenu, closeMenu } = useContextMenu()
  const [menuTarget, setMenuTarget] = useState(null)

  const copyEmail = (invite) => {
    navigator.clipboard?.writeText(invite.receiver)
    toast.success('Email copied')
  }

  const cancel = async (invite) => {
    try {
      await Invites.setStatus(teamId, invite.id, 'cancelled')
      toast.success(`Invite to ${invite.receiver} cancelled`)
      paged.reload()
    } catch (err) {
      toast.error(err)
    }
  }

  return (
    <>
      <header className="page-header">
        <span className="page-title">{team ? `${team.name} · Invites` : 'Invites'}</span>
        <span className="spacer" />
        <button className="btn btn-primary btn-sm" onClick={() => setSending(true)}>
          <Plus size={13} />
          Invite member
        </button>
      </header>

      <div className="page-body">
        {paged.loading && paged.items.length === 0 ? (
          <div className="spinner" />
        ) : paged.items.length === 0 ? (
          <EmptyState icon={Mail} title="No invites sent" hint="Invite people to this team by their account email." />
        ) : (
          <div className="rows">
            {paged.items.map((invite) => (
              <div
                key={invite.id}
                className="row static"
                onContextMenu={(e) => {
                  setMenuTarget(invite)
                  openMenu(e)
                }}
              >
                <Mail size={14} color="var(--text-muted)" />
                <div style={{ minWidth: 0 }}>
                  <div className="row-title">{invite.receiver}</div>
                  <div className="row-sub">
                    Invited as {invite.role} · {relativeTime(invite.created_at)} · expires {formatDateTime(invite.expiry)}
                  </div>
                </div>
                <span className="row-spacer" />
                {invite.is_expired && invite.status === 'pending' ? (
                  <span className="badge expired">Expired</span>
                ) : (
                  <span className={`badge ${invite.status}`}>{invite.status}</span>
                )}
                {invite.status === 'pending' && !invite.is_expired && (
                  <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }} onClick={() => cancel(invite)}>
                    Cancel
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
        <InfiniteLoader paged={paged} noun="invites" />
      </div>

      <ContextMenu state={menuState} onClose={closeMenu} label={menuTarget?.receiver}>
        {(close) => (
          <>
            <button className="menu-item" onClick={() => { close(); copyEmail(menuTarget) }}>
              <Copy size={14} />
              Copy email
            </button>
            {menuTarget?.status === 'pending' && !menuTarget?.is_expired && (
              <>
                <div className="menu-sep" />
                <button className="menu-item danger" onClick={() => { close(); cancel(menuTarget) }}>
                  <XCircle size={14} />
                  Cancel invite
                </button>
              </>
            )}
          </>
        )}
      </ContextMenu>

      {sending && (
        <SendInviteModal
          teamId={teamId}
          onClose={() => setSending(false)}
          onSent={() => {
            setSending(false)
            paged.reload()
          }}
        />
      )}
    </>
  )
}

function SendInviteModal({ teamId, onClose, onSent }) {
  const toast = useToast()
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('member')
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    try {
      const invite = await Invites.create(teamId, { receiver: email.trim(), role })
      toast.success(`Invite sent to ${invite.receiver}`)
      onSent()
    } catch (err) {
      toast.error(err)
      setBusy(false)
    }
  }

  return (
    <Modal title="Invite member" onClose={onClose} width={420}>
      <form onSubmit={submit}>
        <div className="field">
          <label htmlFor="invite-email">Email</label>
          <input
            id="invite-email"
            type="email"
            className="input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Must belong to a registered user"
            autoFocus
            required
          />
        </div>
        <div className="field">
          <label htmlFor="invite-role">Role</label>
          <select id="invite-role" className="select" value={role} onChange={(e) => setRole(e.target.value)}>
            {ROLES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>
        <div className="modal-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={busy || !email.trim()}>
            Send invite
          </button>
        </div>
      </form>
    </Modal>
  )
}
