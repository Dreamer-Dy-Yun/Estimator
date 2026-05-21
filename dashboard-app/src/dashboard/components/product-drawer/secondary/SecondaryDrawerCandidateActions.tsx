import { useId, useState } from 'react'
import { ConfirmModal } from '../../ConfirmModal'
import type { usePortalHelpPopover } from '../../usePortalHelpPopover'
import type { CandidateItemPanelContext } from './candidateActionCards'
import { CandidateStashPickerModal } from './CandidateStashPickerModal'
import { SecondaryDrawerActionArea } from './SecondaryDrawerActionArea'
import styles from './secondaryDrawer.module.css'
import type { SecondaryHelpId } from './secondaryDrawerTypes'
import type { useSecondaryForecastModel } from './hooks/useSecondaryForecastModel'

type CandidateActions = ReturnType<typeof useSecondaryForecastModel>['candidateActions']

type Props = {
  candidateItemContext: CandidateItemPanelContext | null
  hasSavedSnapshot: boolean
  showingConfirmedValues: boolean
  candidateActions: CandidateActions
  onResetToLive: () => void
  onRestoreConfirmed: () => void
  portalHelp: ReturnType<typeof usePortalHelpPopover<SecondaryHelpId>>
  confirmOrderHelpId: string
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

  return (
    <>
      <div className={styles.metaFilterActionBlock}>
        <SecondaryDrawerActionArea
          candidateItemContext={candidateItemContext}
          hasSavedSnapshot={hasSavedSnapshot}
          showingConfirmedValues={showingConfirmedValues}
          candidateActions={candidateActions}
          onResetToLive={onResetToLive}
          onRestoreConfirmed={onRestoreConfirmed}
          onRequestUnconfirm={() => setUnconfirmOpen(true)}
          portalHelp={portalHelp}
          confirmOrderHelpId={confirmOrderHelpId}
        />
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
          await candidateActions.unconfirmCandidateItem()
          onResetToLive()
          setUnconfirmOpen(false)
        }}
      />
      {candidateActions.listOpen && (
        <CandidateStashPickerModal
          options={candidateActions.stashes}
          selectedUuid={candidateActions.selectedCandidate?.uuid ?? null}
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
