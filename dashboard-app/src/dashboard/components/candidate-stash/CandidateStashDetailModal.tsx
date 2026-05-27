import { useEffect, useMemo, useRef, useState } from 'react'
import type { CandidateStashSummary } from '../../../api'
import { CandidateBulkDetailConfirmProgress } from './CandidateBulkDetailConfirmProgress'
import { CandidateRecommendationModal } from './CandidateRecommendationModal'
import { CandidateStashBulkActionCard } from './CandidateStashBulkActionCard'
import { CandidateStashDataReferenceCard } from './CandidateStashDataReferenceCard'
import { CandidateStashDeleteDialogs } from './CandidateStashDeleteDialogs'
import { CandidateStashDetailBody } from './CandidateStashDetailBody'
import { CandidateStashDetailFilters } from './CandidateStashDetailFilters'
import { CandidateStashDetailHeader } from './CandidateStashDetailHeader'
import { CandidateStashMissingState } from './CandidateStashMissingState'
import { CandidateStashProductDrawer } from './CandidateStashProductDrawer'
import { useModalFocusTrap } from '../useModalFocusTrap'
import { useCandidateStashDetailModal, type InnerCandidateRow } from './useCandidateStashDetailModal'
import { useVisibleUuidSelection } from './useVisibleUuidSelection'
import detailStyles from './CandidateStashDetailModal.module.css'

type Props = {
  stashUuid: string
  companyUuid?: string
  downloadUserName?: string
  /** Passing the list summary avoids one extra candidate-stash list request. */
  stashSummary?: CandidateStashSummary | null
  onClose: () => void
  onStashesInvalidate?: () => void
}

