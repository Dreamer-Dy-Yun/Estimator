import type { ReactNode } from 'react'

type ConfirmModalClassNames = {
  backdrop: string
  panel: string
  title: string
  text: string
  actions: string
  button: string
  cancelButton: string
  confirmButton: string
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
  classNames: ConfirmModalClassNames
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
  return (
    <div
      {...(keepOpenAttr ? { 'data-drawer-keep-open': 'true' } : {})}
      className={classNames.backdrop}
      onClick={() => !busy && onCancel()}
    >
      <div
        className={classNames.panel}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={dialogTitleId}
      >
        <h3 id={dialogTitleId} className={classNames.title}>
          {title}
        </h3>
        <p className={classNames.text}>{message}</p>
        <div className={classNames.actions}>
          <button
            type="button"
            className={`${classNames.button} ${classNames.cancelButton}`}
            onClick={onCancel}
            disabled={busy}
          >
            {cancelText}
          </button>
          <button
            type="button"
            className={`${classNames.button} ${classNames.confirmButton}`}
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

