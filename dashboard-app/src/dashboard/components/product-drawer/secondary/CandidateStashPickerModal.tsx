import { useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { formatDateTimeMinute } from '../../../../utils/date'
import { LoadingSpinner } from '../../../../components/LoadingSpinner'
import commonStyles from '../../common.module.css'
import { drawerKeepOpenDataProps } from '../../../drawer/drawerDom'
import { KO } from '../ko'
import styles from './secondaryDrawer.module.css'
import { useModalFocusTrap } from '../../useModalFocusTrap'

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
  const dialogRef = useRef<HTMLDivElement | null>(null)
  const nameInputRef = useRef<HTMLInputElement | null>(null)
  const optionFocusRef = useRef<HTMLButtonElement | null>(null)
  const isRefreshingOptions = loading && options.length > 0
  const refreshingStatusId = 'candidate-stash-picker-refreshing-status'
  const preferredFocusUuid = selectedUuid ?? options[0]?.uuid ?? null
  const getInitialFocus = useCallback(() => optionFocusRef.current ?? nameInputRef.current, [])
  const handleKeyDown = useModalFocusTrap({
    panelRef: dialogRef,
    onClose,
    getInitialFocus,
  })

  return createPortal(
    <div className={styles.candidateModalBackdrop} role="presentation" onClick={onClose} {...drawerKeepOpenDataProps()}>
      <div
        ref={dialogRef}
        className={styles.candidateModal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="candidate-stash-picker-title"
        aria-describedby="candidate-stash-picker-description"
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <div className={styles.candidatePanel}>
          <div className={styles.candidateModalHeader}>
            <h4 id="candidate-stash-picker-title" className={styles.candidateModalTitle}>{KO.btnSelectCandidate}</h4>
            <p id="candidate-stash-picker-description" hidden>
              후보군을 선택하거나 이름과 비고를 입력해 새 후보군을 생성할 수 있습니다.
            </p>
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
          <div className={styles.candidateList} aria-busy={loading} aria-label="후보군 목록">
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
              <>
                {isRefreshingOptions && (
                  <p id={refreshingStatusId} className={styles.metaFilterActionHint} role="status" aria-live="polite">
                    후보군 목록을 갱신 중입니다. 갱신 중에는 기존 후보군을 선택할 수 없습니다.
                  </p>
                )}
                {options.map((row) => (
                  <button
                    key={row.uuid}
                    ref={row.uuid === preferredFocusUuid ? optionFocusRef : undefined}
                    type="button"
                    className={`${styles.candidateListItem} ${selectedUuid === row.uuid ? styles.candidateListItemActive : ''}`}
                    disabled={loading}
                    aria-describedby={isRefreshingOptions ? refreshingStatusId : undefined}
                    aria-current={selectedUuid === row.uuid ? 'true' : undefined}
                    onClick={() => onSelect(row)}
                  >
                    <div className={styles.candidateListItemTop}>
                      <span className={styles.candidateListItemName}>{row.name}</span>
                      {selectedUuid === row.uuid && <span className={styles.candidateListItemBadge}>선택됨</span>}
                    </div>
                    <span className={styles.candidateListItemMeta}>생성일 {formatDateTimeMinute(row.dbCreatedAt)}</span>
                    <span className={styles.candidateListItemDesc}>{row.note?.trim() ? row.note : KO.msgNoNote}</span>
                  </button>
                ))}
              </>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