export function CandidateStashDetailModal({ stashUuid, companyUuid, downloadUserName = '사용자', stashSummary, onClose, onStashesInvalidate }: Props) {
  const model = useCandidateStashDetailModal({ stashUuid, companyUuid, stashSummary, onStashesInvalidate })
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)
  const [bulkUnconfirmOpen, setBulkUnconfirmOpen] = useState(false)
  const [recommendationOpen, setRecommendationOpen] = useState(false)
  const recommendationAutoSelectKeyRef = useRef<string | null>(null)
  const panelRef = useRef<HTMLDivElement | null>(null)
  const visibleItemUuids = useMemo(() => model.tableRows.map((row) => row.uuid), [model.tableRows])
  const itemSelection = useVisibleUuidSelection(visibleItemUuids)
  const recommendationRows = model.recommendationItems
  const recommendationRowUuids = useMemo(() => recommendationRows.map((row) => row.uuid), [recommendationRows])
  const recommendationSelection = useVisibleUuidSelection(recommendationRowUuids)
  const recommendationsBlocked = Boolean(model.candidateItemsLoadError)
  const selectedItemUuidsByConfirmation = useMemo(() => {
    const selected = itemSelection.selectedVisibleUuidSet
    return model.tableRows.reduce((acc, row) => {
      if (selected.has(row.uuid)) acc[row.isDetailConfirmed ? 'confirmed' : 'unconfirmed'].push(row.uuid)
      return acc
    }, { confirmed: [] as string[], unconfirmed: [] as string[] })
  }, [itemSelection.selectedVisibleUuidSet, model.tableRows])
  const competitorSalesQtyHeader = useMemo(() => {
    const uniqueLabels = [...new Set(model.tableRows.map((row) => row.insight.competitorChannelLabel.trim()).filter(Boolean))]
    return uniqueLabels.length === 1 ? `${uniqueLabels[0]} 기간 총 판매량` : '경쟁사 기간 총 판매량'
  }, [model.tableRows])
  const nestedModalOpen = Boolean(recommendationOpen || bulkDeleteOpen || bulkUnconfirmOpen || model.drawerOpen || model.drawerClosing || model.itemDeleteTarget || model.bulkConfirmProgress)
  const handlePanelKeyDown = useModalFocusTrap({
    panelRef,
    onClose,
    trapDisabled: nestedModalOpen,
    onEscape: () => {
      if (!model.drawerOpen && !model.drawerClosing) return nestedModalOpen
      model.closeDrawer()
      return true
    },
  })

  useEffect(() => {
    if (!recommendationOpen || !recommendationRowUuids.length) return
    const recommendationKey = recommendationRowUuids.join('|')
    if (recommendationAutoSelectKeyRef.current === recommendationKey) return
    recommendationAutoSelectKeyRef.current = recommendationKey
    recommendationSelection.replaceSelection(recommendationRowUuids)
  }, [recommendationOpen, recommendationRowUuids, recommendationSelection])

  const handleActionFailureAlreadyReported = () => undefined
  const openRecommendationModal = () => {
    if (!recommendationsBlocked) {
      recommendationAutoSelectKeyRef.current = null
      setRecommendationOpen(true)
    }
  }
  const applyRecommendations = () => {
    if (model.recommendationAppendBusy) return
    const selectedRows = recommendationRows.filter((row) => recommendationSelection.selectedVisibleUuidSet.has(row.uuid))
    void model.appendRecommendedItems(selectedRows).then((result) => {
      if (result.status === 'stale') return
      recommendationSelection.clearSelection()
      if (result.status !== 'applied') return
      itemSelection.clearSelection()
      setRecommendationOpen(false)
    }).catch(handleActionFailureAlreadyReported)
  }
  const toggleItemDrawer = (row: InnerCandidateRow) => {
    if (model.drawerOpen && model.openedItemUuid === row.uuid) model.closeDrawer()
    else void model.openItemDrawer(row)
  }

  return (
    <>
      <div className={detailStyles.stashDetailModalBackdrop} onClick={onClose} role="presentation" {...stashDetailModalBackdropDataProps(model.drawerOpen, model.drawerClosing)}>
        <div ref={panelRef} className={detailStyles.stashDetailModalPanel} onClick={(event) => event.stopPropagation()} onKeyDown={handlePanelKeyDown} role="dialog" aria-modal="true" aria-labelledby="stash-detail-modal-title" tabIndex={-1}>
          <div className={detailStyles.stashDetailModalBody}>
            {!model.detailTarget ? <CandidateStashMissingState loadError={model.stashListLoadError} onClose={onClose} /> : (
              <>
                {model.stashListLoadError && <div className={detailStyles.emptyState} role="alert">{model.stashListLoadError}</div>}
                <CandidateStashDetailHeader detailTarget={model.detailTarget} canOpenRecommendations={Boolean(!recommendationsBlocked && !model.candidateItemsLoading && model.tableRows.length && model.periodStart && model.periodEnd)} onOpenRecommendations={openRecommendationModal} onClose={onClose} />
                <div className={detailStyles.detailActionCardGrid}>
                  <CandidateStashDataReferenceCard periodStart={model.draftDataReferencePeriodStart} periodEnd={model.draftDataReferencePeriodEnd} loading={model.candidateItemsLoading} queryDirty={model.dataReferencePeriodQueryDirty} onPeriodStartChange={model.onDataReferencePeriodStartChange} onPeriodEndChange={model.onDataReferencePeriodEndChange} onSearch={model.applyDataReferencePeriod} />
                  <CandidateStashBulkActionCard selectedVisibleCount={itemSelection.selectedVisibleCount} selectedUnconfirmedCount={selectedItemUuidsByConfirmation.unconfirmed.length} selectedConfirmedCount={selectedItemUuidsByConfirmation.confirmed.length} bulkConfirmBusy={model.bulkConfirmBusy} onOpenBulkUnconfirm={() => setBulkUnconfirmOpen(true)} onOpenBulkDelete={() => setBulkDeleteOpen(true)} onBulkConfirm={() => {
                    void model.confirmBulkDetailItems(selectedItemUuidsByConfirmation.unconfirmed).then(() => itemSelection.clearSelection()).catch(handleActionFailureAlreadyReported)
                  }} />
                </div>
                <CandidateStashDetailFilters model={model} downloadUserName={downloadUserName} />
                <CandidateStashDetailBody model={model} visibleItemUuids={visibleItemUuids} selectedUuidSet={itemSelection.selectedVisibleUuidSet} allVisibleSelected={itemSelection.allVisibleSelected} selectAllRef={itemSelection.selectAllRef} competitorSalesQtyHeader={competitorSalesQtyHeader} activeSortKey={model.tableSort?.key ?? null} activeSortDir={model.tableSort?.dir ?? null} keyboardNavigationDisabled={Boolean(recommendationOpen || bulkDeleteOpen || bulkUnconfirmOpen || model.itemDeleteTarget)} onToggleAllVisibleItems={itemSelection.toggleAllVisibleUuids} onToggleSelectedItem={itemSelection.toggleSelectedUuid} onToggleItemDrawer={toggleItemDrawer} />
              </>
            )}
          </div>
        </div>
      </div>

      {recommendationOpen && <CandidateRecommendationModal rows={recommendationRows} loading={model.recommendationLoading} applying={model.recommendationAppendBusy} error={model.recommendationError} selectedUuids={recommendationSelection.selectedVisibleUuidSet} onClose={() => setRecommendationOpen(false)} onToggleAll={recommendationSelection.toggleAllVisibleUuids} onToggleItem={recommendationSelection.toggleSelectedUuid} onApply={applyRecommendations} />}
      <CandidateStashProductDrawer model={model} bulkDeleteOpen={bulkDeleteOpen || bulkUnconfirmOpen} />
      <CandidateBulkDetailConfirmProgress progress={model.bulkConfirmProgress} onClose={model.closeBulkConfirmProgress} />
      <CandidateStashDeleteDialogs
        model={model}
        bulkDeleteOpen={bulkDeleteOpen}
        bulkUnconfirmOpen={bulkUnconfirmOpen}
        selectedVisibleItemUuids={itemSelection.selectedVisibleUuids}
        selectedConfirmedItemUuids={selectedItemUuidsByConfirmation.confirmed}
        onCloseBulkDelete={() => setBulkDeleteOpen(false)}
        onCloseBulkUnconfirm={() => setBulkUnconfirmOpen(false)}
        onBulkDeleteDone={() => {
          itemSelection.clearSelection()
          setBulkDeleteOpen(false)
        }}
        onBulkUnconfirmDone={() => {
          itemSelection.clearSelection()
          setBulkUnconfirmOpen(false)
        }}
      />
    </>
  )
}

function stashDetailModalBackdropDataProps(drawerOpen: boolean, drawerClosing: boolean) {
  return drawerOpen || drawerClosing ? { 'data-drawer-open': 'true' } : undefined
}
