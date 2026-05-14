import type { CandidateStashSummary } from '../../../api'
import { formatDateTimeMinute } from '../../../utils/date'
import { DeleteButton } from '../DeleteButton'
import styles from '../common.module.css'
import detailStyles from './CandidateStashDetailModal.module.css'

type Props = {
  detailTarget: CandidateStashSummary
  dataReferencePeriodStart: string
  dataReferencePeriodEnd: string
  recommendationLoading: boolean
  canLoadRecommendations: boolean
  selectedVisibleCount: number
  onDataReferencePeriodStartChange: (value: string) => void
  onDataReferencePeriodEndChange: (value: string) => void
  onOpenRecommendations: () => void
  onOpenBulkDelete: () => void
  onClose: () => void
}

export function CandidateStashDetailHeader({
  detailTarget,
  dataReferencePeriodStart,
  dataReferencePeriodEnd,
  recommendationLoading,
  canLoadRecommendations,
  selectedVisibleCount,
  onDataReferencePeriodStartChange,
  onDataReferencePeriodEndChange,
  onOpenRecommendations,
  onOpenBulkDelete,
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
        <div className={detailStyles.detailHeaderDataReferencePeriodCell} aria-label="데이터 참조 기간">
          <span className={detailStyles.detailHeaderDataReferencePeriodLabel}>데이터 참조 기간 :</span>
          <input
            className={detailStyles.detailHeaderDataReferencePeriodInput}
            type="date"
            aria-label="데이터 참조 시작일"
            value={dataReferencePeriodStart}
            onChange={(event) => onDataReferencePeriodStartChange(event.target.value)}
          />
          <span className={detailStyles.detailHeaderDataReferencePeriodSeparator}>~</span>
          <input
            className={detailStyles.detailHeaderDataReferencePeriodInput}
            type="date"
            aria-label="데이터 참조 종료일"
            value={dataReferencePeriodEnd}
            onChange={(event) => onDataReferencePeriodEndChange(event.target.value)}
          />
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
            {recommendationLoading ? '추천 조회 중' : '추천 보기'}
          </button>
        </div>
        <div className={detailStyles.detailHeaderDeleteCell}>
          <DeleteButton
            label="일괄삭제"
            onClick={onOpenBulkDelete}
            disabled={selectedVisibleCount === 0}
            aria-label="선택 이너 오더 일괄삭제"
            title={
              selectedVisibleCount === 0
                ? '삭제할 이너 오더를 선택하세요.'
                : `선택된 이너 오더 ${selectedVisibleCount}개 삭제`
            }
          />
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
