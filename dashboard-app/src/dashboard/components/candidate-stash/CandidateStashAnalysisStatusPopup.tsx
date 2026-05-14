import type { CandidateStashAnalysisProgressEvent } from '../../../api'
import styles from '../common.module.css'
import detailStyles from './CandidateStashDetailModal.module.css'
import { useAnalysisStatusPopup } from './useAnalysisStatusPopup'

type Props = {
  stashUuid: string
  progress: CandidateStashAnalysisProgressEvent | null
  error: string | null
}

export function CandidateStashAnalysisStatusPopup({ stashUuid, progress, error }: Props) {
  const popup = useAnalysisStatusPopup({ stashUuid, progress })

  if (!popup.show || !progress) return null

  return (
    <div
      className={`${detailStyles.analysisStatusCard} ${detailStyles.analysisStatusPopup} ${
        error ? detailStyles.analysisStatusCardError : ''
      }`}
      role="status"
      aria-live="polite"
      onClick={(e) => e.stopPropagation()}
    >
      <div className={detailStyles.analysisStatusHead}>
        <strong>AI 스냅샷 분석</strong>
        <span className={detailStyles.analysisStatusHeadActions}>
          <span className={detailStyles.analysisStatusBadge}>{popup.statusLabel}</span>
          {popup.isTerminal && (
            <button
              type="button"
              className={`${styles.iconCloseButton} ${detailStyles.analysisStatusDismissBtn}`}
              onClick={popup.dismiss}
              aria-label="AI 분석 팝업 즉시 닫기"
              title="즉시 닫기"
            />
          )}
        </span>
      </div>
      <div className={detailStyles.analysisStatusProgressTrack} aria-hidden="true">
        <span
          className={detailStyles.analysisStatusProgressFill}
          style={{ width: `${popup.progressPct}%` }}
        />
      </div>
      <div className={detailStyles.analysisStatusMeta}>
        <span>{error ?? progress.message}</span>
        <span>
          {progress.completedItems}/{progress.totalItems}
        </span>
      </div>
      {popup.isTerminal && (
        <div className={detailStyles.analysisStatusAutoDismissText}>
          이 팝업은 {popup.remainingSec}초 후에 닫힙니다.
        </div>
      )}
    </div>
  )
}
