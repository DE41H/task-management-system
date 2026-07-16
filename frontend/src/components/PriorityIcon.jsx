export const TASK_PRIORITIES = [
  { value: 'urgent', label: 'Urgent' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
]

export const priorityLabel = (value) =>
  TASK_PRIORITIES.find((p) => p.value === value)?.label ?? value

const LEVELS = { low: 1, medium: 2, high: 3 }

// Linear-style signal bars; urgent gets the filled alert square.
export function PriorityIcon({ priority, size = 14 }) {
  const common = { width: size, height: size, viewBox: '0 0 14 14', style: { flexShrink: 0 } }

  if (priority === 'urgent') {
    return (
      <svg {...common} aria-label="Urgent">
        <rect x="1" y="1" width="12" height="12" rx="3" fill="var(--priority-urgent)" />
        <path d="M7 3.8v3.6" stroke="#0f1011" strokeWidth="1.7" strokeLinecap="round" />
        <circle cx="7" cy="10.1" r="1" fill="#0f1011" />
      </svg>
    )
  }

  const level = LEVELS[priority] ?? 1
  const color = `var(--priority-${priority}, var(--text-muted))`
  const bars = [
    { x: 1.5, y: 8, h: 4 },
    { x: 5.75, y: 5.5, h: 6.5 },
    { x: 10, y: 3, h: 9 },
  ]
  return (
    <svg {...common} aria-label={priority}>
      {bars.map((b, i) => (
        <rect
          key={i}
          x={b.x}
          y={b.y}
          width="2.5"
          height={b.h}
          rx="1"
          fill={i < level ? color : 'var(--border-strong)'}
        />
      ))}
    </svg>
  )
}
