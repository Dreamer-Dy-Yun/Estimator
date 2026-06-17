import type { CandidateItemSummary, CandidateReferenceItemSummary, ProductComparisonTarget } from '../../../api'
import type { AppendRecommendedItemsResult } from './candidateStashDetailTypes'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { CandidateStashSummary } from '../../../api'
import { CandidateBulkDetailConfirmProgress as CandidateBulkDetailConfirmProgressView } from './CandidateBulkDetailConfirmProgress'
import { CandidateRecommendationModal } from './CandidateRecommendationModal'
import { CandidateStashBulkActionCard } from './CandidateStashBulkActionCard'
import { CandidateStashDataReferenceCard } from './CandidateStashDataReferenceCard'
import { CandidateStashDeleteDialogs } from './CandidateStashDeleteDialogs'
import { CandidateStashDetailBody } from './CandidateStashDetailBody'
import { CandidateStashDetailFilters } from './CandidateStashDetailFilters'
import { CandidateStashDetailHeader } from './CandidateStashDetailHeader'
import { CandidateStashMissingState } from './CandidateStashMissingState'
import { CandidateStashProductDrawer } from './CandidateStashProductDrawer'
import { stashDetailModalBackdropDataProps } from '../../drawer/drawerDom'
import { useModalFocusTrap } from '../useModalFocusTrap'
import { useCandidateStashDetailModal, type CandidateStashDetailModalModel, type InnerCandidateRow } from './useCandidateStashDetailModal'
import { useVisibleUuidSelection } from './useVisibleUuidSelection'
import detailStyles from './CandidateStashDetailModal.module.css'

export type Props = {
  stashUuid: string
  companyUuid?: string
  downloadUserName?: string
  /** Passing the list summary avoids one extra candidate-stash list request. */
  stashSummary?: CandidateStashSummary | null
  orderMetricComparisonTarget: ProductComparisonTarget | null
  orderMetricComparisonLoading: boolean
  onClose: () => void
  onStashesInvalidate?: () => void
}

