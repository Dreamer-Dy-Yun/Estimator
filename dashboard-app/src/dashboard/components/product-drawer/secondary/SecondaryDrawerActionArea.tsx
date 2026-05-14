import type { Dispatch, SetStateAction } from 'react'
import type { useSecondaryForecastModel } from './hooks/useSecondaryForecastModel'
import type { CandidateItemPanelContext } from './candidateActionCards'
import {
  CandidateStashOrderActionCard,
  InnerCandidateActionCard,
  SnapshotInfoToggleCard,
} from './candidateActionCards'
import { formatDateTimeMinute } from '../../../../utils/date'
import type { SecondaryHelpId } from './secondaryDrawerTypes'
import type { usePortalHelpPopover } from '../../usePortalHelpPopover'
import styles from './secondaryDrawer.module.css'

type Props = {
  candidateItemContext: CandidateItemPanelContext | null
  hasSavedSnapshot: boolean
  showSnapshotInfo: boolean
  onShowSnapshotInfoChange: Dispatch<SetStateAction<boolean>>
  candidateActions: ReturnType<typeof useSecondaryForecastModel>['candidateActions']
  portalHelp: ReturnType<typeof usePortalHelpPopover<SecondaryHelpId>>
  confirmOrderHelpId: string
}

export function SecondaryDrawerActionArea({
  candidateItemContext,
  hasSavedSnapshot,
  showSnapshotInfo,
  onShowSnapshotInfoChange,
  candidateActions,
  portalHelp,
  confirmOrderHelpId,
}: Props) {
  if (candidateItemContext != null) {
    return (
      <div className={styles.metaFilterActionSplit}>
        <div className={`${styles.card} ${styles.snapshotInfoCard}`}>
          <SnapshotInfoToggleCard
            hasSnapshot={hasSavedSnapshot}
            loading={candidateActions.loading}
            showSnapshotInfo={showSnapshotInfo}
            onShowSnapshotInfoChange={onShowSnapshotInfoChange}
          />
        </div>
        <div className={`${styles.card} ${styles.metaFilterActionCard}`}>
          <div className={`${styles.metaFilterActionGrid} ${styles.metaFilterActionGridCompact}`}>
            <InnerCandidateActionCard
              context={candidateItemContext}
              loading={candidateActions.loading}
              saveLabel={hasSavedSnapshot ? '수정' : '저장'}
              onSave={candidateActions.saveCandidateItemChanges}
            />
          </div>
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
