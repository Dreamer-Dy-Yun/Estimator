import type { ReactNode } from 'react'
import { AnalysisPeriodQueryButton } from './AnalysisPeriodQueryButton'
import styles from './common.module.css'

type Props = {
  selfCompanyLabel: string
  showRowsWithSelfSalesOnly: boolean
  bulkSelectedCount: number
  queryDisabled: boolean
  candidateAddDisabledReason?: string
  requestStatus?: ReactNode
  onSelfSalesOnlyChange: (checked: boolean) => void
  onOpenBulkAdd: () => void
  onApplyPeriodQuery: () => void
}

export function CompetitorFilterEndControls({
  selfCompanyLabel,
  showRowsWithSelfSalesOnly,
  bulkSelectedCount,
  queryDisabled,
  candidateAddDisabledReason,
  requestStatus,
  onSelfSalesOnlyChange,
  onOpenBulkAdd,
  onApplyPeriodQuery,
}: Props) {
  const bulkAddDisabled = bulkSelectedCount === 0 || Boolean(candidateAddDisabledReason)

  return (
    <div className={styles.periodPresetRowEndGroup}>
      {requestStatus}
      <label className={styles.periodPresetRowToggle}>
        <input
          type="checkbox"
          checked={showRowsWithSelfSalesOnly}
          onChange={(event) => onSelfSalesOnlyChange(event.target.checked)}
        />
        <span>{selfCompanyLabel} 판매량이 존재하는 경우만 보기</span>
      </label>
      <button
        type="button"
        className={`${styles.actionBtn} ${styles.btnPrimary} ${styles.analysisBulkAddButton}`}
        onClick={onOpenBulkAdd}
        disabled={bulkAddDisabled}
        title={candidateAddDisabledReason}
      >
        선택한 물품을 후보군으로
      </button>
      <AnalysisPeriodQueryButton disabled={queryDisabled} onClick={onApplyPeriodQuery} />
    </div>
  )
}