export function CandidateStashDetailModal({
  stashUuid,
  companyUuid,
  downloadUserName = '사용자',
  stashSummary,
  orderMetricComparisonTarget,
  orderMetricComparisonLoading,
  onClose,
  onStashesInvalidate,
}: Props) : React.JSX.Element {
  const model: CandidateStashDetailModalModel = useCandidateStashDetailModal({
    stashUuid,
    companyUuid,
    stashSummary,
    onStashesInvalidate,
    orderMetricComparisonTarget,
    orderMetricComparisonLoading,
  })
  const [bulkDeleteOpen, setBulkDeleteOpen]: [boolean, React.Dispatch<React.SetStateAction<boolean>>] = useState(false)
  const [bulkUnconfirmOpen, setBulkUnconfirmOpen]: [boolean, React.Dispatch<React.SetStateAction<boolean>>] = useState(false)
  const [recommendationOpen, setRecommendationOpen]: [boolean, React.Dispatch<React.SetStateAction<boolean>>] = useState(false)
  const recommendationAutoSelectKeyRef: React.RefObject<string | null> = useRef<string | null>(null)
  const panelRef: React.RefObject<HTMLDivElement | null> = useRef<HTMLDivElement | null>(null)
  const visibleItemUuids: string[] = useMemo(() : string[] => model.tableRows.map((row: CandidateItemSummary) : string => row.uuid), [model.tableRows])
  const itemSelection: { selectedUuids: Set<string>; selectedVisibleUuids: string[]; selectedVisibleUuidSet: Set<string>; selectedVisibleCount: number; allVisibleSelected: boolean; partiallyVisibleSelected: boolean; selectAllRef: React.RefObject<HTMLInputElement | null>; toggleSelectedUuid: (uuid: string) => void; toggleAllVisibleUuids: () => void; replaceSelection: (uuids: string[]) => void; clearSelection: () => void; } = useVisibleUuidSelection(visibleItemUuids)
  const recommendationRows: CandidateReferenceItemSummary[] = model.recommendationItems
  const recommendationRowUuids: string[] = useMemo(() : string[] => recommendationRows.map((row: CandidateReferenceItemSummary) : string => row.uuid), [recommendationRows])
  const recommendationSelection: { selectedUuids: Set<string>; selectedVisibleUuids: string[]; selectedVisibleUuidSet: Set<string>; selectedVisibleCount: number; allVisibleSelected: boolean; partiallyVisibleSelected: boolean; selectAllRef: React.RefObject<HTMLInputElement | null>; toggleSelectedUuid: (uuid: string) => void; toggleAllVisibleUuids: () => void; replaceSelection: (uuids: string[]) => void; clearSelection: () => void; } = useVisibleUuidSelection(recommendationRowUuids)
  const recommendationsBlocked: boolean = Boolean(model.candidateItemsLoadError)
  const selectedItemUuidsByConfirmation: { confirmed: string[]; unconfirmed: string[]; } = useMemo(() : { confirmed: string[]; unconfirmed: string[]; } => {
    const selected: Set<string> = itemSelection.selectedVisibleUuidSet
    return model.tableRows.reduce((acc: { confirmed: string[]; unconfirmed: string[]; }, row: CandidateItemSummary) : { confirmed: string[]; unconfirmed: string[]; } => {
      if (selected.has(row.uuid)) acc[row.isDetailConfirmed ? 'confirmed' : 'unconfirmed'].push(row.uuid)
      return acc
    }, { confirmed: [] as string[], unconfirmed: [] as string[] })
  }, [itemSelection.selectedVisibleUuidSet, model.tableRows])
  const competitorSalesQtyHeader: string = useMemo(() : string => {
    const uniqueLabels: string[] = [...new Set(model.tableRows.map((row: CandidateItemSummary) : string => row.insight.competitorChannelLabel.trim()).filter(Boolean))]
    return uniqueLabels.length === 1 ? `${uniqueLabels[0]} 기간 총 판매량` : '경쟁사 기간 총 판매량'
  }, [model.tableRows])
  const nestedModalOpen: boolean = Boolean(recommendationOpen || bulkDeleteOpen || bulkUnconfirmOpen || model.drawerOpen || model.drawerClosing || model.itemDeleteTarget || model.bulkConfirmProgress)
  const handlePanelKeyDown: (event: React.KeyboardEvent<HTMLDivElement>) => void = useModalFocusTrap({
    panelRef,
    onClose,
    trapDisabled: nestedModalOpen,
    onEscape: () : boolean => {
      if (!model.drawerOpen && !model.drawerClosing) return nestedModalOpen
      model.closeDrawer()
      return true
    },
  })

  useEffect(() : void => {
    if (!recommendationOpen || !recommendationRowUuids.length) return
    const recommendationKey: string = recommendationRowUuids.join('|')
    if (recommendationAutoSelectKeyRef.current === recommendationKey) return
    recommendationAutoSelectKeyRef.current = recommendationKey
    recommendationSelection.replaceSelection(recommendationRowUuids)
  }, [recommendationOpen, recommendationRowUuids, recommendationSelection])

  const handleActionFailureAlreadyReported: () => undefined = () : undefined => undefined
  const openRecommendationModal: () => void = () : void => {
    if (!recommendationsBlocked) {
      recommendationAutoSelectKeyRef.current = null
      setRecommendationOpen(true)
    }
  }
  const applyRecommendations: () => void = () : void => {
    if (model.recommendationAppendBusy) return
    const selectedRows: CandidateReferenceItemSummary[] = recommendationRows.filter((row: CandidateReferenceItemSummary) : boolean => recommendationSelection.selectedVisibleUuidSet.has(row.uuid))
    void model.appendRecommendedItems(selectedRows).then((result: AppendRecommendedItemsResult) : void => {
      if (result.status !== 'applied') return
      recommendationSelection.clearSelection()
      itemSelection.clearSelection()
      setRecommendationOpen(false)
    }).catch(handleActionFailureAlreadyReported)
  }
  const toggleItemDrawer: (row: InnerCandidateRow) => void = (row: InnerCandidateRow) : void => {
    if (model.drawerOpen && model.openedItemUuid === row.uuid) model.closeDrawer()
    else void model.openItemDrawer(row, { companyUuid })
  }

  return (
    <>
      <div className={detailStyles.stashDetailModalBackdrop} onClick={onClose} role="presentation" {...stashDetailModalBackdropDataProps(model.drawerOpen, model.drawerClosing)}>
        <div ref={panelRef} className={detailStyles.stashDetailModalPanel} onClick={(event: React.MouseEvent<HTMLDivElement, MouseEvent>) : void => event.stopPropagation()} onKeyDown={handlePanelKeyDown} role="dialog" aria-modal="true" aria-labelledby="stash-detail-modal-title" tabIndex={-1}>
          <div className={detailStyles.stashDetailModalBody}>
            {!model.detailTarget ? <CandidateStashMissingState loadError={model.stashListLoadError} onClose={onClose} /> : (
              <>
                {model.stashListLoadError && <div className={detailStyles.emptyState} role="alert">{model.stashListLoadError}</div>}
                <CandidateStashDetailHeader
                  detailTarget={model.detailTarget}
                  canOpenRecommendations={Boolean(!recommendationsBlocked && !model.candidateItemsLoading && model.tableRows.length && model.periodStart && model.periodEnd)}
                  onOpenRecommendations={openRecommendationModal}
                  onClose={onClose}
                />
                <div className={detailStyles.detailActionCardGrid}>
                  <CandidateStashDataReferenceCard periodStart={model.draftDataReferencePeriodStart} periodEnd={model.draftDataReferencePeriodEnd} loading={model.candidateItemsLoading} queryDirty={model.dataReferencePeriodQueryDirty} onPeriodStartChange={model.onDataReferencePeriodStartChange} onPeriodEndChange={model.onDataReferencePeriodEndChange} onSearch={model.applyDataReferencePeriod} />
                  <CandidateStashBulkActionCard selectedVisibleCount={itemSelection.selectedVisibleCount} selectedUnconfirmedCount={selectedItemUuidsByConfirmation.unconfirmed.length} selectedConfirmedCount={selectedItemUuidsByConfirmation.confirmed.length} bulkConfirmBusy={model.bulkConfirmBusy} onOpenBulkUnconfirm={() : void => setBulkUnconfirmOpen(true)} onOpenBulkDelete={() : void => setBulkDeleteOpen(true)} onBulkConfirm={() : void => {
                    void model.confirmBulkDetailItems(selectedItemUuidsByConfirmation.unconfirmed).then(() : void => itemSelection.clearSelection()).catch(handleActionFailureAlreadyReported)
                  }} />
                </div>
                <CandidateStashDetailFilters model={model} downloadUserName={downloadUserName} />
                <CandidateStashDetailBody model={model} visibleItemUuids={visibleItemUuids} selectedUuidSet={itemSelection.selectedVisibleUuidSet} allVisibleSelected={itemSelection.allVisibleSelected} selectAllRef={itemSelection.selectAllRef} competitorSalesQtyHeader={competitorSalesQtyHeader} activeSortKey={model.tableSort?.key ?? null} activeSortDir={model.tableSort?.dir ?? null} keyboardNavigationDisabled={Boolean(recommendationOpen || bulkDeleteOpen || bulkUnconfirmOpen || model.itemDeleteTarget)} onToggleAllVisibleItems={itemSelection.toggleAllVisibleUuids} onToggleSelectedItem={itemSelection.toggleSelectedUuid} onToggleItemDrawer={toggleItemDrawer} />
              </>
            )}
          </div>
        </div>
      </div>

      {recommendationOpen && <CandidateRecommendationModal rows={recommendationRows} loading={model.recommendationLoading} applying={model.recommendationAppendBusy} error={model.recommendationError} selectedUuids={recommendationSelection.selectedVisibleUuidSet} onClose={() : void => setRecommendationOpen(false)} onToggleAll={recommendationSelection.toggleAllVisibleUuids} onToggleItem={recommendationSelection.toggleSelectedUuid} onApply={applyRecommendations} />}
      <CandidateStashProductDrawer model={model} bulkDeleteOpen={bulkDeleteOpen || bulkUnconfirmOpen || recommendationOpen} />
      <CandidateBulkDetailConfirmProgressView progress={model.bulkConfirmProgress} onClose={model.closeBulkConfirmProgress} />
      <CandidateStashDeleteDialogs
        model={model}
        bulkDeleteOpen={bulkDeleteOpen}
        bulkUnconfirmOpen={bulkUnconfirmOpen}
        selectedVisibleItemUuids={itemSelection.selectedVisibleUuids}
        selectedConfirmedItemUuids={selectedItemUuidsByConfirmation.confirmed}
        onCloseBulkDelete={() : void => setBulkDeleteOpen(false)}
        onCloseBulkUnconfirm={() : void => setBulkUnconfirmOpen(false)}
        onBulkDeleteDone={() : void => {
          itemSelection.clearSelection()
          setBulkDeleteOpen(false)
        }}
        onBulkUnconfirmDone={() : void => {
          itemSelection.clearSelection()
          setBulkUnconfirmOpen(false)
        }}
      />
    </>
  )
}
