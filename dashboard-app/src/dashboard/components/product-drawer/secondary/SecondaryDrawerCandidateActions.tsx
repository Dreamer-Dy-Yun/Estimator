import { useId, useState } from 'react'
import { LoadingSpinner } from '../../../../components/LoadingSpinner'
import { formatDateTimeMinute } from '../../../../utils/date'
import { ConfirmModal } from '../../ConfirmModal'
import { DeleteButton } from '../../DeleteButton'
import type { usePortalHelpPopover } from '../../usePortalHelpPopover'
import { KO } from '../ko'
import { CandidateStashPickerModal } from './CandidateStashPickerModal'
import styles from './secondaryDrawer.module.css'
import type { CandidateItemPanelContext, SecondaryHelpId } from './secondaryDrawerTypes'
import type { useSecondaryForecastModel } from './hooks/useSecondaryForecastModel'

type CandidateActions = ReturnType<typeof useSecondaryForecastModel>['candidateActions']
type PortalHelpApi = ReturnType<typeof usePortalHelpPopover<SecondaryHelpId>>

type Props = {
  candidateItemContext: CandidateItemPanelContext | null
  hasSavedSnapshot: boolean
  showingConfirmedValues: boolean
  candidateActions: CandidateActions
  onResetToLive: () => void
  onRestoreConfirmed: () => void
  portalHelp: PortalHelpApi
  confirmOrderHelpId: string
}

function DisabledReason({ id, reason }: { id: string; reason?: string }) {
  return reason ? <span id={id} className={styles.srOnly}>{reason}</span> : null
}

