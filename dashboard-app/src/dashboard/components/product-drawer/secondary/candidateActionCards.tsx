import styles from './secondaryDrawer.module.css'
import { KO } from '../ko'
import { LoadingSpinner } from '../../../../components/LoadingSpinner'
import type { CandidateItemDetail } from '../../../../api'
import type { OrderSnapshotDocumentV1 } from '../../../../snapshot/orderSnapshotTypes'
import type { SecondaryHelpId } from './secondaryDrawerTypes'
import type { usePortalHelpPopover } from '../../usePortalHelpPopover'
import { DeleteButton } from '../../DeleteButton'

/** 후보군 아이템 상세에서 열린 경우: 후보군 선택 대신 저장/확정 액션을 표시한다. */
export type CandidateItemPanelContext = {
  stashName: string
  stashNote: string | null
  itemUuid: string
  isDetailConfirmed: boolean
  confirmedSnapshot?: OrderSnapshotDocumentV1 | null
  hydrateSnapshotSource?: 'confirmed' | 'live' | null
  onDraftChange?: (snapshot: OrderSnapshotDocumentV1, source: 'confirmed' | 'live') => void
  onResetDraft?: () => void
  onRestoreConfirmed?: () => void
  onConfirmed?: (snapshot: OrderSnapshotDocumentV1, updatedItem: CandidateItemDetail) => void
  onUnconfirmed?: (updatedItem: CandidateItemDetail) => void
  onSaved?: () => void
  onRequestDeleteItem: () => void
}

type PortalHelpApi = ReturnType<typeof usePortalHelpPopover<SecondaryHelpId>>

type CandidateStashOrderActionCardProps = {
  selectedTitle: string
  selectedSub: string
  loading: boolean
  confirmDisabled?: boolean
  scopeBlocked: boolean
  scopeBlockReason: string
  onOpenStashPicker: () => void | Promise<void>
  onConfirmOrder: () => void | Promise<boolean>
  portalHelp: PortalHelpApi
  confirmOrderHelpId: string
}

/** 회사/기간 분석에서 후보군 선택 + 오더 저장 액션을 표시한다. */
export function CandidateStashOrderActionCard({
  selectedTitle,
  selectedSub,
  loading,
  confirmDisabled = false,
  scopeBlocked,
  scopeBlockReason,
  onOpenStashPicker,
  onConfirmOrder,
  portalHelp,
  confirmOrderHelpId,
}: CandidateStashOrderActionCardProps) {
  const pickerDisabled = loading || scopeBlocked
  const orderDisabled = loading || scopeBlocked || confirmDisabled
  const pickerDisabledReason = scopeBlocked ? scopeBlockReason : undefined
  const orderDisabledReason = scopeBlocked
    ? scopeBlockReason
    : confirmDisabled
      ? '후보군을 먼저 선택해 주세요.'
      : undefined

  return (
    <>
      <div className={styles.metaFilterSelectedInfo}>
        <span className={styles.metaFilterSelectedTitle}>{selectedTitle}</span>
        <span className={styles.metaFilterSelectedSub}>{selectedSub}</span>
      </div>
      <button
        type="button"
        className={`${styles.btn} ${styles.btnSecondary} ${styles.btnViewportAdaptive}`}
        onClick={() => void onOpenStashPicker()}
        disabled={pickerDisabled}
        title={pickerDisabledReason}
        aria-describedby={pickerDisabledReason ? 'candidate-picker-disabled-reason' : undefined}
      >
        {loading ? <LoadingSpinner size="inline" label={KO.btnSelectCandidate} /> : KO.btnSelectCandidate}
      </button>
      {pickerDisabledReason ? (
        <span id="candidate-picker-disabled-reason" className={styles.srOnly}>
          {pickerDisabledReason}
        </span>
      ) : null}
      <span
        ref={portalHelp.setAnchor('confirmOrder')}
        className={styles.confirmOrderHelpAnchor}
        onMouseEnter={() => portalHelp.open('confirmOrder', 'above')}
        onMouseLeave={portalHelp.scheduleClose}
      >
        <button
          type="button"
          className={`${styles.btn} ${styles.btnViewportAdaptive}`}
          onClick={onConfirmOrder}
          disabled={orderDisabled}
          title={orderDisabledReason}
          onFocus={() => portalHelp.open('confirmOrder', 'above')}
          onBlur={portalHelp.scheduleClose}
          aria-describedby={
            orderDisabledReason
              ? 'candidate-order-disabled-reason'
              : portalHelp.activeId === 'confirmOrder'
                ? confirmOrderHelpId
                : undefined
          }
        >
          {loading ? <LoadingSpinner size="inline" label={KO.btnConfirmOrder} /> : KO.btnConfirmOrder}
        </button>
      </span>
      {orderDisabledReason ? (
        <span id="candidate-order-disabled-reason" className={styles.srOnly}>
          {orderDisabledReason}
        </span>
      ) : null}
    </>
  )
}

