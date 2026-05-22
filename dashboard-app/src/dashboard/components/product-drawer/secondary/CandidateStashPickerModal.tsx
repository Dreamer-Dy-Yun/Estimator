import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { formatDateTimeMinute } from '../../../../utils/date'
import { LoadingSpinner } from '../../../../components/LoadingSpinner'
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
  const nameInputRef = useRef<HTMLInputElement | null>(null)
  const closeButtonRef = useRef<HTMLButtonElement | null>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    nameInputRef.current?.focus()

    return () => {
      const previousFocus = previousFocusRef.current
      if (previousFocus?.isConnected) {
        previousFocus.focus()
      }
    }
  }, [])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      onClose()
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return createPortal(
    <div className={styles.candidateModalBackdrop} role="presentation" onClick={onClose}>
      <div
        className={styles.candidateModal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="candidate-stash-picker-title"
        aria-describedby="candidate-stash-picker-description"
        onClick={(event) => event.stopPropagation()}
      >
        <div className={styles.candidatePanel}>
          <div className={styles.candidateModalHeader}>
            <h4 id="candidate-stash-picker-title" className={styles.candidateModalTitle}>
              {KO.btnSelectCandidate}
            </h4>
            <p id="candidate-stash-picker-description" hidden>
              후보군을 선택하거나 이름과 비고를 입력해 새 후보군을 생성할 수 있습니다.
            </p>
            <button
              ref={closeButtonRef}
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
                ref={nameInputRef}
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
              {loading ? <LoadingSpinner size="inline" label="처리 중" /> : KO.btnCreateCandidateConfirm}
            </button>
          </div>
          <div className={styles.candidateList}>
            {loading && options.length === 0 ? (
              <LoadingSpinner label="후보군 목록을 불러오는 중" />
            ) : options.length === 0 ? (
              <div className={styles.candidateEmptyState}>
                <p className={styles.candidateEmptyTitle}>{KO.msgCandidateEmpty}</p>
                <p className={styles.metaFilterActionHint}>
                  상단에서 이름과 비고를 입력해 후보군을 먼저 생성해 주세요.
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
                  disabled={loading}
                  aria-pressed={selectedUuid === row.uuid}
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
