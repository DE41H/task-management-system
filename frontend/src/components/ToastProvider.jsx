import { AlertCircle, CheckCircle2 } from 'lucide-react'
import { createContext, useCallback, useContext, useRef, useState } from 'react'

import { formatApiError } from '../lib/format'

const ToastContext = createContext(null)

export function useToast() {
  return useContext(ToastContext)
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const nextId = useRef(0)

  const push = useCallback((type, message) => {
    const id = ++nextId.current
    setToasts((list) => [...list, { id, type, message }])
    setTimeout(() => setToasts((list) => list.filter((t) => t.id !== id)), 4500)
  }, [])

  const value = useRef({
    success: (message) => push('success', message),
    error: (errOrMessage) =>
      push('error', typeof errOrMessage === 'string' ? errOrMessage : formatApiError(errOrMessage)),
  })

  return (
    <ToastContext.Provider value={value.current}>
      {children}
      <div className="toasts">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.type}`}>
            {t.type === 'success' ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
