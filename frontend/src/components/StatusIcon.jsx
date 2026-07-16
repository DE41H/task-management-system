export const TASK_STATUSES = [
  { value: 'active', label: 'Active' },
  { value: 'on_hold', label: 'On hold' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
]

export const statusLabel = (value) =>
  TASK_STATUSES.find((s) => s.value === value)?.label ?? value

// Linear-style status discs, drawn by hand so each state reads at a glance.
export function StatusIcon({ status, size = 14 }) {
  const color = `var(--status-${status}, var(--text-muted))`
  const common = { width: size, height: size, viewBox: '0 0 14 14', style: { flexShrink: 0 } }

  switch (status) {
    case 'completed':
      return (
        <svg {...common} aria-label="Completed">
          <circle cx="7" cy="7" r="6" fill={color} />
          <path d="M4.4 7.2 6.2 9l3.4-3.6" stroke="#0f1011" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )
    case 'cancelled':
      return (
        <svg {...common} aria-label="Cancelled">
          <circle cx="7" cy="7" r="6" fill={color} />
          <path d="M4.8 4.8 9.2 9.2M9.2 4.8 4.8 9.2" stroke="#0f1011" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      )
    case 'on_hold':
      return (
        <svg {...common} aria-label="On hold">
          <circle cx="7" cy="7" r="5.4" fill="none" stroke={color} strokeWidth="1.6" />
          <path d="M5.6 4.9v4.2M8.4 4.9v4.2" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      )
    default: // active
      return (
        <svg {...common} aria-label="Active">
          <circle cx="7" cy="7" r="5.4" fill="none" stroke={color} strokeWidth="1.6" />
          <circle cx="7" cy="7" r="2.4" fill={color} />
        </svg>
      )
  }
}
