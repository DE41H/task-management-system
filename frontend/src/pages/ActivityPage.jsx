import { Activity } from 'lucide-react'
import { useParams } from 'react-router-dom'

import { Logs } from '../api/endpoints'
import { useTeams } from '../components/AppShell'
import { Avatar } from '../components/Avatar'
import { EmptyState } from '../components/EmptyState'
import { InfiniteLoader } from '../components/InfiniteLoader'
import { usePaged } from '../hooks/usePaged'
import { formatDateTime, relativeTime } from '../lib/format'

export function ActivityPage() {
  const { teamId } = useParams()
  const { teams } = useTeams()
  const team = teams.find((t) => t.id === teamId)

  const paged = usePaged((page) => Logs.list(teamId, { page }), [teamId])

  return (
    <>
      <header className="page-header">
        <span className="page-title">{team ? `${team.name} · Activity` : 'Activity'}</span>
        <span className="spacer" />
        <span className="row-sub">{paged.count} entries</span>
      </header>

      <div className="page-body">
        {paged.loading && paged.items.length === 0 ? (
          <div className="spinner" />
        ) : paged.items.length === 0 ? (
          <EmptyState icon={Activity} title="No activity yet" hint="Team actions (projects, tasks, members…) are recorded here." />
        ) : (
          <div>
            {paged.items.map((log) => (
              <div key={log.id} className="feed-item">
                <Avatar user={log.user ?? { username: '?' }} size={24} />
                <span className="feed-text">
                  <b>{log.user?.username ?? 'Former member'}</b> {log.content}
                </span>
                <span className="feed-time" title={formatDateTime(log.created_at)}>
                  {relativeTime(log.created_at)}
                </span>
              </div>
            ))}
          </div>
        )}
        <InfiniteLoader paged={paged} noun="entries" />
      </div>
    </>
  )
}
