import styles from './LoadingSpinner.module.css'

export type LoadingSpinnerProps = {
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
}: LoadingSpinnerProps) : React.JSX.Element {
  const rootClassName: string = [styles.root, styles[size], className].filter(Boolean).join(' ')
  const statusProps: { role?: undefined; 'aria-live'?: undefined; } | { role: string; 'aria-live': 'polite'; } = size === 'inline' ? {} : { role: 'status', 'aria-live': 'polite' as const }

  return (
    <span className={rootClassName} {...statusProps}>
      <span className={styles.spinner} aria-hidden="true" />
      {showLabel ? <span className={styles.label}>{label}</span> : <span className={styles.srOnly}>{label}</span>}
    </span>
  )
}
