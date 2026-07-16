import { Navigate, Outlet, useLocation } from 'react-router-dom'

import { useAuth } from './AuthContext'

export function RequireAuth() {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) return <div className="spinner" />
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />
  return <Outlet />
}
