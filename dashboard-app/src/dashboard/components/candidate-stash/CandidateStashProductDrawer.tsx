import { useMemo } from 'react'
import type { OrderSnapshotDocumentV1 } from '../../../snapshot/orderSnapshotTypes'
import { ProductDrawer } from '../product-drawer/ProductDrawer'
import type { CandidateStashDetailModalModel } from './useCandidateStashDetailModal'

type Props = {
  model: CandidateStashDetailModalModel
  bulkDeleteOpen: boolean
}

export function CandidateStashProductDrawer({ model, bulkDeleteOpen }: Props) {
  const openedItem = useMemo(
    () => model.items.find((item) => item.uuid === model.openedItemUuid) ?? null,
    [model.items, model.openedItemUuid],
  )
  const candidateItemContext = useMemo(() => {
    if (!model.detailTarget || !model.openedItemUuid || !openedItem) return null
    const itemUuid = model.openedItemUuid
    return {
      stashName: model.detailTarget.name,
      stashNote: model.detailTarget.note,
      itemUuid,
      isDetailConfirmed: openedItem.isDetailConfirmed,
      onDraftChange: (snapshot: OrderSnapshotDocumentV1) => model.saveDrawerDraftSnapshot(itemUuid, snapshot),
      onResetDraft: () => model.clearDrawerDraftSnapshot(itemUuid),
      onConfirmed: (snapshot: OrderSnapshotDocumentV1) => model.markDrawerSnapshotConfirmed(itemUuid, snapshot),
      onUnconfirmed: () => model.markDrawerSnapshotUnconfirmed(itemUuid),
      onSaved: () => {
        void model.loadItems()
        void model.refreshStashes()
      },
      onRequestDeleteItem: () => {
        const row = model.items.find((item) => item.uuid === itemUuid)
        if (row) model.setItemDeleteTarget(row)
      },
    }
  }, [model, openedItem])

  return (
    <ProductDrawer
      summary={model.mergedSummary}
      loading={Boolean(model.drawerOpen && model.mergedSummary == null)}
      suppressDocumentLayoutShift
      closing={model.drawerClosing}
      onClose={model.closeDrawer}
      periodStart={model.periodStart!}
      periodEnd={model.periodEnd!}
      forecastMonths={model.fc}
      onForecastMonthsChange={model.onDrawerForecastMonthsChange}
      hydrateSnapshot={model.hydrateSnap}
      onRequestNavigateAdjacent={model.onRequestNavigateAdjacent}
      disableAdjacentNavigation={Boolean(bulkDeleteOpen || model.itemDeleteTarget)}
      candidateItemContext={candidateItemContext}
    />
  )
}
