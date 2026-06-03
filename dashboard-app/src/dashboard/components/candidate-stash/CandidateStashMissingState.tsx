import styles from '../common.module.css'
import detailStyles from './CandidateStashDetailModal.module.css'

export type Props = { loadError?: string | null; onClose: () => void }

export function CandidateStashMissingState({ loadError, onClose }: Props) : React.JSX.Element {
  return (
    <>
      <h2 id="stash-detail-modal-title" className={styles.srOnly}>{loadError ? '후보군 상세 로드 실패' : '후보군 상세 없음'}</h2>
      <div className={styles.card}>
        <div className={detailStyles.emptyState} role={loadError ? 'alert' : undefined}>{loadError ?? '해당 후보군을 찾을 수 없습니다.'}</div>
        <div className={detailStyles.stashDetailModalFooterActions}>
          <button type="button" className={`${styles.actionBtn} ${styles.btnNeutral}`} onClick={onClose}>닫기</button>
        </div>
      </div>
    </>
  )
}
