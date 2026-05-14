import styles from '../common.module.css'
import detailStyles from './CandidateStashDetailModal.module.css'

type Props = {
  onClose: () => void
}

export function CandidateStashMissingState({ onClose }: Props) {
  return (
    <div className={styles.card}>
      <div className={detailStyles.emptyState}>해당 후보군을 찾을 수 없습니다.</div>
      <div className={detailStyles.stashDetailModalFooterActions}>
        <button
          type="button"
          className={`${styles.actionBtn} ${styles.btnNeutral}`}
          onClick={onClose}
        >
          닫기
        </button>
      </div>
    </div>
  )
}
