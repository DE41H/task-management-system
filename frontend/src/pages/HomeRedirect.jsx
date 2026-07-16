import { Plus, Users } from 'lucide-react'
import { Navigate } from 'react-router-dom'

import { useTeams } from '../components/AppShell'
import { EmptyState } from '../components/EmptyState'

export function HomeRedirect() {
  const { teams, loading, openCreateTeam } = useTeams()

  if (loading) return <div className="spinner" />
  if (teams.length > 0) return <Navigate to={`/teams/${teams[0].id}/projects`} replace />

  return (
    <div className="page-body">
      <EmptyState
        icon={Users}
        title="No teams yet"
        hint="Create a team to start organizing projects and tasks, or accept an invite from your inbox."
      >
        <button className="btn btn-primary" onClick={openCreateTeam}>
          <Plus size={14} />
          Create team
        </button>
      </EmptyState>
    </div>
  )
}
