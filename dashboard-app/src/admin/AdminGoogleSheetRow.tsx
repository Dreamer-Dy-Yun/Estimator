import type { AdminGoogleSheetConfigSummary } from '../api'
import {
  GOOGLE_SHEET_PURPOSE_OPTIONS,
  formatUpdatedAt,
} from './adminHelpers'
import styles from './AdminPage.module.css'

export interface AdminGoogleSheetRowProps {
  config: AdminGoogleSheetConfigSummary
  onOpen: (config: AdminGoogleSheetConfigSummary) => void
}

function getOptionLabel<T extends string>(options: Array<{ value: T; label: string }>, value: T) : string {
  return options.find((option: { value: T; label: string; }) : boolean => option.value === value)?.label ?? value
}

function getSpreadsheetOpenUrl(config: AdminGoogleSheetConfigSummary) : string {
  const url: string = config.spreadsheetUrl.trim()
  if (/^https?:\/\//i.test(url)) return url
  return `https://docs.google.com/spreadsheets/d/${encodeURIComponent(config.spreadsheetId || url)}/edit`
}

export function AdminGoogleSheetRow({ config, onOpen }: AdminGoogleSheetRowProps) : React.JSX.Element {
  const note: string | undefined = config.note?.trim()
  const maskedServiceAccountKey: string = config.maskedServiceAccountKey?.trim()
  const spreadsheetUrl: string = config.spreadsheetUrl.trim()

  const handleOpenSheet: (event: React.MouseEvent<HTMLButtonElement>) => void = (event: React.MouseEvent<HTMLButtonElement>) : void => {
    event.stopPropagation()
    window.open(getSpreadsheetOpenUrl(config), '_blank', 'noopener,noreferrer')
  }

  return (
    <div className={styles.googleSheetListRow}>
      <button
        className={styles.googleSheetDetailButton}
        type="button"
        onClick={() : void => onOpen(config)}
      >
        <span>{config.companyName}</span>
        <span className={styles.gptKeyNameCell}>
          <strong>{config.name}</strong>
          {note ? <small>{note}</small> : null}
        </span>
        <span>{getOptionLabel(GOOGLE_SHEET_PURPOSE_OPTIONS, config.purpose)}</span>
        <span className={styles.gptKeyNameCell}>
          <strong>{config.serviceAccountEmail}</strong>
          {maskedServiceAccountKey ? <small>{maskedServiceAccountKey}</small> : null}
        </span>
        <span className={styles.gptKeyNameCell}>
          <strong>{config.spreadsheetId}</strong>
          {spreadsheetUrl ? <small>{spreadsheetUrl}</small> : null}
        </span>
        <span className={styles.statusCell}>
          <span className={`${styles.statusPill} ${config.isActive ? styles.status_success : styles.status_failed}`}>
            {config.isActive ? '활성' : '비활성'}
          </span>
        </span>
        <span className={styles.updatedCell}>{formatUpdatedAt(config.dbUpdatedAt)}</span>
      </button>
      <span className={styles.actionCell}>
        <button
          className={styles.resetButton}
          type="button"
          onClick={handleOpenSheet}
          aria-label={`${config.companyName} ${config.name} 시트로 이동`}
        >
          시트로 이동
        </button>
      </span>
    </div>
  )
}
