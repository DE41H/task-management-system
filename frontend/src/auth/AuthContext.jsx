import { createContext, useContext, useEffect, useState } from 'react'

import { clearTokens, getRefresh } from '../api/client'
import { Auth } from '../api/endpoints'

const AuthContext = createContext(null)

export function useAuth() {
  return useContext(AuthContext)
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!getRefresh()) {
      setLoading(false)
      return
    }
    Auth.me()
      .then(setUser)
      .catch(() => clearTokens())
      .finally(() => setLoading(false))
  }, [])

  // Fired by the API client when a token refresh fails mid-session.
  useEffect(() => {
    const onForcedLogout = () => setUser(null)
    window.addEventListener('auth:logout', onForcedLogout)
    return () => window.removeEventListener('auth:logout', onForcedLogout)
  }, [])

  const login = async (username, password) => {
    await Auth.login(username, password)
    const me = await Auth.me()
    setUser(me)
    return me
  }

  const register = async ({ email, username, password }) => {
    await Auth.register({ email, username, password })
    return login(username, password) // register returns no tokens
  }

  const logout = async () => {
    await Auth.logout()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, setUser, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}
