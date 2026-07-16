// Fetch wrapper for the TMS API: Bearer auth, automatic refresh on 401 with
// SimpleJWT rotating refresh tokens (ROTATE_REFRESH_TOKENS + blacklist), and
// DRF-shaped errors surfaced as ApiError.

const BASE = import.meta.env.VITE_API_URL || '/api/v1'

export class ApiError extends Error {
  constructor(status, data) {
    super((data && data.detail) || `HTTP ${status}`)
    this.status = status
    this.data = data // DRF body: {detail} | {field: [msgs]} | null
  }
}

// Tokens live in localStorage — acceptable for a test UI, not hardened against XSS.
const getAccess = () => localStorage.getItem('tms_access')
export const getRefresh = () => localStorage.getItem('tms_refresh')

export function setTokens({ access, refresh }) {
  if (access) localStorage.setItem('tms_access', access)
  // Rotation is on: the old refresh token is blacklisted the moment a new one
  // is issued, so persisting the new one here is mandatory.
  if (refresh) localStorage.setItem('tms_refresh', refresh)
}

export function clearTokens() {
  localStorage.removeItem('tms_access')
  localStorage.removeItem('tms_refresh')
}

async function parseBody(res) {
  return res.status === 204 ? null : await res.json().catch(() => null)
}

// Single-flight guard: concurrent 401s must share one refresh call, otherwise
// the second request would replay the just-blacklisted refresh token.
let refreshPromise = null

function refreshAccess() {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const res = await fetch(`${BASE}/auth/refresh/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh: getRefresh() }),
      })
      const data = await parseBody(res)
      if (!res.ok) throw new ApiError(res.status, data)
      setTokens(data)
      return data.access
    })().finally(() => {
      refreshPromise = null
    })
  }
  return refreshPromise
}

export async function api(path, { method = 'GET', body, params } = {}) {
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(params || {})) {
    if (value !== '' && value !== null && value !== undefined) query.set(key, value)
  }
  const url = BASE + path + (query.size ? `?${query}` : '')

  const doFetch = (token) =>
    fetch(url, {
      method,
      headers: {
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })

  let res = await doFetch(getAccess())

  if (res.status === 401 && getRefresh()) {
    let access
    try {
      access = await refreshAccess()
    } catch {
      clearTokens()
      window.dispatchEvent(new Event('auth:logout'))
      throw new ApiError(401, { detail: 'Session expired — please log in again.' })
    }
    res = await doFetch(access)
  }

  const data = await parseBody(res)
  if (!res.ok) throw new ApiError(res.status, data)
  return data
}
