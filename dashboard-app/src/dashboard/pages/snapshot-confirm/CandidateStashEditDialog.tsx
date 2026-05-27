import type { CandidateStashSummary } from '../../../api'
import { LoadingSpinner } from '../../../components/LoadingSpinner'
import confirmStyles from '../../components/ConfirmModal.module.css'
import pageStyles from '../SnapshotConfirmPage.module.css'

type Props = {
  editTarget: CandidateStashSummary | null
  editName: string
  editNote: string
  editBusy: boolean
  onNameChange: (value: string) => void
  onNoteChange: (value: string) => void
  onClose: () => void
  onSave: () => void | Promise<void>
}

export function CandidateStashEditDialog({
  editTarget,
  editName,
  editNote,
  editBusy,
  onNameChange,
  onNoteChange,
  onClose,
  onSave,
}: Props) {
  if (!editTarget) return null
  return (
    <div className={confirmStyles.backdrop} onClick={() => !editBusy && onClose()}>
      <div className={confirmStyles.panel} onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="stash-edit-dialog-title" aria-describedby="stash-edit-dialog-description">
        <h3 id="stash-edit-dialog-title" className={confirmStyles.title}>이름·비고 편집</h3>
        <p id="stash-edit-dialog-description" className={confirmStyles.text}>후보군 표시 이름과 비고만 변경합니다. 등록 상품과 오류 데이터는 유지됩니다.</p>
        <div className={pageStyles.confirmModalForm}>
          <div className={pageStyles.confirmModalField}>
            <span className={pageStyles.confirmModalLabel}>후보군 UUID</span>
            <p className={pageStyles.confirmModalUuid}>{editTarget.uuid}</p>
          </div>
          <div className={pageStyles.confirmModalField}>
            <label className={pageStyles.confirmModalLabel} htmlFor="stash-edit-name">이름</label>
            <input id="stash-edit-name" type="text" className={pageStyles.confirmModalInput} value={editName} onChange={(event) => onNameChange(event.target.value)} disabled={editBusy} autoComplete="off" />
          </div>
          <div className={pageStyles.confirmModalField}>
            <label className={pageStyles.confirmModalLabel} htmlFor="stash-edit-note">비고</label>
            <textarea id="stash-edit-note" className={`${pageStyles.confirmModalInput} ${pageStyles.confirmModalTextarea}`} value={editNote} onChange={(event) => onNoteChange(event.target.value)} disabled={editBusy} rows={3} />
          </div>
        </div>
        <div className={confirmStyles.actions}>
          <button type="button" className={`${confirmStyles.button} ${confirmStyles.cancelButton}`} onClick={onClose} disabled={editBusy}>취소</button>
          <button type="button" className={`${confirmStyles.button} ${confirmStyles.primaryButton}`} disabled={editBusy || !editName.trim()} onClick={() => void onSave()}>
            {editBusy ? <LoadingSpinner size="inline" label="저장 중" /> : '저장'}
          </button>
        </div>
      </div>
    </div>
  )
}
