import styles from './AdminPage.module.css'

export interface AdminActiveSwitchProps {
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
  label?: string
}

export function AdminActiveSwitch({
  checked,
  onChange,
  disabled = false,
  label = '활성',
}: AdminActiveSwitchProps) : React.JSX.Element {
  return (
    <button
      type="button"
      className={`${styles.activeSwitch} ${checked ? styles.activeSwitchOn : ''}`.trim()}
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() : void => onChange(!checked)}
    >
      <span className={styles.activeSwitchTrack} aria-hidden="true">
        <span className={styles.activeSwitchThumb} />
      </span>
      <span className={styles.activeSwitchLabel}>{label}</span>
    </button>
  )
}
