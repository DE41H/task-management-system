import { LogOut } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { clearTokens } from '../api/client'
import { Auth } from '../api/endpoints'
import { useAuth } from '../auth/AuthContext'
import { Avatar } from '../components/Avatar'
import { useToast } from '../components/ToastProvider'
import { formatDateTime } from '../lib/format'

export function ProfilePage() {
  const { user, setUser, logout } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()

  const [form, setForm] = useState({ username: user.username, email: user.email })
  const [passwords, setPasswords] = useState({ old_password: '', new_password: '' })
  const [busy, setBusy] = useState(false)

  const saveProfile = async (e) => {
    e.preventDefault()
    setBusy(true)
    try {
      const updated = await Auth.updateMe(form)
      setUser(updated)
      setForm({ username: updated.username, email: updated.email })
      toast.success('Profile updated')
    } catch (err) {
      toast.error(err)
    } finally {
      setBusy(false)
    }
  }

  const changePassword = async (e) => {
    e.preventDefault()
    setBusy(true)
    try {
      await Auth.changePassword(passwords)
      // The backend blacklists every outstanding token — a fresh login is required.
      clearTokens()
      setUser(null)
      navigate('/login', { replace: true })
    } catch (err) {
      toast.error(err)
      setBusy(false)
    }
  }

  const doLogout = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <>
      <header className="page-header">
        <span className="page-title">Profile</span>
        <span className="spacer" />
        <button className="btn btn-secondary btn-sm" onClick={doLogout}>
          <LogOut size={13} />
          Log out
        </button>
      </header>

      <div className="page-body narrow">
        <div className="section-card" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <Avatar user={user} size={44} />
          <div>
            <h3 style={{ marginBottom: 0 }}>{user.username}</h3>
            <p className="hint" style={{ marginBottom: 0 }}>
              Joined {formatDateTime(user.created_at)}
            </p>
          </div>
        </div>

        <div className="section-card">
          <h3>Account</h3>
          <p className="hint">Update your username or email.</p>
          <form onSubmit={saveProfile}>
            <div className="field">
              <label htmlFor="me-username">Username</label>
              <input
                id="me-username"
                className="input"
                value={form.username}
                onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="me-email">Email</label>
              <input
                id="me-email"
                type="email"
                className="input"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                required
              />
            </div>
            <button className="btn btn-primary" disabled={busy}>
              Save changes
            </button>
          </form>
        </div>

        <div className="section-card">
          <h3>Change password</h3>
          <p className="hint">Changing your password signs you out everywhere.</p>
          <form onSubmit={changePassword}>
            <div className="field">
              <label htmlFor="old-password">Current password</label>
              <input
                id="old-password"
                type="password"
                className="input"
                value={passwords.old_password}
                onChange={(e) => setPasswords((p) => ({ ...p, old_password: e.target.value }))}
                autoComplete="current-password"
                minLength={8}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="new-password">New password</label>
              <input
                id="new-password"
                type="password"
                className="input"
                value={passwords.new_password}
                onChange={(e) => setPasswords((p) => ({ ...p, new_password: e.target.value }))}
                autoComplete="new-password"
                minLength={8}
                required
              />
            </div>
            <button className="btn btn-primary" disabled={busy}>
              Change password
            </button>
          </form>
        </div>
      </div>
    </>
  )
}
