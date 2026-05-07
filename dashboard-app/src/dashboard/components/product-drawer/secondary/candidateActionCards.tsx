import styles from './secondaryDrawer.module.css'
import { KO } from '../ko'
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
        {KO.btnSelectCandidate}
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
          {KO.btnConfirmOrder}
        </button>
      </span>
    </>
  )
}

type InnerCandidateActionCardProps = {
  context: CandidateItemPanelContext
  loading: boolean
  onSave: () => void
}

/** 이너 후보 상세 드로어: 현재 후보군 + 변경 저장 + 삭제 */
export function InnerCandidateActionCard({ context, loading, onSave }: InnerCandidateActionCardProps) {
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
        {KO.btnSaveCandidateChanges}
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
