import styles from './DialogCloseButton.module.css'

export interface DialogCloseButtonProps {
  className?: string
  disabled?: boolean
  label?: string
  onClose: () => void
}

const DEFAULT_CLOSE_LABEL = '\uB2EB\uAE30' as const

export function DialogCloseButton({
  className = '',
  disabled = false,
  label = DEFAULT_CLOSE_LABEL,
  onClose,
}: DialogCloseButtonProps) : React.JSX.Element {
  const buttonClassName: string = className
    ? `${styles.dialogCloseButton} ${className}`
    : styles.dialogCloseButton

  return (
    <button
      aria-label={label}
      className={buttonClassName}
      disabled={disabled}
      onClick={onClose}
      title={label}
      type="button"
    >
      {'\u00D7'}
    </button>
  )
}
