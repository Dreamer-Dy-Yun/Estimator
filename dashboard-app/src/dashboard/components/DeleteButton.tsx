import { Fragment, type MouseEvent } from 'react'
import styles from './DeleteButton.module.css'

const TrashSvg = () => (
  <svg viewBox="0 0 24 24" focusable="false">
    <path d="M9 3.5h6a1 1 0 0 1 1 1V6h3a1 1 0 1 1 0 2h-1v11a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V8H5a1 1 0 1 1 0-2h3V4.5a1 1 0 0 1 1-1Zm1 2V6h4V5.5h-4ZM8 8v11h8V8H8Zm2 2a1 1 0 0 1 1 1v5a1 1 0 1 1-2 0v-5a1 1 0 0 1 1-1Zm4 0a1 1 0 0 1 1 1v5a1 1 0 1 1-2 0v-5a1 1 0 0 1 1-1Z" />
  </svg>
)

type DeleteButtonProps = {
  onClick: (e: MouseEvent<HTMLButtonElement>) => void
  disabled?: boolean
  label?: string
  'aria-label'?: string
  title?: string
  /** 목록 카드용: 휴지통 + 「삭제」 */
  variant?: 'list' | 'icon'
}

const splitLabelParts = (label: string) => {
  const chars = Array.from(label)
  const parts: string[] = []
  for (let i = 0; i < chars.length; i += 2) {
    parts.push(chars.slice(i, i + 2).join(''))
  }
  return parts
}

export function DeleteButton({
  onClick,
  disabled,
  label = '삭제',
  'aria-label': ariaLabel,
  title,
  variant = 'list',
}: DeleteButtonProps) {
  const labelParts = splitLabelParts(label)

  if (variant === 'icon') {
    return (
      <button
        type="button"
        className={`${styles.actionBtn} ${styles.btnDelete}`}
        onClick={onClick}
        disabled={disabled}
        aria-label={ariaLabel ?? label}
        title={title ?? ariaLabel}
      >
        <span className={styles.trashIcon} aria-hidden>
          <TrashSvg />
        </span>
      </button>
    )
  }
  return (
    <button
      type="button"
      className={`${styles.actionBtn} ${styles.btnDelete} ${styles.inline}`}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel ?? label}
      title={title ?? ariaLabel}
    >
      <span className={styles.trashIcon} aria-hidden>
        <TrashSvg />
      </span>
      <span className={styles.label}>
        {labelParts.map((part, index) => (
          <Fragment key={`${part}-${index}`}>
            <span className={styles.labelPart}>{part}</span>
            {index < labelParts.length - 1 ? <wbr /> : null}
          </Fragment>
        ))}
      </span>
    </button>
  )
}
