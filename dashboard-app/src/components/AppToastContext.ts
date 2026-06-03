import { createContext, useContext } from 'react'

export type ToastVariant = 'success' | 'info' | 'warning' | 'error'

export type ToastOptions = {
  variant?: ToastVariant
  durationMs?: number
}

export type ToastContextValue = {
  showToast: (message: string, options?: ToastOptions) => void
}

export const ToastContext: React.Context<ToastContextValue | null> = createContext<ToastContextValue | null>(null)

export function useAppToast() : ToastContextValue {
  const context: ToastContextValue | null = useContext(ToastContext)
  if (!context) throw new Error('useAppToast must be used within AppToastProvider')
  return context
}
