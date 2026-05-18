import type { ReactNode } from 'react'
import styles from './common.module.css'

type Props = {
  showRowsWithSelfSalesOnly: boolean
  bulkSelectedCount: number
  requestStatus?: ReactNode
  onSelfSalesOnlyChange: (checked: boolean) => void
  onOpenBulkAdd: () => void
}

export function CompetitorFilterEndControls({
  showRowsWithSelfSalesOnly,
  bulkSelectedCount,
  requestStatus,
  onSelfSalesOnlyChange,
  onOpenBulkAdd,
}: Props) {
  return (
    <div className={styles.periodPresetRowEndGroup}>
      {requestStatus}
      <label className={styles.periodPresetRowToggle}>
        <input
          type="checkbox"
          checked={showRowsWithSelfSalesOnly}
          onChange={(event) => onSelfSalesOnlyChange(event.target.checked)}
        />
        <span>자사판매량이 존재하는 경우만 보기</span>
      </label>
      <button
        type="button"
        className={`${styles.actionBtn} ${styles.btnPrimary} ${styles.analysisBulkAddButton}`}
        onClick={onOpenBulkAdd}
        disabled={bulkSelectedCount === 0}
      >
        선택한 물품을 후보군으로
      </button>
    </div>
  )
}
