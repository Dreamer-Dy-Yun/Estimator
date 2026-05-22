import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { ToastContext, type ToastOptions, type ToastVariant } from './AppToastContext'
import styles from './AppToast.module.css'

type ToastState = {
  message: string
  variant: ToastVariant
}

const DEFAULT_TOAST_DURATION_MS = 2800

function AppToastBanner({ toast }: { toast: ToastState | null }) {
  if (!toast) return null
  const role = toast.variant === 'error' ? 'alert' : 'status'
  const ariaLive = toast.variant === 'error' ? 'assertive' : 'polite'
  return (
    <div className={`${styles.root} ${styles[toast.variant]}`} role={role} aria-live={ariaLive}>
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
