import type { AdminGptKeySummary } from '../api'
import { GPT_KEY_PURPOSE_OPTIONS, gptKeyTestStatusLabels } from './adminHelpers'
import styles from './AdminPage.module.css'

export function AdminGptKeyRow({
  gptKey,
  onOpen,
}: {
  gptKey: AdminGptKeySummary
  onOpen: (gptKey: AdminGptKeySummary) => void
}) {
  return (
    <button className={styles.gptKeyListRow} type="button" onClick={() => onOpen(gptKey)}>
      <span className={styles.gptKeyNameCell}>
        <strong>{gptKey.name}</strong>
      </span>
      <span>{GPT_KEY_PURPOSE_OPTIONS.find((option) => option.value === gptKey.purpose)?.label ?? gptKey.purpose}</span>
      <span>{gptKey.model}</span>
      <span>{gptKey.maskedKey}</span>
      <span className={styles.gptKeyStatusSummary}>
        <span className={`${styles.statusPill} ${gptKey.isActive ? styles.status_success : styles.status_failed}`}>
          {gptKey.isActive ? '활성' : '비활성'}
        </span>
        <small>{gptKeyTestStatusLabels[gptKey.lastTestStatus]}</small>
      </span>
    </button>
  )
}
