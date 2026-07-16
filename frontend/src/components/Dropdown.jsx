import { cloneElement, useEffect, useRef, useState } from 'react'

// Generic click-to-open menu. `trigger` is an element; it gets an onClick.
// `children(close)` renders the menu contents.
export function Dropdown({ trigger, children, align = 'left' }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const close = () => setOpen(false)

  return (
    <div className="dropdown" ref={ref}>
      {cloneElement(trigger, {
        onClick: (e) => {
          e.stopPropagation()
          trigger.props.onClick?.(e)
          setOpen((o) => !o)
        },
      })}
      {open && (
        <div className={`menu ${align}`} onClick={(e) => e.stopPropagation()}>
          {typeof children === 'function' ? children(close) : children}
        </div>
      )}
    </div>
  )
}
