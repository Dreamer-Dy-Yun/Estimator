import type { CandidateMetricReloadOptions } from './useCandidateItemsLoader'
import type { DrawerSnapshotSource, OpenItemDrawerOptions } from './useCandidateStashItemDrawer'
import type { CandidateItemDetail, CandidateItemSummary, CandidateReferenceItemSummary, ProductDrawerBundle } from '../../../api'
import type { OrderSnapshotDocumentV2 } from '../../../api/types'
import type { ProductPrimarySummary } from '../../../types'
import type { AdjacentDirection } from '../../../utils/adjacentListNavigation'
import type { AppendRecommendedItemsResult, InnerCandidateSortKey, InnerCandidateSortState } from './candidateStashDetailTypes'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { CandidateStashSummary } from '../../../api'
import { CandidateBulkDetailConfirmProgress as CandidateBulkDetailConfirmProgressView } from './CandidateBulkDetailConfirmProgress'
import type { CandidateBulkDetailConfirmProgress } from './useCandidateBulkDetailConfirm'
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
import { useCandidateStashDetailModal, type InnerCandidateRow } from './useCandidateStashDetailModal'
import { useVisibleUuidSelection } from './useVisibleUuidSelection'
import detailStyles from './CandidateStashDetailModal.module.css'

export type Props = {
  stashUuid: string
  companyUuid?: string
  downloadUserName?: string
  /** Passing the list summary avoids one extra candidate-stash list request. */
  stashSummary?: CandidateStashSummary | null
  onClose: () => void
  onStashesInvalidate?: () => void
}

export function CandidateStashDetailModal({ stashUuid, companyUuid, downloadUserName = '사용자', stashSummary, onClose, onStashesInvalidate }: Props) : React.JSX.Element {
  const model: { companyUuid: string | undefined; items: CandidateItemSummary[]; candidateItemsLoading: boolean; candidateItemsLoadError: string | null; dataReferencePeriodStart: string; dataReferencePeriodEnd: string; periodStart: string | undefined; periodEnd: string | undefined; itemDeleteTarget: CandidateItemSummary | null; detailTarget: CandidateStashSummary | null; stashListLoadError: string | null; setItemDeleteTarget: React.Dispatch<React.SetStateAction<CandidateItemSummary | null>>; markDrawerSnapshotConfirmed: (itemUuid: string, snapshot: OrderSnapshotDocumentV2, updatedItem: CandidateItemDetail) => void; markDrawerSnapshotUnconfirmed: (itemUuid: string, updatedItem: CandidateItemDetail) => void; loadItems: (nextPeriodStart?: string, nextPeriodEnd?: string, options?: CandidateMetricReloadOptions) => Promise<void>; refreshStashes: () => Promise<void>; confirmDeleteItem: () => Promise<void>; recommendationItems: CandidateReferenceItemSummary[]; recommendationLoading: boolean; recommendationAppendBusy: boolean; recommendationError: string | null; clearRecommendationItems: () => void; loadRecommendations: (force?: boolean) => Promise<CandidateReferenceItemSummary[]>; appendRecommendedItems: (rows: CandidateReferenceItemSummary[]) => Promise<AppendRecommendedItemsResult>; bulkConfirmBusy: boolean; bulkConfirmProgress: CandidateBulkDetailConfirmProgress | null; closeBulkConfirmProgress: () => void; confirmBulkDetailItems: (itemUuids: string[]) => Promise<void>; itemDeleteBusy: boolean; bulkDeleteBusy: boolean; bulkUnconfirmBusy: boolean; orderExportBusy: boolean; orderExportError: string | null; confirmDeleteItems: (itemUuids: string[]) => Promise<void>; confirmUnconfirmItems: (itemUuids: string[]) => Promise<void>; downloadOrderExcel: (userName: string) => Promise<void>; brandQuery: string; setBrandQuery: React.Dispatch<React.SetStateAction<string>>; codeQuery: string; setCodeQuery: React.Dispatch<React.SetStateAction<string>>; productNameQuery: string; setProductNameQuery: React.Dispatch<React.SetStateAction<string>>; tableSort: InnerCandidateSortState | null; toggleTableSort: (key: InnerCandidateSortKey) => void; resetTableSort: () => void; brandOptions: string[]; codeOptions: string[]; productNameOptions: string[]; tableRows: CandidateItemSummary[]; totals: { qty: number; expectedOrderAmount: number; expectedSalesAmount: number; expectedOpProfit: number; }; pendingOrderMetricCount: number; totalExpectedOpProfitRatePct: number | null; draftDataReferencePeriodStart: string; draftDataReferencePeriodEnd: string; dataReferencePeriodQueryDirty: boolean; onDataReferencePeriodStartChange: (value: string) => void; onDataReferencePeriodEndChange: (value: string) => void; applyDataReferencePeriod: () => void; drawerOpen: boolean; drawerClosing: boolean; drawerError: string | null; openedItemUuid: string | null; hydrateSnap: OrderSnapshotDocumentV2 | null; hydrateSnapSource: DrawerSnapshotSource | null; confirmedHydrateSnap: OrderSnapshotDocumentV2 | null; fc: number; bundle: ProductDrawerBundle | null; mergedSummary: ProductPrimarySummary | null; openItemDrawer: (row: InnerCandidateRow, options?: OpenItemDrawerOptions) => Promise<void>; onRequestNavigateAdjacent: (direction: AdjacentDirection) => Promise<void>; closeDrawer: () => void; onDrawerForecastMonthsChange: (n: number) => void; saveDrawerDraftSnapshot: (itemUuid: string, snapshot: OrderSnapshotDocumentV2, source: DrawerSnapshotSource) => void; clearDrawerDraftSnapshot: (itemUuid: string) => void; restoreDrawerConfirmedSnapshot: (itemUuid: string) => void; } = useCandidateStashDetailModal({ stashUuid, companyUuid, stashSummary, onStashesInvalidate })
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
                <CandidateStashDetailHeader detailTarget={model.detailTarget} canOpenRecommendations={Boolean(!recommendationsBlocked && !model.candidateItemsLoading && model.tableRows.length && model.periodStart && model.periodEnd)} onOpenRecommendations={openRecommendationModal} onClose={onClose} />
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
