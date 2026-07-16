export function EmptyState({ icon: Icon, title, hint, children }) {
  return (
    <div className="empty-state">
      {Icon && <Icon size={28} strokeWidth={1.5} />}
      <h3>{title}</h3>
      {hint && <p>{hint}</p>}
      {children}
    </div>
  )
}
