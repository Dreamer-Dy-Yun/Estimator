import { createContext, useContext } from 'react'

export type ToastVariant = 'success' | 'info' | 'error'

export type ToastOptions = {
  variant?: ToastVariant
  durationMs?: number
}

export type ToastContextValue = {
  showToast: (message: string, options?: ToastOptions) => void
}

export const ToastContext = createContext<ToastContextValue | null>(null)

export function useAppToast() {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useAppToast must be used within AppToastProvider')
  return context
}
