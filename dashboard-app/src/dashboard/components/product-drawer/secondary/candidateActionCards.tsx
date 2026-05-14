import styles from './secondaryDrawer.module.css'
import { KO } from '../ko'
import { LoadingSpinner } from '../../../../components/LoadingSpinner'
import type { SecondaryHelpId } from './secondaryDrawerTypes'
import type { usePortalHelpPopover } from '../../usePortalHelpPopover'
import { DeleteButton } from '../../DeleteButton'

/** 이너 후보 상세에서 드로어 연 경우: 후보군 선택 대신 저장·삭제 */
export type CandidateItemPanelContext = {
  stashName: string
  stashNote: string | null
  itemUuid: string
  onSaved?: () => void
  onRequestDeleteItem: () => void
}

type PortalHelpApi = ReturnType<typeof usePortalHelpPopover<SecondaryHelpId>>

type CandidateStashOrderActionCardProps = {
  selectedTitle: string
  selectedSub: string
  loading: boolean
  confirmDisabled?: boolean
  onOpenStashPicker: () => void | Promise<void>
  onConfirmOrder: () => void
  portalHelp: PortalHelpApi
  confirmOrderHelpId: string
}

/** 자사/경쟁사 분석 등: 후보군 선택 + 오더 담기 */
export function CandidateStashOrderActionCard({
  selectedTitle,
  selectedSub,
  loading,
  confirmDisabled = false,
  onOpenStashPicker,
  onConfirmOrder,
  portalHelp,
  confirmOrderHelpId,
}: CandidateStashOrderActionCardProps) {
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
        disabled={loading}
      >
        {loading ? <LoadingSpinner size="inline" label={KO.btnSelectCandidate} /> : KO.btnSelectCandidate}
      </button>
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
          disabled={loading || confirmDisabled}
          onFocus={() => portalHelp.open('confirmOrder', 'above')}
          onBlur={portalHelp.scheduleClose}
          aria-describedby={portalHelp.activeId === 'confirmOrder' ? confirmOrderHelpId : undefined}
        >
          {loading ? <LoadingSpinner size="inline" label={KO.btnConfirmOrder} /> : KO.btnConfirmOrder}
        </button>
      </span>
    </>
  )
}

type InnerCandidateActionCardProps = {
  context: CandidateItemPanelContext
  loading: boolean
  saveLabel: string
  onSave: () => void
}

type SnapshotInfoToggleCardProps = {
  hasSnapshot: boolean
  loading: boolean
  showSnapshotInfo: boolean
  onShowSnapshotInfoChange: (next: boolean) => void
}

export function SnapshotInfoToggleCard({
  hasSnapshot,
  loading,
  showSnapshotInfo,
  onShowSnapshotInfoChange,
}: SnapshotInfoToggleCardProps) {
  return (
    <label className={styles.snapshotInfoToggle}>
      <input
        type="checkbox"
        checked={showSnapshotInfo}
        disabled={!hasSnapshot || loading}
        onChange={(event) => onShowSnapshotInfoChange(event.target.checked)}
      />
      <span>{KO.labelSnapshotInfoToggle}</span>
    </label>
  )
}

/** 이너 후보 상세 드로어: 현재 후보군 + 변경 저장 + 삭제 */
export function InnerCandidateActionCard({
  context,
  loading,
  saveLabel,
  onSave,
}: InnerCandidateActionCardProps) {
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
        className={`${styles.btn} ${styles.innerCandidateActionBtn} ${styles.btnViewportAdaptive}`}
        onClick={() => void onSave()}
        disabled={loading}
      >
        {loading ? <LoadingSpinner size="inline" label={saveLabel} /> : saveLabel}
      </button>
      <span className={styles.innerCandidateDeleteBtn}>
        <DeleteButton
          aria-label="이 이너 후보 삭제"
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
