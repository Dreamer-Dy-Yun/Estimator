import { useMemo, useState } from 'react'
import type { CandidateReferenceItemSummary, CandidateStashSummary } from '../../../api'
import { useAuth } from '../../../auth/AuthContext'
import { stashDetailModalBackdropDataProps } from '../../drawer/drawerDom'
import { CandidateRecommendationModal } from './CandidateRecommendationModal'
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
  /** 목록에서 열 때 전달하면 후보군 목록 API를 한 번 덜 호출함 */
  stashSummary?: CandidateStashSummary | null
  onClose: () => void
  onStashesInvalidate?: () => void
}

export function CandidateStashDetailModal({ stashUuid, stashSummary, onClose, onStashesInvalidate }: Props) {
  const model = useCandidateStashDetailModal({ stashUuid, stashSummary, onStashesInvalidate })
  const { session } = useAuth()
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)
  const [bulkUnconfirmOpen, setBulkUnconfirmOpen] = useState(false)
  const [recommendationOpen, setRecommendationOpen] = useState(false)

  const visibleItemUuids = useMemo(() => model.tableRows.map((row) => row.uuid), [model.tableRows])
  const itemSelection = useVisibleUuidSelection(visibleItemUuids)
  const recommendationRows = useMemo<CandidateReferenceItemSummary[]>(
    () => model.recommendationItems,
    [model.recommendationItems],
  )
  const selectedConfirmedItemUuids = useMemo(
    () => model.tableRows
      .filter((row) => itemSelection.selectedVisibleUuidSet.has(row.uuid) && row.isDetailConfirmed)
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
    void (async () => {
      const rows = await model.loadRecommendations()
      if (!rows.length) return
      recommendationSelection.replaceSelection(rows.map((row) => row.uuid))
      setRecommendationOpen(true)
    })()
  }

  const applyRecommendations = () => {
    const selectedRows = recommendationRows.filter((row) => (
      recommendationSelection.selectedVisibleUuidSet.has(row.uuid)
    ))
    void model.appendRecommendedItems(selectedRows).then(() => {
      recommendationSelection.clearSelection()
      itemSelection.clearSelection()
      setRecommendationOpen(false)
    })
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
              <CandidateStashMissingState onClose={onClose} />
            ) : (
              <>
                <CandidateStashDetailHeader
                  detailTarget={model.detailTarget}
                  recommendationLoading={model.recommendationLoading}
                  canLoadRecommendations={Boolean(model.tableRows.length && model.periodStart && model.periodEnd)}
                  onOpenRecommendations={openRecommendationModal}
                  onClose={onClose}
                />
                <div className={detailStyles.detailActionCardGrid}>
                  <CandidateStashDataReferenceCard
                    periodStart={model.draftDataReferencePeriodStart}
                    periodEnd={model.draftDataReferencePeriodEnd}
                    loading={model.detailLoading}
                    onPeriodStartChange={model.onDataReferencePeriodStartChange}
                    onPeriodEndChange={model.onDataReferencePeriodEndChange}
                    onSearch={model.applyDataReferencePeriod}
                  />
                  <CandidateStashBulkActionCard
                    selectedVisibleCount={itemSelection.selectedVisibleCount}
                    selectedConfirmedCount={selectedConfirmedItemUuids.length}
                    onOpenBulkUnconfirm={() => setBulkUnconfirmOpen(true)}
                    onOpenBulkDelete={() => setBulkDeleteOpen(true)}
                  />
                </div>
                <CandidateStashDetailFilters
                  model={model}
                  downloadUserName={session?.user.name ?? session?.user.loginId ?? '사용자'}
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
