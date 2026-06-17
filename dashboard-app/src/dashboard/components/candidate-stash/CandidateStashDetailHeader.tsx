import type { CandidateStashSummary } from '../../../api'
import { DialogCloseButton } from '../../../components/DialogCloseButton'
import { formatDateTimeMinute } from '../../../utils/date'
import styles from '../common.module.css'
import detailStyles from './CandidateStashDetailModal.module.css'

export type Props = {
  detailTarget: CandidateStashSummary
  canOpenRecommendations: boolean
  onOpenRecommendations: () => void
  onClose: () => void
}

export function CandidateStashDetailHeader({
  detailTarget,
  canOpenRecommendations,
  onOpenRecommendations,
  onClose,
}: Props) : React.JSX.Element {
  return (
    <div className={styles.card}>
      <div className={detailStyles.detailHeaderGrid}>
        <div className={detailStyles.detailHeaderTitleArea}><h3 id="stash-detail-modal-title" className={detailStyles.detailTitle}>{detailTarget.name}</h3></div>
        <div className={detailStyles.detailMetaStack}>
          <span className={detailStyles.detailMetaLine}>생성 {formatDateTimeMinute(detailTarget.dbCreatedAt)}</span>
          <span className={detailStyles.detailMetaLine}>변경 {formatDateTimeMinute(detailTarget.dbUpdatedAt)}</span>
        </div>
        <div className={detailStyles.detailHeaderRecommendationCell}>
          <button type="button" className={`${styles.actionBtn} ${styles.btnNeutral} ${detailStyles.detailHeaderRecommendationBtn}`} onClick={onOpenRecommendations} disabled={!canOpenRecommendations}>추천 보기</button>
        </div>
        <DialogCloseButton className={`${styles.actionBtn} ${styles.btnNeutral} ${detailStyles.detailHeaderCloseBtn}`} onClose={onClose} />
        {detailTarget.note && <div className={detailStyles.detailNoteGridCell}>{detailTarget.note}</div>}
      </div>
    </div>
  )
}
