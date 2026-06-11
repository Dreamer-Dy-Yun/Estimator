import type { CandidateStashSummary, ProductComparisonTarget } from '../../../api'
import type { ApiUnitErrorInfo } from '../../../types'
import { useState } from 'react'
import { DialogCloseButton } from '../../../components/DialogCloseButton'
import { formatDateTimeMinute } from '../../../utils/date'
import styles from '../common.module.css'
import detailStyles from './CandidateStashDetailModal.module.css'

export type Props = {
  detailTarget: CandidateStashSummary
  comparisonTargets: ProductComparisonTarget[]
  comparisonTarget: ProductComparisonTarget | null
  comparisonTargetsLoading: boolean
  comparisonTargetsError: ApiUnitErrorInfo | null
  canOpenRecommendations: boolean
  onComparisonTargetChange: (target: ProductComparisonTarget) => void
  onOpenRecommendations: () => void
  onClose: () => void
}

export function CandidateStashDetailHeader({
  detailTarget,
  comparisonTargets,
  comparisonTarget,
  comparisonTargetsLoading,
  comparisonTargetsError,
  canOpenRecommendations,
  onComparisonTargetChange,
  onOpenRecommendations,
  onClose,
}: Props) : React.JSX.Element {
  const [comparisonSelectorOpen, setComparisonSelectorOpen]: [boolean, React.Dispatch<React.SetStateAction<boolean>>] = useState(false)
  const comparisonButtonDisabled: boolean = comparisonTargetsLoading || comparisonTargets.length === 0
  const comparisonButtonLabel: string = comparisonTargetsLoading
    ? '사이즈 기준 로딩'
    : `사이즈 기준 ${comparisonTarget?.label ?? '없음'}`
  const comparisonErrorMessage: string | null = comparisonTargetsError?.error ?? null
  const handleComparisonButtonClick: () => void = () : void => {
    if (comparisonButtonDisabled) return
    setComparisonSelectorOpen((current: boolean) : boolean => !current)
  }
  const handleComparisonTargetClick: (target: ProductComparisonTarget) => void = (target: ProductComparisonTarget) : void => {
    onComparisonTargetChange(target)
    setComparisonSelectorOpen(false)
  }

  return (
    <div className={styles.card}>
      <div className={detailStyles.detailHeaderGrid}>
        <div className={detailStyles.detailHeaderTitleArea}><h3 id="stash-detail-modal-title" className={detailStyles.detailTitle}>{detailTarget.name}</h3></div>
        <div className={detailStyles.detailMetaStack}>
          <span className={detailStyles.detailMetaLine}>생성 {formatDateTimeMinute(detailTarget.dbCreatedAt)}</span>
          <span className={detailStyles.detailMetaLine}>변경 {formatDateTimeMinute(detailTarget.dbUpdatedAt)}</span>
        </div>
        <div className={detailStyles.detailHeaderComparisonCell}>
          <button
            type="button"
            className={`${styles.actionBtn} ${styles.btnNeutral} ${detailStyles.detailHeaderComparisonBtn}`}
            onClick={handleComparisonButtonClick}
            disabled={comparisonButtonDisabled}
            aria-haspopup="listbox"
            aria-expanded={comparisonSelectorOpen}
          >
            {comparisonButtonLabel}
          </button>
          {comparisonSelectorOpen && (
            <div className={detailStyles.detailHeaderComparisonMenu} role="listbox" aria-label="사이즈 기준 선택">
              {comparisonTargets.map((target: ProductComparisonTarget) : React.JSX.Element => (
                <button
                  key={target.id}
                  type="button"
                  className={target.id === comparisonTarget?.id ? detailStyles.detailHeaderComparisonOptionActive : detailStyles.detailHeaderComparisonOption}
                  onClick={() : void => handleComparisonTargetClick(target)}
                  role="option"
                  aria-selected={target.id === comparisonTarget?.id}
                >
                  {target.label}
                </button>
              ))}
            </div>
          )}
          {comparisonErrorMessage && <span className={detailStyles.detailHeaderComparisonError}>{comparisonErrorMessage}</span>}
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
