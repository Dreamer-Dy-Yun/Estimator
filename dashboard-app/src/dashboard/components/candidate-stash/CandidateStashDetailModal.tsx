import { useEffect, useMemo, useRef, useState } from 'react'
import type { CandidateReferenceItemSummary, CandidateStashSummary } from '../../../api'
import { stashDetailModalBackdropDataProps } from '../../drawer/drawerDom'
import { CandidateRecommendationModal } from './CandidateRecommendationModal'
import { CandidateBulkDetailConfirmProgress } from './CandidateBulkDetailConfirmProgress'
import { CandidateStashBulkActionCard } from './CandidateStashBulkActionCard'
import { CandidateStashDataReferenceCard } from './CandidateStashDataReferenceCard'
import { CandidateStashDeleteDialogs } from './CandidateStashDeleteDialogs'
import { CandidateStashDetailBody } from './CandidateStashDetailBody'
import { CandidateStashDetailFilters } from './CandidateStashDetailFilters'
import { CandidateStashDetailHeader } from './CandidateStashDetailHeader'
import { CandidateStashMissingState } from './CandidateStashMissingState'
import { CandidateStashProductDrawer } from './CandidateStashProductDrawer'
import {
  useCandidateStashDetailModal,
  type InnerCandidateRow,
} from './useCandidateStashDetailModal'
import { useVisibleUuidSelection } from './useVisibleUuidSelection'
import detailStyles from './CandidateStashDetailModal.module.css'

type Props = {
  stashUuid: string
  companyUuid?: string
  downloadUserName?: string
  /** 목록에서 요약 정보를 전달하면 후보군 목록 API를 한 번 덜 호출한다. */
  stashSummary?: CandidateStashSummary | null
  onClose: () => void
  onStashesInvalidate?: () => void
}

