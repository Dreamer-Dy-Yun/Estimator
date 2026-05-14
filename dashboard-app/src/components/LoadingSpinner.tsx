import styles from './LoadingSpinner.module.css'

type LoadingSpinnerProps = {
  label?: string
  size?: 'inline' | 'panel' | 'page'
  showLabel?: boolean
  className?: string
}

export function LoadingSpinner({
  label = '요청 처리 중',
  size = 'panel',
  showLabel = true,
  className,
}: LoadingSpinnerProps) {
  const rootClassName = [styles.root, styles[size], className].filter(Boolean).join(' ')
  const statusProps = size === 'inline' ? {} : { role: 'status', 'aria-live': 'polite' as const }

  return (
    <span className={rootClassName} {...statusProps}>
      <span className={styles.spinner} aria-hidden="true" />
      {showLabel ? <span className={styles.label}>{label}</span> : <span className={styles.srOnly}>{label}</span>}
    </span>
  )
}
