import { useEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react'
import type { CandidateStashSummary } from '../../../api'
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
  /** Passing the list summary avoids one extra candidate-stash list request. */
  stashSummary?: CandidateStashSummary | null
  onClose: () => void
  onStashesInvalidate?: () => void
}

const fallbackModalTitleStyle: CSSProperties = {
  position: 'absolute',
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: 'hidden',
  clip: 'rect(0 0 0 0)',
  whiteSpace: 'nowrap',
  border: 0,
}

export function CandidateStashDetailModal({
  stashUuid,
  companyUuid,
  downloadUserName = '\uC0AC\uC6A9\uC790',
  stashSummary,
  onClose,
  onStashesInvalidate,
}: Props) {
  const model = useCandidateStashDetailModal({ stashUuid, companyUuid, stashSummary, onStashesInvalidate })
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)
  const [bulkUnconfirmOpen, setBulkUnconfirmOpen] = useState(false)
  const [recommendationOpen, setRecommendationOpen] = useState(false)
  const recommendationAutoSelectKeyRef = useRef<string | null>(null)
  const panelRef = useRef<HTMLDivElement | null>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)

  const visibleItemUuids = useMemo(() => model.tableRows.map((row) => row.uuid), [model.tableRows])
  const itemSelection = useVisibleUuidSelection(visibleItemUuids)
  const recommendationRows = model.recommendationItems
  const recommendationsBlocked = Boolean(model.candidateItemsLoadError)
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
    return uniqueLabels.length === 1 ? `${uniqueLabels[0]} \uAE30\uAC04 \uCD1D \uD310\uB9E4\uB7C9` : '\uACBD\uC7C1\uC0AC \uAE30\uAC04 \uCD1D \uD310\uB9E4\uB7C9'
  }, [model.tableRows])
  const nestedModalOpen = Boolean(
    recommendationOpen
    || bulkDeleteOpen
    || bulkUnconfirmOpen
    || model.drawerOpen
    || model.drawerClosing
    || model.itemDeleteTarget
    || model.bulkConfirmProgress,
  )

  useEffect(() => {
    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    panelRef.current?.focus()

    return () => {
      previousFocusRef.current?.focus()
    }
  }, [])

  const handlePanelKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      if (model.drawerOpen || model.drawerClosing) {
        event.stopPropagation()
        model.closeDrawer()
        return
      }
      if (nestedModalOpen) {
        event.stopPropagation()
        return
      }
      event.stopPropagation()
      onClose()
      return
    }

    if (event.key !== 'Tab' || nestedModalOpen) return

    const panel = panelRef.current
    if (!panel) return

    const focusableElements = Array.from(
      panel.querySelectorAll<HTMLElement>(
        [
          'button:not([disabled])',
          'input:not([disabled])',
          'select:not([disabled])',
          'textarea:not([disabled])',
          'a[href]',
          '[tabindex]:not([tabindex="-1"])',
        ].join(','),
      ),
    ).filter((element) => !element.hasAttribute('disabled') && element.tabIndex !== -1)

    if (!focusableElements.length) {
      event.preventDefault()
      return
    }

    const firstElement = focusableElements[0]
    const lastElement = focusableElements[focusableElements.length - 1]
    const activeElement = document.activeElement

    if (event.shiftKey && activeElement === firstElement) {
      event.preventDefault()
      lastElement.focus()
      return
    }

    if (!event.shiftKey && activeElement === lastElement) {
      event.preventDefault()
      firstElement.focus()
    }
  }

  const openRecommendationModal = () => {
    if (recommendationsBlocked) return
    recommendationAutoSelectKeyRef.current = null
    setRecommendationOpen(true)
  }

  useEffect(() => {
    if (!recommendationOpen || !recommendationRowUuids.length) return
    const recommendationKey = recommendationRowUuids.join('|')
    if (recommendationAutoSelectKeyRef.current === recommendationKey) return
    recommendationAutoSelectKeyRef.current = recommendationKey
    recommendationSelection.replaceSelection(recommendationRowUuids)
  }, [recommendationOpen, recommendationRowUuids, recommendationSelection])

  const applyRecommendations = () => {
    if (model.recommendationAppendBusy) return
    const selectedRows = recommendationRows.filter((row) => (
      recommendationSelection.selectedVisibleUuidSet.has(row.uuid)
    ))
    void model.appendRecommendedItems(selectedRows).then((result) => {
      if (result.status === 'stale') return
      if (result.status === 'empty') {
        recommendationSelection.clearSelection()
        return
      }
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
          ref={panelRef}
          className={detailStyles.stashDetailModalPanel}
          onClick={(event) => event.stopPropagation()}
          onKeyDown={handlePanelKeyDown}
          role="dialog"
          aria-modal="true"
          aria-labelledby="stash-detail-modal-title"
          tabIndex={-1}
        >
          <div className={detailStyles.stashDetailModalBody}>
    {!model.detailTarget ? (
      <>
        <h2 id="stash-detail-modal-title" style={fallbackModalTitleStyle}>
          {model.stashListLoadError ? '후보 보관함 상세 로드 실패' : '후보 보관함 상세 없음'}
        </h2>
        <CandidateStashMissingState loadError={model.stashListLoadError} onClose={onClose} />
      </>
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
                    !recommendationsBlocked
                    && !model.candidateItemsLoading
                    && model.tableRows.length
                    && model.periodStart
                    && model.periodEnd,
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
          applying={model.recommendationAppendBusy}
          error={model.recommendationError}
          selectedUuids={recommendationSelection.selectedVisibleUuidSet}
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
