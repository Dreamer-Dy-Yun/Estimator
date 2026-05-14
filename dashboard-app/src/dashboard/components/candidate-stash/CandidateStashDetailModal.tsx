import { useMemo, useState } from 'react'
import type { CandidateStashSummary } from '../../../api'
import { useAuth } from '../../../auth/AuthContext'
import { stashDetailModalBackdropDataProps } from '../../drawer/drawerDom'
import { CandidateRecommendationModal } from './CandidateRecommendationModal'
import { CandidateStashAnalysisStatusPopup } from './CandidateStashAnalysisStatusPopup'
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
  const [recommendationOpen, setRecommendationOpen] = useState(false)

  const visibleItemUuids = useMemo(() => model.tableRows.map((row) => row.uuid), [model.tableRows])
  const itemSelection = useVisibleUuidSelection(visibleItemUuids)
  const recommendationRows = useMemo<InnerCandidateRow[]>(
    () => model.recommendationItems.map((item) => ({ ...item, id: item.uuid })),
    [model.recommendationItems],
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
    itemSelection.replaceSelection(recommendationSelection.selectedVisibleUuids)
    setRecommendationOpen(false)
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
        <CandidateStashAnalysisStatusPopup
          stashUuid={stashUuid}
          progress={model.analysisProgress}
          error={model.analysisError}
        />

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
                  dataReferencePeriodStart={model.dataReferencePeriodStart}
                  dataReferencePeriodEnd={model.dataReferencePeriodEnd}
                  recommendationLoading={model.recommendationLoading}
                  canLoadRecommendations={Boolean(model.tableRows.length && model.periodStart && model.periodEnd)}
                  selectedVisibleCount={itemSelection.selectedVisibleCount}
                  onDataReferencePeriodStartChange={model.onDataReferencePeriodStartChange}
                  onDataReferencePeriodEndChange={model.onDataReferencePeriodEndChange}
                  onOpenRecommendations={openRecommendationModal}
                  onOpenBulkDelete={() => setBulkDeleteOpen(true)}
                  onClose={onClose}
                />
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

      <CandidateStashProductDrawer model={model} bulkDeleteOpen={bulkDeleteOpen} />
      <CandidateStashDeleteDialogs
        model={model}
        bulkDeleteOpen={bulkDeleteOpen}
        selectedVisibleCount={itemSelection.selectedVisibleCount}
        selectedVisibleItemUuids={itemSelection.selectedVisibleUuids}
        onCloseBulkDelete={() => setBulkDeleteOpen(false)}
        onBulkDeleteDone={() => {
          itemSelection.clearSelection()
          setBulkDeleteOpen(false)
        }}
      />
    </>
  )
}
