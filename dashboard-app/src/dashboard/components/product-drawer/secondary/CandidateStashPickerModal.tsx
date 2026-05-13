import { createPortal } from 'react-dom'
import { formatDateTimeMinute } from '../../../../utils/date'
import commonStyles from '../../common.module.css'
import { KO } from '../ko'
import styles from './secondaryDrawer.module.css'

export type CandidateStashPickerOption = {
  uuid: string
  name: string
  note: string | null
  dbCreatedAt: string
}

type Props = {
  options: CandidateStashPickerOption[]
  selectedUuid: string | null
  nameInput: string
  noteInput: string
  loading: boolean
  onNameInputChange: (next: string) => void
  onNoteInputChange: (next: string) => void
  onCreate: () => void
  onSelect: (option: CandidateStashPickerOption) => void
  onClose: () => void
}

export function CandidateStashPickerModal({
  options,
  selectedUuid,
  nameInput,
  noteInput,
  loading,
  onNameInputChange,
  onNoteInputChange,
  onCreate,
  onSelect,
  onClose,
}: Props) {
  return createPortal(
    <div className={styles.candidateModalBackdrop} role="presentation" onClick={onClose}>
      <div
        className={styles.candidateModal}
        role="dialog"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
      >
        <div className={styles.candidatePanel}>
          <div className={styles.candidateModalHeader}>
            <h4 className={styles.candidateModalTitle}>{KO.btnSelectCandidate}</h4>
            <button
              type="button"
              className={`${commonStyles.iconCloseButton} ${styles.candidateModalClose}`}
              onClick={onClose}
              aria-label="후보군 선택 닫기"
            />
          </div>
          <div className={styles.candidateCreateForm}>
            <label className={styles.candidateCreateField} htmlFor="candidate-name-input">
              <span className={styles.candidateCreateLabel}>{KO.labelCandidateName}</span>
              <input
                id="candidate-name-input"
                type="text"
                className={styles.candidateTextInput}
                placeholder={KO.labelCandidateName}
                value={nameInput}
                onChange={(event) => onNameInputChange(event.target.value)}
              />
            </label>
            <label className={styles.candidateCreateField} htmlFor="candidate-note-input">
              <span className={styles.candidateCreateLabel}>{KO.labelCandidateNote}</span>
              <input
                id="candidate-note-input"
                type="text"
                className={styles.candidateTextInput}
                placeholder={KO.labelCandidateNote}
                value={noteInput}
                onChange={(event) => onNoteInputChange(event.target.value)}
              />
            </label>
            <button
              type="button"
              className={`${styles.btn} ${styles.btnSecondary} ${styles.btnViewportAdaptive}`}
              onClick={onCreate}
              disabled={loading}
            >
              {KO.btnCreateCandidateConfirm}
            </button>
          </div>
          <div className={styles.candidateList}>
            {options.length === 0 ? (
              <div className={styles.candidateEmptyState}>
                <p className={styles.candidateEmptyTitle}>{KO.msgCandidateEmpty}</p>
                <p className={styles.metaFilterActionHint}>
                  상단에서 이름과 비고를 입력해 후보군을 먼저 생성하세요.
                </p>
              </div>
            ) : (
              options.map((row) => (
                <button
                  key={row.uuid}
                  type="button"
                  className={`${styles.candidateListItem} ${
                    selectedUuid === row.uuid ? styles.candidateListItemActive : ''
                  }`}
                  onClick={() => onSelect(row)}
                >
                  <div className={styles.candidateListItemTop}>
                    <span className={styles.candidateListItemName}>{row.name}</span>
                    {selectedUuid === row.uuid && (
                      <span className={styles.candidateListItemBadge}>선택됨</span>
                    )}
                  </div>
                  <span className={styles.candidateListItemMeta}>
                    생성일 {formatDateTimeMinute(row.dbCreatedAt)}
                  </span>
                  <span className={styles.candidateListItemDesc}>
                    {row.note?.trim() ? row.note : KO.msgNoNote}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