type InnerCandidateActionCardProps = {
  context: CandidateItemPanelContext
  loading: boolean
  confirmed: boolean
  showingConfirmedValues: boolean
  canRestoreConfirmed: boolean
  scopeBlocked: boolean
  scopeBlockReason: string
  onReset: () => void
  onRestoreConfirmed: () => void
  onToggleConfirm: () => void
}

/** 후보군 아이템 상세 플로우에서 현재 후보군 + 변경 저장 + 삭제 액션을 표시한다. */
export function InnerCandidateActionCard({
  context,
  loading,
  confirmed,
  showingConfirmedValues,
  canRestoreConfirmed,
  scopeBlocked,
  scopeBlockReason,
  onReset,
  onRestoreConfirmed,
  onToggleConfirm,
}: InnerCandidateActionCardProps) {
  const confirmLabel = confirmed ? KO.btnUnconfirmCandidateDetail : KO.btnConfirmCandidateDetail
  const resetRestoreLabel = showingConfirmedValues ? KO.btnResetCandidateDraft : KO.btnRestoreConfirmedCandidateDraft
  const confirmDisabledReason = scopeBlocked ? scopeBlockReason : undefined

  return (
    <>
      <div className={styles.metaFilterSelectedInfo}>
        <span className={styles.metaFilterSelectedTitle}>{context.stashName}</span>
        <span className={styles.metaFilterSelectedSub}>
          {context.stashNote?.trim() ? context.stashNote : KO.msgNoNote}
        </span>
      </div>
      <button
        type="button"
        className={`${styles.btn} ${styles.btnSecondary} ${styles.innerCandidateActionBtn} ${styles.btnViewportAdaptive}`}
        onClick={() => void (showingConfirmedValues ? onReset() : onRestoreConfirmed())}
        disabled={loading || (!showingConfirmedValues && !canRestoreConfirmed)}
      >
        {resetRestoreLabel}
      </button>
      <button
        type="button"
        className={`${styles.btn} ${styles.innerCandidateActionBtn} ${confirmed ? styles.innerCandidateUnconfirmBtn : ''} ${styles.btnViewportAdaptive}`}
        onClick={() => void onToggleConfirm()}
        disabled={loading || scopeBlocked}
        title={confirmDisabledReason}
        aria-describedby={confirmDisabledReason ? 'inner-candidate-confirm-disabled-reason' : undefined}
      >
        {loading ? <LoadingSpinner size="inline" label={confirmLabel} /> : confirmLabel}
      </button>
      {confirmDisabledReason ? (
        <span id="inner-candidate-confirm-disabled-reason" className={styles.srOnly}>
          {confirmDisabledReason}
        </span>
      ) : null}
      <span className={styles.innerCandidateDeleteBtn}>
        <DeleteButton
          aria-label="후보군 아이템 삭제"
          title={KO.btnDelete}
          disabled={loading}
          onClick={(e) => {
            e.stopPropagation()
            context.onRequestDeleteItem()
          }}
        />
      </span>
    </>
  )
}
