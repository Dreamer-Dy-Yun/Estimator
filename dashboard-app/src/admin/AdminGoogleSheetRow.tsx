import type { AdminGoogleSheetConfigSummary } from '../api'
import {
  GOOGLE_SHEET_PURPOSE_OPTIONS,
  formatUpdatedAt,
} from './adminHelpers'
import styles from './AdminPage.module.css'

interface AdminGoogleSheetRowProps {
  config: AdminGoogleSheetConfigSummary
  onOpen: (config: AdminGoogleSheetConfigSummary) => void
}

function getOptionLabel<T extends string>(options: Array<{ value: T; label: string }>, value: T) {
  return options.find((option) => option.value === value)?.label ?? value
}

export function AdminGoogleSheetRow({ config, onOpen }: AdminGoogleSheetRowProps) {
  return (
    <button className={styles.googleSheetListRow} type="button" onClick={() => onOpen(config)}>
      <span className={styles.gptKeyNameCell}>
        <strong>{config.name}</strong>
        <small>{config.note ?? config.uuid}</small>
      </span>
      <span>{getOptionLabel(GOOGLE_SHEET_PURPOSE_OPTIONS, config.purpose)}</span>
      <span className={styles.gptKeyNameCell}>
        <strong>{config.serviceAccountEmail}</strong>
        <small>{config.maskedServiceAccountKey}</small>
      </span>
      <span className={styles.gptKeyNameCell}>
        <strong>{config.spreadsheetId}</strong>
        <small>{config.spreadsheetUrl}</small>
      </span>
      <span className={styles.statusCell}>
        <span className={`${styles.statusPill} ${config.isActive ? styles.status_success : styles.status_failed}`}>
          {config.isActive ? '활성' : '비활성'}
        </span>
        <small>{formatUpdatedAt(config.dbUpdatedAt)}</small>
      </span>
    </button>
  )
}