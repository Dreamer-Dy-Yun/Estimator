import { LoadingSpinner } from '../../../components/LoadingSpinner'
import styles from '../common.module.css'
import detailStyles from './CandidateStashDetailModal.module.css'

type Props = {
  periodStart: string
  periodEnd: string
  loading: boolean
  queryDirty: boolean
  onPeriodStartChange: (value: string) => void
  onPeriodEndChange: (value: string) => void
  onSearch: () => void
}

export function CandidateStashDataReferenceCard({
  periodStart,
  periodEnd,
  loading,
  queryDirty,
  onPeriodStartChange,
  onPeriodEndChange,
  onSearch,
}: Props) {
  const canSearch = Boolean(periodStart && periodEnd && queryDirty && !loading)

  return (
    <div className={styles.card}>
      <div className={detailStyles.dataReferenceQueryGrid}>
        <span className={detailStyles.dataReferenceQueryLabel}>조회 데이터 기간</span>
        <div className={detailStyles.dataReferenceQueryControls}>
          <input
            className={detailStyles.dataReferenceQueryInput}
            type="date"
            aria-label="데이터 참조 시작일"
            value={periodStart}
            onChange={(event) => onPeriodStartChange(event.target.value)}
          />
          <span className={detailStyles.dataReferenceQuerySeparator}>~</span>
          <input
            className={detailStyles.dataReferenceQueryInput}
            type="date"
            aria-label="데이터 참조 종료일"
            value={periodEnd}
            onChange={(event) => onPeriodEndChange(event.target.value)}
          />
        </div>
        <div className={detailStyles.dataReferenceQueryActions}>
          <button
            type="button"
            className={`${styles.actionBtn} ${styles.btnPrimary} ${detailStyles.dataReferenceQueryButton}`}
            onClick={onSearch}
            disabled={!canSearch}
          >
            {loading ? <LoadingSpinner size="inline" label="조회 중" /> : '조회'}
          </button>
        </div>
      </div>
    </div>
  )
}
