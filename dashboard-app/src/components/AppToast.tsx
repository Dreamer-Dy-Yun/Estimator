import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import styles from './AppToast.module.css'

type ToastVariant = 'success' | 'info' | 'error'

type ToastState = {
  message: string
  variant: ToastVariant
}

type ToastOptions = {
  variant?: ToastVariant
  durationMs?: number
}

type ToastContextValue = {
  showToast: (message: string, options?: ToastOptions) => void
}

const DEFAULT_TOAST_DURATION_MS = 2800
const ToastContext = createContext<ToastContextValue | null>(null)

function AppToastBanner({ toast }: { toast: ToastState | null }) {
  if (!toast) return null
  return (
    <div className={`${styles.root} ${styles[toast.variant]}`} role="status" aria-live="polite">
      {toast.message}
    </div>
  )
}

export function AppToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null)
  const timerRef = useRef<ReturnType<typeof window.setTimeout> | null>(null)

  useEffect(() => () => {
    if (timerRef.current != null) {
      window.clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const showToast = useCallback((message: string, options?: ToastOptions) => {
    if (timerRef.current != null) {
      window.clearTimeout(timerRef.current)
      timerRef.current = null
    }
    setToast({
      message,
      variant: options?.variant ?? 'success',
    })
    timerRef.current = window.setTimeout(() => {
      setToast(null)
      timerRef.current = null
    }, options?.durationMs ?? DEFAULT_TOAST_DURATION_MS)
  }, [])

  const value = useMemo(() => ({ showToast }), [showToast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <AppToastBanner toast={toast} />
    </ToastContext.Provider>
  )
}

export function useAppToast() {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useAppToast must be used within AppToastProvider')
  return context
}
