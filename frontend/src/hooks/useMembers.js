import { useEffect, useState } from 'react'

import { Members } from '../api/endpoints'

// Team members for pickers/avatar lookups. First page (20) only — fine for a test UI.
export function useMembers(teamId) {
  const [members, setMembers] = useState([])

  useEffect(() => {
    let alive = true
    Members.list(teamId)
      .then((data) => alive && setMembers(data.results))
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [teamId])

  const userById = {}
  for (const m of members) userById[m.user.id] = m.user

  return { members, userById }
}
