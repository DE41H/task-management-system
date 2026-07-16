function hueFrom(str) {
  let h = 0
  for (let i = 0; i < String(str).length; i++) h = (h * 31 + String(str).charCodeAt(i)) % 360
  return h
}

export function Avatar({ user, size = 22, title }) {
  const name = user?.username || '?'
  const hue = hueFrom(user?.id || name)
  return (
    <span
      className="avatar"
      title={title ?? name}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.42,
        background: `hsl(${hue}, 42%, 44%)`,
      }}
    >
      {name.slice(0, 2).toUpperCase()}
    </span>
  )
}

export function AvatarStack({ users, size = 20, max = 4 }) {
  if (!users?.length) return null
  const shown = users.slice(0, max)
  const extra = users.length - shown.length
  return (
    <span className="avatar-stack" title={users.map((u) => u?.username ?? 'unknown').join(', ')}>
      {extra > 0 && (
        <span className="avatar" style={{ width: size, height: size, fontSize: size * 0.42, background: 'var(--bg-raised)', color: 'var(--text-muted)' }}>
          +{extra}
        </span>
      )}
      {shown.map((u, i) => (
        <Avatar key={u?.id ?? i} user={u} size={size} />
      ))}
    </span>
  )
}