export function SecondaryDrawerCandidateActions({
  candidateItemContext,
  hasSavedSnapshot,
  showingConfirmedValues,
  candidateActions,
  onResetToLive,
  onRestoreConfirmed,
  portalHelp,
  confirmOrderHelpId,
}: Props) {
  const [unconfirmOpen, setUnconfirmOpen] = useState(false)
  const unconfirmDialogTitleId = useId()
  const scopeReason = candidateActions.companyScopeBlocked ? candidateActions.companyScopeBlockReason : undefined
  const selectedCandidate = candidateActions.selectedCandidate
  const orderDisabledReason = scopeReason ?? (selectedCandidate == null ? '후보군을 먼저 선택해 주세요.' : undefined)
  const confirmLabel = hasSavedSnapshot ? KO.btnUnconfirmCandidateDetail : KO.btnConfirmCandidateDetail
  const resetRestoreLabel = showingConfirmedValues ? KO.btnResetCandidateDraft : KO.btnRestoreConfirmedCandidateDraft
  const actionGridClassName = `${styles.metaFilterActionGrid} ${candidateItemContext ? styles.metaFilterActionGridCompact : ''}`

  return (
    <>
      <div className={styles.metaFilterActionBlock}>
        <div className={`${styles.card} ${styles.metaFilterActionCard}`}>
          <div className={actionGridClassName}>
            {candidateItemContext ? (
              <>
                <div className={styles.metaFilterSelectedInfo}>
                  <span className={styles.metaFilterSelectedTitle}>{candidateItemContext.stashName}</span>
                  <span className={styles.metaFilterSelectedSub}>
                    {candidateItemContext.stashNote?.trim() ? candidateItemContext.stashNote : KO.msgNoNote}
                  </span>
                </div>
                <button
                  type="button"
                  className={`${styles.btn} ${styles.btnSecondary} ${styles.innerCandidateActionBtn} ${styles.btnViewportAdaptive}`}
                  onClick={() => void (showingConfirmedValues ? onResetToLive() : onRestoreConfirmed())}
                  disabled={candidateActions.loading || (!showingConfirmedValues && !candidateItemContext.confirmedSnapshot)}
                >
                  {resetRestoreLabel}
                </button>
                <button
                  type="button"
                  className={`${styles.btn} ${styles.innerCandidateActionBtn} ${hasSavedSnapshot ? styles.innerCandidateUnconfirmBtn : ''} ${styles.btnViewportAdaptive}`}
                  onClick={() => void (hasSavedSnapshot ? setUnconfirmOpen(true) : candidateActions.confirmCandidateItem())}
                  disabled={candidateActions.loading || candidateActions.companyScopeBlocked}
                  title={scopeReason}
                  aria-describedby={scopeReason ? 'inner-candidate-confirm-disabled-reason' : undefined}
                >
                  {candidateActions.loading ? <LoadingSpinner size="inline" label={confirmLabel} /> : confirmLabel}
                </button>
                <DisabledReason id="inner-candidate-confirm-disabled-reason" reason={scopeReason} />
                <span className={styles.innerCandidateDeleteBtn}>
                  <DeleteButton
                    aria-label="후보군 아이템 삭제"
                    title={KO.btnDelete}
                    disabled={candidateActions.loading}
                    onClick={(event) => {
                      event.stopPropagation()
                      candidateItemContext.onRequestDeleteItem()
                    }}
                  />
                </span>
              </>
            ) : (
              <>
                <div className={styles.metaFilterSelectedInfo}>
                  <span className={styles.metaFilterSelectedTitle}>{selectedCandidate?.name ?? '-'}</span>
                  <span className={styles.metaFilterSelectedSub}>
                    {selectedCandidate?.dbCreatedAt ? formatDateTimeMinute(selectedCandidate.dbCreatedAt) : '-'}
                  </span>
                </div>
                <button
                  type="button"
                  className={`${styles.btn} ${styles.btnSecondary} ${styles.btnViewportAdaptive}`}
                  onClick={() => void candidateActions.openPicker()}
                  disabled={candidateActions.loading || candidateActions.companyScopeBlocked}
                  title={scopeReason}
                  aria-describedby={scopeReason ? 'candidate-picker-disabled-reason' : undefined}
                >
                  {candidateActions.loading ? <LoadingSpinner size="inline" label={KO.btnSelectCandidate} /> : KO.btnSelectCandidate}
                </button>
                <DisabledReason id="candidate-picker-disabled-reason" reason={scopeReason} />
                <span
                  ref={portalHelp.setAnchor('confirmOrder')}
                  className={styles.confirmOrderHelpAnchor}
                  onMouseEnter={() => portalHelp.open('confirmOrder', 'above')}
                  onMouseLeave={portalHelp.scheduleClose}
                >
                  <button
                    type="button"
                    className={`${styles.btn} ${styles.btnViewportAdaptive}`}
                    onClick={candidateActions.confirmOrder}
                    disabled={candidateActions.loading || candidateActions.companyScopeBlocked || selectedCandidate == null}
                    title={orderDisabledReason}
                    onFocus={() => portalHelp.open('confirmOrder', 'above')}
                    onBlur={portalHelp.scheduleClose}
                    aria-describedby={orderDisabledReason ? 'candidate-order-disabled-reason' : portalHelp.activeId === 'confirmOrder' ? confirmOrderHelpId : undefined}
                  >
                    {candidateActions.loading ? <LoadingSpinner size="inline" label={KO.btnConfirmOrder} /> : KO.btnConfirmOrder}
                  </button>
                </span>
                <DisabledReason id="candidate-order-disabled-reason" reason={orderDisabledReason} />
              </>
            )}
          </div>
        </div>
      </div>
      <ConfirmModal
        open={unconfirmOpen}
        busy={candidateActions.loading}
        title="상세확정 해제"
        message="저장된 2차 후보군 아이템의 상세확정을 해제하고 상세미확정 상태로 되돌립니다. 진행하면 현재 DB 아이템의 상세 스냅샷이 비워집니다."
        confirmText="확정 해제"
        confirmingText="해제 중"
        dialogTitleId={unconfirmDialogTitleId}
        keepOpenAttr
        onCancel={() => setUnconfirmOpen(false)}
        onConfirm={async () => {
          const unconfirmed = await candidateActions.unconfirmCandidateItem()
          if (!unconfirmed) return
          onResetToLive()
          setUnconfirmOpen(false)
        }}
      />
      {candidateActions.listOpen && (
        <CandidateStashPickerModal
          options={candidateActions.stashes}
          selectedUuid={selectedCandidate?.uuid ?? null}
          nameInput={candidateActions.nameInput}
          noteInput={candidateActions.noteInput}
          loading={candidateActions.loading}
          onNameInputChange={candidateActions.setNameInput}
          onNoteInputChange={candidateActions.setNoteInput}
          onCreate={() => void candidateActions.createCandidate()}
          onClose={() => candidateActions.setListOpen(false)}
          onSelect={candidateActions.selectCandidate}
        />
      )}
    </>
  )
}
