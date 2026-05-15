import type { useSecondaryForecastModel } from './hooks/useSecondaryForecastModel'
import type { CandidateItemPanelContext } from './candidateActionCards'
import {
  CandidateStashOrderActionCard,
  InnerCandidateActionCard,
} from './candidateActionCards'
import { formatDateTimeMinute } from '../../../../utils/date'
import type { SecondaryHelpId } from './secondaryDrawerTypes'
import type { usePortalHelpPopover } from '../../usePortalHelpPopover'
import styles from './secondaryDrawer.module.css'

type Props = {
  candidateItemContext: CandidateItemPanelContext | null
  hasSavedSnapshot: boolean
  showingConfirmedValues: boolean
  candidateActions: ReturnType<typeof useSecondaryForecastModel>['candidateActions']
  onResetToLive: () => void
  onRestoreConfirmed: () => void
  onRequestUnconfirm: () => void
  portalHelp: ReturnType<typeof usePortalHelpPopover<SecondaryHelpId>>
  confirmOrderHelpId: string
}

export function SecondaryDrawerActionArea({
  candidateItemContext,
  hasSavedSnapshot,
  showingConfirmedValues,
  candidateActions,
  onResetToLive,
  onRestoreConfirmed,
  onRequestUnconfirm,
  portalHelp,
  confirmOrderHelpId,
}: Props) {
  if (candidateItemContext != null) {
    return (
      <div className={`${styles.card} ${styles.metaFilterActionCard}`}>
        <div className={`${styles.metaFilterActionGrid} ${styles.metaFilterActionGridCompact}`}>
          <InnerCandidateActionCard
            context={candidateItemContext}
            loading={candidateActions.loading}
            confirmed={hasSavedSnapshot}
            showingConfirmedValues={showingConfirmedValues}
            canRestoreConfirmed={Boolean(candidateItemContext.confirmedSnapshot)}
            onReset={onResetToLive}
            onRestoreConfirmed={onRestoreConfirmed}
            onToggleConfirm={hasSavedSnapshot ? onRequestUnconfirm : candidateActions.confirmCandidateItem}
          />
        </div>
      </div>
    )
  }

  return (
    <div className={`${styles.card} ${styles.metaFilterActionCard}`}>
      <div className={styles.metaFilterActionGrid}>
        <CandidateStashOrderActionCard
          selectedTitle={candidateActions.selectedCandidate?.name ?? '-'}
          selectedSub={
            candidateActions.selectedCandidate?.dbCreatedAt
              ? formatDateTimeMinute(candidateActions.selectedCandidate.dbCreatedAt)
              : '-'
          }
          loading={candidateActions.loading}
          confirmDisabled={candidateActions.selectedCandidate == null}
          onOpenStashPicker={candidateActions.openPicker}
          onConfirmOrder={candidateActions.confirmOrder}
          portalHelp={portalHelp}
          confirmOrderHelpId={confirmOrderHelpId}
        />
      </div>
    </div>
  )
}
