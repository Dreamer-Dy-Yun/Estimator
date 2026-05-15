import type { CandidateStashSummary } from '../../../api'
import { formatDateTimeMinute } from '../../../utils/date'
import { LoadingSpinner } from '../../../components/LoadingSpinner'
import styles from '../common.module.css'
import detailStyles from './CandidateStashDetailModal.module.css'

type Props = {
  detailTarget: CandidateStashSummary
  recommendationLoading: boolean
  canLoadRecommendations: boolean
  onOpenRecommendations: () => void
  onClose: () => void
}

export function CandidateStashDetailHeader({
  detailTarget,
  recommendationLoading,
  canLoadRecommendations,
  onOpenRecommendations,
  onClose,
}: Props) {
  return (
    <div className={styles.card}>
      <div className={detailStyles.detailHeaderGrid}>
        <div className={detailStyles.detailHeaderTitleArea}>
          <h3 id="stash-detail-modal-title" className={detailStyles.detailTitle}>
            {detailTarget.name}
          </h3>
        </div>
        <div className={detailStyles.detailMetaStack}>
          <span className={detailStyles.detailMetaLine}>
            생성 {formatDateTimeMinute(detailTarget.dbCreatedAt)}
          </span>
          <span className={detailStyles.detailMetaLine}>
            변경 {formatDateTimeMinute(detailTarget.dbUpdatedAt)}
          </span>
        </div>
        <div className={detailStyles.detailHeaderRecommendationCell}>
          <button
            type="button"
            className={`${styles.actionBtn} ${styles.btnNeutral} ${detailStyles.detailHeaderRecommendationBtn}`}
            onClick={onOpenRecommendations}
            disabled={recommendationLoading || !canLoadRecommendations}
          >
            {recommendationLoading ? <LoadingSpinner size="inline" label="추천 조회 중" /> : '추천 보기'}
          </button>
        </div>
        <button
          type="button"
          className={`${styles.actionBtn} ${styles.btnNeutral} ${detailStyles.detailHeaderCloseBtn}`}
          onClick={onClose}
          aria-label="닫기"
          title="닫기"
        >
          ×
        </button>
        {detailTarget.note && (
          <div className={detailStyles.detailNoteGridCell}>{detailTarget.note}</div>
        )}
      </div>
    </div>
  )
}
