import type { CSSProperties } from 'react'
import type { CandidateStashSummary } from '../../../api'
import { LoadingSpinner } from '../../../components/LoadingSpinner'
import { formatDateTimeMinute } from '../../../utils/date'
import { DeleteButton } from '../../components/DeleteButton'
import styles from '../../components/common.module.css'
import pageStyles from '../SnapshotConfirmPage.module.css'

type Props = {
  allStashesEmpty: boolean
  stashes: CandidateStashSummary[]
  duplicateBusyUuid: string | null
  onOpenDetail: (stashUuid: string) => void
  onOpenEdit: (stash: CandidateStashSummary) => void
  onDuplicate: (stash: CandidateStashSummary) => void
  onDelete: (stash: CandidateStashSummary) => void
}

const STASH_CARD_BUTTON_STYLE: CSSProperties = { width: '100%', border: 0, background: 'transparent', textAlign: 'left', padding: 0, cursor: 'pointer', display: 'grid', gap: 6 }

export function CandidateStashList({ allStashesEmpty, stashes, duplicateBusyUuid, onOpenDetail, onOpenEdit, onDuplicate, onDelete }: Props) {
  if (allStashesEmpty || !stashes.length) {
    return <div className={`${styles.card} ${pageStyles.emptyStateCard}`}>{allStashesEmpty ? '저장된 오더 후보군이 없습니다.' : '검색 조건에 맞는 후보군이 없습니다.'}</div>
  }
  return (
    <div className={pageStyles.stashList}>
      {stashes.map((stash) => {
        const duplicating = duplicateBusyUuid === stash.uuid
        return (
          <div key={stash.uuid} className={`${styles.card} ${pageStyles.stashCard}`}>
            <div className={pageStyles.stashCardRow}>
              <button type="button" onClick={() => onOpenDetail(stash.uuid)} style={STASH_CARD_BUTTON_STYLE}>
                <div className={pageStyles.stashInfoGrid}>
                  <div className={pageStyles.stashLeftTop}><strong className={pageStyles.stashName}>{stash.name}</strong><span className={pageStyles.stashMetaDot}>·</span><span className={pageStyles.stashMeta}>등록 상품 {stash.itemCount}건</span></div>
                  <span className={pageStyles.stashMetaRight}>생성일: {formatDateTimeMinute(stash.dbCreatedAt)}</span>
                  <span className={pageStyles.stashNote}>{stash.note?.trim() ? stash.note : '-'}</span>
                  <span className={pageStyles.stashMetaRight}>변경일: {formatDateTimeMinute(stash.dbUpdatedAt)}</span>
                </div>
              </button>
              <div className={pageStyles.stashCardActions}>
                <button type="button" className={`${pageStyles.actionBtn} ${pageStyles.btnNeutral}`} aria-label={`${stash.name} 이름·비고 편집`} title="이름·비고 편집" onClick={() => onOpenEdit(stash)}><span className={pageStyles.editLabelFull}>이름·비고 편집</span><span className={pageStyles.editLabelCompact}>편집</span></button>
                <button type="button" className={`${pageStyles.actionBtn} ${pageStyles.btnNeutral}`} disabled={duplicating} aria-label={`${stash.name} 복제`} title="복제" onClick={() => onDuplicate(stash)}>{duplicating ? <LoadingSpinner size="inline" label="복제 중" /> : '복제'}</button>
                <DeleteButton aria-label={`${stash.name} 삭제`} title="삭제" onClick={() => onDelete(stash)} />
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
