import { ApiError } from '../api/client'

export function formatApiError(err) {
  if (!(err instanceof ApiError)) return err?.message || 'Something went wrong'
  const data = err.data
  if (!data) return `Request failed (HTTP ${err.status})`
  if (typeof data === 'string') return data
  const prefix = err.status === 403 ? 'Permission denied — ' : ''
  if (data.detail) return prefix + data.detail
  const lines = []
  for (const [field, value] of Object.entries(data)) {
    const msg = Array.isArray(value) ? value.join(' ') : String(value)
    lines.push(field === 'non_field_errors' ? msg : `${field}: ${msg}`)
  }
  return prefix + (lines.join('\n') || `Request failed (HTTP ${err.status})`)
}

export function relativeTime(iso) {
  if (!iso) return ''
  const seconds = Math.round((Date.now() - new Date(iso).getTime()) / 1000)
  const abs = Math.abs(seconds)
  const units = [
    [60, 's'],
    [3600, 'm'],
    [86400, 'h'],
    [604800, 'd'],
    [2629800, 'w'],
    [31557600, 'mo'],
  ]
  if (abs < 45) return seconds >= 0 ? 'just now' : 'soon'
  for (let i = 0; i < units.length; i++) {
    if (abs < units[i][0]) {
      const div = i === 0 ? 1 : units[i - 1][0]
      const n = Math.round(abs / div)
      return seconds >= 0 ? `${n}${units[i][1]} ago` : `in ${n}${units[i][1]}`
    }
  }
  return `${Math.round(abs / 31557600)}y ${seconds >= 0 ? 'ago' : 'from now'}`
}

export function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

export function formatDateTime(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

const pad = (n) => String(n).padStart(2, '0')

export function isoToLocalInput(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function localInputToIso(value) {
  return value ? new Date(value).toISOString() : null
}
