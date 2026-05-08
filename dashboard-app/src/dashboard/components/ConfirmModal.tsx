import type { ReactNode } from 'react'
import { drawerKeepOpenDataProps } from '../drawer/drawerDom'
import styles from './ConfirmModal.module.css'

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

export function ConfirmModal({
  open,
  busy = false,
  title,
  message,
  cancelText = '취소',
  confirmText = '확인',
  confirmingText = '처리 중…',
  dialogTitleId,
  classNames,
  onCancel,
  onConfirm,
  keepOpenAttr = false,
}: ConfirmModalProps) {
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
  return (
    <div
      {...(keepOpenAttr ? drawerKeepOpenDataProps() : {})}
      className={modalClassNames.backdrop}
      onClick={() => !busy && onCancel()}
    >
      <div
        className={modalClassNames.panel}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={dialogTitleId}
      >
        <h3 id={dialogTitleId} className={modalClassNames.title}>
          {title}
        </h3>
        <p className={modalClassNames.text}>{message}</p>
        <div className={modalClassNames.actions}>
          <button
            type="button"
            className={`${modalClassNames.button} ${modalClassNames.cancelButton}`}
            onClick={onCancel}
            disabled={busy}
          >
            {cancelText}
          </button>
          <button
            type="button"
            className={`${modalClassNames.button} ${modalClassNames.confirmButton}`}
            disabled={busy}
            onClick={() => void onConfirm()}
          >
            {busy ? confirmingText : confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}
