import { LoadingSpinner } from '../../../components/LoadingSpinner'
import type { CandidateBulkDetailConfirmProgress } from './useCandidateBulkDetailConfirm'
import styles from './CandidateStashDetailModal.module.css'

type Props = {
  progress: CandidateBulkDetailConfirmProgress | null
  onClose: () => void
}

export function CandidateBulkDetailConfirmProgress({ progress, onClose }: Props) {
  if (!progress?.open) return null
  const running = progress.status === 'queued' || progress.status === 'running'
  return (
    <div className={styles.bulkConfirmProgressPopup} role="status" aria-live="polite">
      <div className={styles.bulkConfirmProgressHeader}>
        <strong>상세 일괄확정</strong>
        {!running && (
          <button type="button" className={styles.bulkConfirmProgressClose} onClick={onClose}>
            닫기
          </button>
        )}
      </div>
      <div className={styles.bulkConfirmProgressBody}>
        {running && <LoadingSpinner size="inline" label="상세확정 진행 중" />}
        <span>{progress.message}</span>
      </div>
      <div className={styles.bulkConfirmProgressMeta}>
        {progress.currentProductName ? `${progress.currentProductName} · ` : ''}
        {progress.completedItems}/{progress.totalItems}
      </div>
      {progress.error && <p className={styles.bulkConfirmProgressError}>{progress.error}</p>}
    </div>
  )
}
