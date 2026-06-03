import { useCallback, useId, useRef, useState } from 'react'
import { LoadingSpinner } from '../../components/LoadingSpinner'
import { drawerKeepOpenDataProps } from '../drawer/drawerDom'
import styles from './ConfirmModal.module.css'
import { useModalFocusTrap } from './useModalFocusTrap'

export type ConfirmModalClassNames = {
  backdrop?: string
  panel?: string
  title?: string
  text?: string
  actions?: string
  button?: string
  cancelButton?: string
  confirmButton?: string
}

export type ConfirmModalProps = {
  open: boolean
  busy?: boolean
  title: string
  message: React.ReactNode
  cancelText?: string
  confirmText?: string
  confirmingText?: string
  dialogTitleId: string
  classNames?: ConfirmModalClassNames
  onCancel: () => void
  onConfirm: () => void | Promise<void>
  keepOpenAttr?: boolean
}

const getAsyncErrorMessage: (error: unknown) => string = (error: unknown) : string => {
  if (error instanceof Error && error.message.trim()) return error.message
  return '요청 처리 중 오류가 발생했습니다.'
}

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
}: ConfirmModalProps) : React.JSX.Element | null {
  const descriptionId: string = useId()
  const asyncErrorId: string = useId()
  const panelRef: React.RefObject<HTMLDivElement | null> = useRef<HTMLDivElement | null>(null)
  const cancelButtonRef: React.RefObject<HTMLButtonElement | null> = useRef<HTMLButtonElement | null>(null)
  const [confirmError, setConfirmError]: [string | null, React.Dispatch<React.SetStateAction<string | null>>] = useState<string | null>(null)
  const handleCancel: () => void = useCallback(() : void => {
    if (busy) return
    setConfirmError(null)
    onCancel()
  }, [busy, onCancel])
  const handleKeyDown: (event: React.KeyboardEvent<HTMLDivElement>) => void = useModalFocusTrap({
    panelRef,
    active: open,
    closeDisabled: busy,
    onClose: handleCancel,
    initialFocusRef: cancelButtonRef,
  })

  if (!open) return null

  const modalClassNames: Required<ConfirmModalClassNames> = {
    backdrop: classNames?.backdrop ?? styles.backdrop,
    panel: classNames?.panel ?? styles.panel,
    title: classNames?.title ?? styles.title,
    text: classNames?.text ?? styles.text,
    actions: classNames?.actions ?? styles.actions,
    button: classNames?.button ?? styles.button,
    cancelButton: classNames?.cancelButton ?? styles.cancelButton,
    confirmButton: classNames?.confirmButton ?? styles.dangerButton,
  }
  const describedBy: string = confirmError ? `${descriptionId} ${asyncErrorId}` : descriptionId
  const handleConfirm: () => Promise<void> = async () : Promise<void> => {
    if (busy) return
    setConfirmError(null)
    try {
      await onConfirm()
    } catch (error) {
      setConfirmError(getAsyncErrorMessage(error))
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
        onClick={(e: React.MouseEvent<HTMLDivElement, MouseEvent>) : void => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={dialogTitleId}
        aria-describedby={describedBy}
        tabIndex={-1}
      >
        <h3 id={dialogTitleId} className={modalClassNames.title}>{title}</h3>
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
            onClick={() : undefined => void handleConfirm()}
          >
            {busy ? <LoadingSpinner size="inline" label={confirmingText} /> : confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}
