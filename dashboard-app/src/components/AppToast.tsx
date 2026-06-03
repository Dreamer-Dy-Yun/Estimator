import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { ToastContext, type ToastOptions, type ToastVariant } from './AppToastContext'
import styles from './AppToast.module.css'

export type ToastState = {
  message: string
  variant: ToastVariant
}

const DEFAULT_TOAST_DURATION_MS = 2800 as const

function AppToastBanner({ toast }: { toast: ToastState | null }) : React.JSX.Element | null {
  if (!toast) return null
  const needsImmediateAttention: boolean = toast.variant === 'error'
  const role: 'alert' | 'status' = needsImmediateAttention ? 'alert' : 'status'
  const ariaLive: 'assertive' | 'polite' = needsImmediateAttention ? 'assertive' : 'polite'
  return (
    <div className={`${styles.root} ${styles[toast.variant]}`} role={role} aria-live={ariaLive} aria-atomic="true">
      {toast.message}
    </div>
  )
}

export function AppToastProvider({ children }: { children: React.ReactNode }) : React.JSX.Element {
  const [toast, setToast]: [ToastState | null, React.Dispatch<React.SetStateAction<ToastState | null>>] = useState<ToastState | null>(null)
  const timerRef: React.RefObject<ReturnType<typeof setTimeout> | null> = useRef<ReturnType<typeof window.setTimeout> | null>(null)

  useEffect(() : () => void => () : void => {
    if (timerRef.current != null) {
      window.clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const showToast: (message: string, options?: ToastOptions) => void = useCallback((message: string, options?: ToastOptions) : void => {
    if (timerRef.current != null) {
      window.clearTimeout(timerRef.current)
      timerRef.current = null
    }
    setToast({
      message,
      variant: options?.variant ?? 'success',
    })
    timerRef.current = window.setTimeout(() : void => {
      setToast(null)
      timerRef.current = null
    }, options?.durationMs ?? DEFAULT_TOAST_DURATION_MS)
  }, [])

  const value: { showToast: (message: string, options?: ToastOptions) => void; } = useMemo(() : { showToast: (message: string, options?: ToastOptions) => void; } => ({ showToast }), [showToast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <AppToastBanner toast={toast} />
    </ToastContext.Provider>
  )
}
