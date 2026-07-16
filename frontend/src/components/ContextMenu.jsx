import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

// Shared right-click menu. Pair with `useContextMenu()` which tracks the cursor
// position; the menu portals to <body>, clamps itself inside the viewport, and
// closes on outside-click, Escape, scroll, or resize.
export function useContextMenu() {
  const [menuState, setMenuState] = useState(null) // { x, y } | null

  const openMenu = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    setMenuState({ x: e.clientX, y: e.clientY })
  }, [])

  const closeMenu = useCallback(() => setMenuState(null), [])

  return { menuState, openMenu, closeMenu }
}

export function ContextMenu({ state, onClose, label, children }) {
  const ref = useRef(null)
  const [pos, setPos] = useState({ x: 0, y: 0, ready: false })

  // Measure after mount, then nudge back inside the viewport.
  useLayoutEffect(() => {
    if (!state) return
    const el = ref.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const pad = 8
    let x = state.x
    let y = state.y
    if (x + rect.width > window.innerWidth - pad) x = window.innerWidth - rect.width - pad
    if (y + rect.height > window.innerHeight - pad) y = window.innerHeight - rect.height - pad
    setPos({ x: Math.max(pad, x), y: Math.max(pad, y), ready: true })
  }, [state])

  useEffect(() => {
    if (!state) return
    const onDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose()
    }
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    window.addEventListener('resize', onClose)
    window.addEventListener('scroll', onClose, true)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('resize', onClose)
      window.removeEventListener('scroll', onClose, true)
    }
  }, [state, onClose])

  if (!state) return null

  return createPortal(
    <div
      ref={ref}
      className="context-menu"
      style={{ left: pos.x, top: pos.y, visibility: pos.ready ? 'visible' : 'hidden' }}
      onClick={(e) => e.stopPropagation()}
      onContextMenu={(e) => e.preventDefault()}
    >
      {label && <div className="menu-label">{label}</div>}
      {typeof children === 'function' ? children(onClose) : children}
    </div>,
    document.body,
  )
}
