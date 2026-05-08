import styles from './CopyToastBanner.module.css'

export function CopyToastBanner({ message }: { message: string | null }) {
  if (!message) return null
  return (
    <div className={styles.root} role="status" aria-live="polite">
      {message}
    </div>
  )
}
