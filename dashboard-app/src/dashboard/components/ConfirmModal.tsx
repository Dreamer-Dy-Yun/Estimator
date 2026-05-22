import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { LoadingSpinner } from '../../components/LoadingSpinner'
import { drawerKeepOpenDataProps } from '../drawer/drawerDom'
import styles from './ConfirmModal.module.css'

const focusableSelector = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

type ConfirmModalClassNames = {
  backdrop?: string
  panel?: string
  title?: string
  text?: string
  actions?: string
  button?: string
  cancelButton?: string
  confirmButton?: string
}

type ConfirmModalProps = {
  open: boolean
  busy?: boolean
  title: string
  message: ReactNode
  cancelText?: string
  confirmText?: string
  confirmingText?: string
  dialogTitleId: string
  classNames?: ConfirmModalClassNames
  onCancel: () => void
  onConfirm: () => void | Promise<void>
  keepOpenAttr?: boolean
}

const getAsyncErrorMessage = (error: unknown) => {
  if (error instanceof Error && error.message.trim()) return error.message
  return '요청 처리 중 오류가 발생했습니다.'
}

const getFocusableElements = (container: HTMLElement) => Array.from(
  container.querySelectorAll<HTMLElement>(focusableSelector),
).filter((element) => !element.hasAttribute('disabled') && element.getAttribute('aria-hidden') !== 'true')

export function ConfirmModal({
  open,
  busy = false,
  title,
  message,
  cancelText = '취소',
  confirmText = '확인',
  confirmingText = '처리 중',
  dialogTitleId,
  classNames,
  onCancel,
  onConfirm,
  keepOpenAttr = false,
}: ConfirmModalProps) {
  const descriptionId = useId()
  const asyncErrorId = useId()
  const panelRef = useRef<HTMLDivElement | null>(null)
  const cancelButtonRef = useRef<HTMLButtonElement | null>(null)
  const previouslyFocusedElementRef = useRef<HTMLElement | null>(null)
  const [confirmError, setConfirmError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return undefined

    previouslyFocusedElementRef.current = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null

    const frame = window.requestAnimationFrame(() => {
      if (cancelButtonRef.current && !cancelButtonRef.current.disabled) {
        cancelButtonRef.current.focus()
        return
      }
      panelRef.current?.focus()
    })

    return () => {
      window.cancelAnimationFrame(frame)
      const previousElement = previouslyFocusedElementRef.current
      if (previousElement && document.contains(previousElement)) {
        previousElement.focus()
      }
      previouslyFocusedElementRef.current = null
      setConfirmError(null)
    }
  }, [open])

  if (!open) return null

  const modalClassNames = {
    backdrop: classNames?.backdrop ?? styles.backdrop,
    panel: classNames?.panel ?? styles.panel,
    title: classNames?.title ?? styles.title,
    text: classNames?.text ?? styles.text,
    actions: classNames?.actions ?? styles.actions,
    button: classNames?.button ?? styles.button,
    cancelButton: classNames?.cancelButton ?? styles.cancelButton,
    confirmButton: classNames?.confirmButton ?? styles.dangerButton,
  }
  const describedBy = confirmError ? `${descriptionId} ${asyncErrorId}` : descriptionId

  const handleCancel = () => {
    if (busy) return
    setConfirmError(null)
    onCancel()
  }

  const handleConfirm = async () => {
    if (busy) return
    setConfirmError(null)
    try {
      await onConfirm()
    } catch (error) {
      setConfirmError(getAsyncErrorMessage(error))
    }
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      event.stopPropagation()
      if (!busy) handleCancel()
      return
    }

    if (event.key !== 'Tab') return

    const panel = panelRef.current
    if (!panel) return

    const focusableElements = getFocusableElements(panel)
    if (!focusableElements.length) {
      event.preventDefault()
      panel.focus()
      return
    }

    const firstElement = focusableElements[0]
    const lastElement = focusableElements[focusableElements.length - 1]

    if (event.shiftKey && document.activeElement === firstElement) {
      event.preventDefault()
      lastElement.focus()
      return
    }

    if (!event.shiftKey && document.activeElement === lastElement) {
      event.preventDefault()
      firstElement.focus()
    }
  }

  return (
    <div
      {...(keepOpenAttr ? drawerKeepOpenDataProps() : {})}
      className={modalClassNames.backdrop}
      onClick={handleCancel}
      onKeyDown={handleKeyDown}
    >
      <div
        ref={panelRef}
        className={modalClassNames.panel}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={dialogTitleId}
        aria-describedby={describedBy}
        tabIndex={-1}
      >
        <h3 id={dialogTitleId} className={modalClassNames.title}>
          {title}
        </h3>
        <p id={descriptionId} className={modalClassNames.text}>{message}</p>
        {confirmError && (
          <p id={asyncErrorId} className={modalClassNames.text} role="alert">
            {confirmError}
          </p>
        )}
        <div className={modalClassNames.actions}>
          <button
            ref={cancelButtonRef}
            type="button"
            className={`${modalClassNames.button} ${modalClassNames.cancelButton}`}
            onClick={handleCancel}
            disabled={busy}
          >
            {cancelText}
          </button>
          <button
            type="button"
            className={`${modalClassNames.button} ${modalClassNames.confirmButton}`}
            disabled={busy}
            onClick={() => void handleConfirm()}
          >
            {busy ? <LoadingSpinner size="inline" label={confirmingText} /> : confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}
