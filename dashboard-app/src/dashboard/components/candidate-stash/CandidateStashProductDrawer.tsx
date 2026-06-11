import type { DrawerSnapshotSource } from './useCandidateStashItemDrawer'
import type { CandidateItemSummary } from '../../../api'
import { useMemo } from 'react'
import type { CandidateItemDetail } from '../../../api'
import type { OrderSnapshotDocument } from '../../../snapshot/orderSnapshotTypes'
import { useSelfCompanyLabel } from '../../hooks/useSelfCompanyLabel'
import { ProductDrawer } from '../product-drawer/ProductDrawer'
import type { CandidateStashDetailModalModel } from './useCandidateStashDetailModal'

export type Props = {
  model: CandidateStashDetailModalModel
  bulkDeleteOpen: boolean
}

export type DrawerPeriod = {
  periodStart: string
  periodEnd: string
}

function resolveCandidateDrawerPeriod(
  model: CandidateStashDetailModalModel,
  confirmedContext: OrderSnapshotDocument['context'] | null,
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

export function CandidateStashProductDrawer({ model, bulkDeleteOpen }: Props) : React.JSX.Element | null {
  const selfCompanyLabel: string = useSelfCompanyLabel()
  const openedItem: CandidateItemSummary | null = useMemo(
    () : CandidateItemSummary | null => model.items.find((item: CandidateItemSummary) : boolean => item.uuid === model.openedItemUuid) ?? null,
    [model.items, model.openedItemUuid],
  )
  const confirmedHydrateContext: { periodStart: string; periodEnd: string; forecastMonths: number; dailyTrendStartMonth: string; dailyTrendLeadTimeDays: number; } | null = model.hydrateSnapSource === 'confirmed'
    ? model.confirmedHydrateSnap?.context ?? model.hydrateSnap?.context ?? null
    : null
  const drawerPeriod: DrawerPeriod | null = resolveCandidateDrawerPeriod(model, confirmedHydrateContext)
  const candidateItemContext: { stashName: string; stashNote: string | null; itemUuid: string; isDetailConfirmed: boolean; confirmedSnapshot: OrderSnapshotDocument | null; hydrateSnapshotSource: DrawerSnapshotSource | null; onDraftChange: (snapshot: OrderSnapshotDocument, source: 'confirmed' | 'live') => void; onResetDraft: () => void; onRestoreConfirmed: () => void; onConfirmed: (snapshot: OrderSnapshotDocument, updatedItem: CandidateItemDetail) => void; onUnconfirmed: (updatedItem: CandidateItemDetail) => void; onSaved: () => void; onRequestDeleteItem: () => void; } | null = useMemo(() : { stashName: string; stashNote: string | null; itemUuid: string; isDetailConfirmed: boolean; confirmedSnapshot: OrderSnapshotDocument | null; hydrateSnapshotSource: DrawerSnapshotSource | null; onDraftChange: (snapshot: OrderSnapshotDocument, source: 'confirmed' | 'live') => void; onResetDraft: () => void; onRestoreConfirmed: () => void; onConfirmed: (snapshot: OrderSnapshotDocument, updatedItem: CandidateItemDetail) => void; onUnconfirmed: (updatedItem: CandidateItemDetail) => void; onSaved: () => void; onRequestDeleteItem: () => void; } | null => {
    if (!model.detailTarget || !model.openedItemUuid || !openedItem) return null
    const itemUuid: string = model.openedItemUuid
    return {
      stashName: model.detailTarget.name,
      stashNote: model.detailTarget.note,
      itemUuid,
      isDetailConfirmed: openedItem.isDetailConfirmed,
      confirmedSnapshot: model.confirmedHydrateSnap,
      hydrateSnapshotSource: model.hydrateSnapSource,
      onDraftChange: (snapshot: OrderSnapshotDocument, source: 'confirmed' | 'live') : void => (
        model.saveDrawerDraftSnapshot(itemUuid, snapshot, source)
      ),
      onResetDraft: () : void => model.clearDrawerDraftSnapshot(itemUuid),
      onRestoreConfirmed: () : void => model.restoreDrawerConfirmedSnapshot(itemUuid),
      onConfirmed: (snapshot: OrderSnapshotDocument, updatedItem: CandidateItemDetail) : void => (
        model.markDrawerSnapshotConfirmed(itemUuid, snapshot, updatedItem)
      ),
      onUnconfirmed: (updatedItem: CandidateItemDetail) : void => model.markDrawerSnapshotUnconfirmed(itemUuid, updatedItem),
      onSaved: () : void => {
        void model.refreshStashes()
      },
      onRequestDeleteItem: () : void => {
        const row: CandidateItemSummary | undefined = model.items.find((item: CandidateItemSummary) : boolean => item.uuid === itemUuid)
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
          initialExpandSecondary={model.drawerClosing}
      onRequestNavigateAdjacent={model.onRequestNavigateAdjacent}
      disableAdjacentNavigation={Boolean(bulkDeleteOpen || model.itemDeleteTarget)}
      keyboardShortcutsDisabled={bulkDeleteOpen}
      candidateItemContext={candidateItemContext}
    />
  )
}