export function CandidateStashDetailModal({
  stashUuid,
  companyUuid,
  downloadUserName = '사용자',
  stashSummary,
  onClose,
  onStashesInvalidate,
}: Props) {
  const model = useCandidateStashDetailModal({ stashUuid, companyUuid, stashSummary, onStashesInvalidate })
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)
  const [bulkUnconfirmOpen, setBulkUnconfirmOpen] = useState(false)
  const [recommendationOpen, setRecommendationOpen] = useState(false)
  const recommendationAutoSelectKeyRef = useRef<string | null>(null)

  const visibleItemUuids = useMemo(() => model.tableRows.map((row) => row.uuid), [model.tableRows])
  const itemSelection = useVisibleUuidSelection(visibleItemUuids)
  const recommendationRows = useMemo<CandidateReferenceItemSummary[]>(
    () => model.recommendationItems,
    [model.recommendationItems],
  )
  const handleActionFailureAlreadyReported = () => {
    // The action hooks already surface these failures through toast/error state.
  }
  const selectedConfirmedItemUuids = useMemo(
    () => model.tableRows
      .filter((row) => itemSelection.selectedVisibleUuidSet.has(row.uuid) && row.isDetailConfirmed)
      .map((row) => row.uuid),
    [itemSelection.selectedVisibleUuidSet, model.tableRows],
  )
  const selectedUnconfirmedItemUuids = useMemo(
    () => model.tableRows
      .filter((row) => itemSelection.selectedVisibleUuidSet.has(row.uuid) && !row.isDetailConfirmed)
      .map((row) => row.uuid),
    [itemSelection.selectedVisibleUuidSet, model.tableRows],
  )
  const recommendationRowUuids = useMemo(() => recommendationRows.map((row) => row.uuid), [recommendationRows])
  const recommendationSelection = useVisibleUuidSelection(recommendationRowUuids)
  const competitorSalesQtyHeader = useMemo(() => {
    const labels = model.tableRows
      .map((row) => row.insight.competitorChannelLabel.trim())
      .filter((label) => label.length > 0)
    const uniqueLabels = [...new Set(labels)]
    return uniqueLabels.length === 1 ? `${uniqueLabels[0]} 기간 총 판매량` : '경쟁사 기간 총 판매량'
  }, [model.tableRows])

  const openRecommendationModal = () => {
    recommendationAutoSelectKeyRef.current = null
    setRecommendationOpen(true)
  }

  useEffect(() => {
    if (!recommendationOpen || !recommendationRows.length) return
    const recommendationKey = recommendationRows.map((row) => row.uuid).join('|')
    if (recommendationAutoSelectKeyRef.current === recommendationKey) return
    recommendationAutoSelectKeyRef.current = recommendationKey
    recommendationSelection.replaceSelection(recommendationRows.map((row) => row.uuid))
  }, [recommendationOpen, recommendationRows, recommendationSelection])

  const applyRecommendations = () => {
    const selectedRows = recommendationRows.filter((row) => (
      recommendationSelection.selectedVisibleUuidSet.has(row.uuid)
    ))
    void model.appendRecommendedItems(selectedRows).then(() => {
      recommendationSelection.clearSelection()
      itemSelection.clearSelection()
      setRecommendationOpen(false)
    }).catch(handleActionFailureAlreadyReported)
  }

  const toggleItemDrawer = (row: InnerCandidateRow) => {
    if (model.drawerOpen && model.openedItemUuid === row.uuid) {
      model.closeDrawer()
      return
    }
    void model.openItemDrawer(row)
  }

  return (
    <>
      <div
        className={detailStyles.stashDetailModalBackdrop}
        onClick={() => onClose()}
        role="presentation"
        {...stashDetailModalBackdropDataProps(model.drawerOpen, model.drawerClosing)}
      >
        <div
          className={detailStyles.stashDetailModalPanel}
          onClick={(event) => event.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="stash-detail-modal-title"
        >
          <div className={detailStyles.stashDetailModalBody}>
            {!model.detailTarget ? (
              <CandidateStashMissingState loadError={model.stashListLoadError} onClose={onClose} />
            ) : (
              <>
                {model.stashListLoadError && (
                  <div className={detailStyles.emptyState} role="alert">
                    {model.stashListLoadError}
                  </div>
                )}
                <CandidateStashDetailHeader
                  detailTarget={model.detailTarget}
                  canOpenRecommendations={Boolean(
                    !model.candidateItemsLoading && model.tableRows.length && model.periodStart && model.periodEnd,
                  )}
                  onOpenRecommendations={openRecommendationModal}
                  onClose={onClose}
                />
                <div className={detailStyles.detailActionCardGrid}>
                  <CandidateStashDataReferenceCard
                    periodStart={model.draftDataReferencePeriodStart}
                    periodEnd={model.draftDataReferencePeriodEnd}
                    loading={model.candidateItemsLoading}
                    queryDirty={model.dataReferencePeriodQueryDirty}
                    onPeriodStartChange={model.onDataReferencePeriodStartChange}
                    onPeriodEndChange={model.onDataReferencePeriodEndChange}
                    onSearch={model.applyDataReferencePeriod}
                  />
                  <CandidateStashBulkActionCard
                    selectedVisibleCount={itemSelection.selectedVisibleCount}
                    selectedUnconfirmedCount={selectedUnconfirmedItemUuids.length}
                    selectedConfirmedCount={selectedConfirmedItemUuids.length}
                    bulkConfirmBusy={model.bulkConfirmBusy}
                    onBulkConfirm={() => {
                      void model.confirmBulkDetailItems(selectedUnconfirmedItemUuids)
                        .then(() => itemSelection.clearSelection())
                        .catch(handleActionFailureAlreadyReported)
                    }}
                    onOpenBulkUnconfirm={() => setBulkUnconfirmOpen(true)}
                    onOpenBulkDelete={() => setBulkDeleteOpen(true)}
                  />
                </div>
                <CandidateStashDetailFilters
                  model={model}
                  downloadUserName={downloadUserName}
                />
                <CandidateStashDetailBody
                  model={model}
                  visibleItemUuids={visibleItemUuids}
                  selectedUuidSet={itemSelection.selectedVisibleUuidSet}
                  allVisibleSelected={itemSelection.allVisibleSelected}
                  selectAllRef={itemSelection.selectAllRef}
                  competitorSalesQtyHeader={competitorSalesQtyHeader}
                  activeSortKey={model.tableSort?.key ?? null}
                  activeSortDir={model.tableSort?.dir ?? null}
                  keyboardNavigationDisabled={Boolean(
                    recommendationOpen
                    || bulkDeleteOpen
                    || bulkUnconfirmOpen
                    || model.itemDeleteTarget
                  )}
                  onToggleAllVisibleItems={itemSelection.toggleAllVisibleUuids}
                  onToggleSelectedItem={itemSelection.toggleSelectedUuid}
                  onToggleItemDrawer={toggleItemDrawer}
                />
              </>
            )}
          </div>
        </div>
      </div>

      {recommendationOpen && (
        <CandidateRecommendationModal
          rows={recommendationRows}
          loading={model.recommendationLoading}
          error={model.recommendationError}
          selectedUuids={recommendationSelection.selectedVisibleUuidSet}
          selectedCount={recommendationSelection.selectedVisibleCount}
          allSelected={recommendationSelection.allVisibleSelected}
          partiallySelected={recommendationSelection.partiallyVisibleSelected}
          onClose={() => setRecommendationOpen(false)}
          onToggleAll={recommendationSelection.toggleAllVisibleUuids}
          onToggleItem={recommendationSelection.toggleSelectedUuid}
          onApply={applyRecommendations}
        />
      )}

      <CandidateStashProductDrawer model={model} bulkDeleteOpen={bulkDeleteOpen || bulkUnconfirmOpen} />
      <CandidateBulkDetailConfirmProgress
        progress={model.bulkConfirmProgress}
        onClose={model.closeBulkConfirmProgress}
      />
      <CandidateStashDeleteDialogs
        model={model}
        bulkDeleteOpen={bulkDeleteOpen}
        bulkUnconfirmOpen={bulkUnconfirmOpen}
        selectedVisibleCount={itemSelection.selectedVisibleCount}
        selectedVisibleItemUuids={itemSelection.selectedVisibleUuids}
        selectedConfirmedCount={selectedConfirmedItemUuids.length}
        selectedConfirmedItemUuids={selectedConfirmedItemUuids}
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
