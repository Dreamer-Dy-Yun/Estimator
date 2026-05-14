import { ProductDrawer } from '../product-drawer/ProductDrawer'
import type { CandidateStashDetailModalModel } from './useCandidateStashDetailModal'

type Props = {
  model: CandidateStashDetailModalModel
  bulkDeleteOpen: boolean
}

export function CandidateStashProductDrawer({ model, bulkDeleteOpen }: Props) {
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
      candidateItemContext={
        model.detailTarget && model.openedItemUuid
          ? {
              stashName: model.detailTarget.name,
              stashNote: model.detailTarget.note,
              itemUuid: model.openedItemUuid,
              onSaved: () => {
                void model.loadItems()
                void model.refreshStashes()
              },
              onRequestDeleteItem: () => {
                const row = model.items.find((item) => item.uuid === model.openedItemUuid)
                if (row) model.setItemDeleteTarget(row)
              },
            }
          : null
      }
    />
  )
}
