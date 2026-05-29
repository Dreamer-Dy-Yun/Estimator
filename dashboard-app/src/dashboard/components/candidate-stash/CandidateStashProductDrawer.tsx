import { useMemo } from 'react'
import type { CandidateItemDetail } from '../../../api'
import type { OrderSnapshotDocumentV2 } from '../../../snapshot/orderSnapshotTypes'
import { useSelfCompanyLabel } from '../../hooks/useSelfCompanyLabel'
import { ProductDrawer } from '../product-drawer/ProductDrawer'
import type { CandidateStashDetailModalModel } from './useCandidateStashDetailModal'

type Props = {
  model: CandidateStashDetailModalModel
  bulkDeleteOpen: boolean
}

type DrawerPeriod = {
  periodStart: string
  periodEnd: string
}

function resolveCandidateDrawerPeriod(
  model: CandidateStashDetailModalModel,
  confirmedContext: OrderSnapshotDocumentV2['context'] | null,
): DrawerPeriod | null {
  if (confirmedContext != null) {
    return {
      periodStart: confirmedContext.periodStart,
      periodEnd: confirmedContext.periodEnd,
    }
  }
  if (!model.periodStart || !model.periodEnd) return null
  return {
    periodStart: model.periodStart,
    periodEnd: model.periodEnd,
  }
}

export function CandidateStashProductDrawer({ model, bulkDeleteOpen }: Props) {
  const selfCompanyLabel = useSelfCompanyLabel()
  const openedItem = useMemo(
    () => model.items.find((item) => item.uuid === model.openedItemUuid) ?? null,
    [model.items, model.openedItemUuid],
  )
  const confirmedHydrateContext = model.hydrateSnapSource === 'confirmed'
    ? model.confirmedHydrateSnap?.context ?? model.hydrateSnap?.context ?? null
    : null
  const drawerPeriod = resolveCandidateDrawerPeriod(model, confirmedHydrateContext)
  const candidateItemContext = useMemo(() => {
    if (!model.detailTarget || !model.openedItemUuid || !openedItem) return null
    const itemUuid = model.openedItemUuid
    return {
      stashName: model.detailTarget.name,
      stashNote: model.detailTarget.note,
      itemUuid,
      isDetailConfirmed: openedItem.isDetailConfirmed,
      confirmedSnapshot: model.confirmedHydrateSnap,
      hydrateSnapshotSource: model.hydrateSnapSource,
      onDraftChange: (snapshot: OrderSnapshotDocumentV2, source: 'confirmed' | 'live') => (
        model.saveDrawerDraftSnapshot(itemUuid, snapshot, source)
      ),
      onResetDraft: () => model.clearDrawerDraftSnapshot(itemUuid),
      onRestoreConfirmed: () => model.restoreDrawerConfirmedSnapshot(itemUuid),
      onConfirmed: (snapshot: OrderSnapshotDocumentV2, updatedItem: CandidateItemDetail) => (
        model.markDrawerSnapshotConfirmed(itemUuid, snapshot, updatedItem)
      ),
      onUnconfirmed: (updatedItem: CandidateItemDetail) => model.markDrawerSnapshotUnconfirmed(itemUuid, updatedItem),
      onSaved: () => {
        void model.refreshStashes()
      },
      onRequestDeleteItem: () => {
        const row = model.items.find((item) => item.uuid === itemUuid)
        if (row) model.setItemDeleteTarget(row)
      },
    }
  }, [model, openedItem])

  return drawerPeriod == null ? null : (
    <ProductDrawer
      summary={model.mergedSummary}
      loading={Boolean(model.drawerOpen && model.mergedSummary == null)}
      suppressDocumentLayoutShift
      closing={model.drawerClosing}
      onClose={model.closeDrawer}
      periodStart={drawerPeriod.periodStart}
      periodEnd={drawerPeriod.periodEnd}
      forecastMonths={model.fc}
      companyUuid={model.companyUuid}
      selfCompanyLabel={selfCompanyLabel}
      onForecastMonthsChange={model.onDrawerForecastMonthsChange}
      hydrateSnapshot={model.hydrateSnap}
      onRequestNavigateAdjacent={model.onRequestNavigateAdjacent}
      disableAdjacentNavigation={Boolean(bulkDeleteOpen || model.itemDeleteTarget)}
      keyboardShortcutsDisabled={bulkDeleteOpen}
      candidateItemContext={candidateItemContext}
    />
  )
}
