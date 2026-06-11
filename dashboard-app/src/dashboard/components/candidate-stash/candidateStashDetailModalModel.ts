import type { Dispatch, SetStateAction } from 'react'
import type {
  CandidateItemDetail,
  CandidateItemSummary,
  CandidateReferenceItemSummary,
  CandidateStashSummary,
  ProductComparisonTarget,
  ProductDrawerBundle,
} from '../../../api'
import type { OrderSnapshotDocument } from '../../../api/types'
import type { ProductPrimarySummary } from '../../../types'
import type { AdjacentDirection } from '../../../utils/adjacentListNavigation'
import type { AppendRecommendedItemsResult, InnerCandidateRow, InnerCandidateSortKey, InnerCandidateSortState } from './candidateStashDetailTypes'
import type { CandidateBulkDetailConfirmProgress } from './useCandidateBulkDetailConfirm'
import type { CandidateMetricReloadOptions } from './useCandidateItemsLoader'
import type { DrawerSnapshotSource, OpenItemDrawerOptions } from './useCandidateStashItemDrawer'

export interface CandidateStashDetailModalArgs {
  stashUuid: string
  companyUuid?: string
  stashSummary?: CandidateStashSummary | null
  onStashesInvalidate?: () => void
  orderMetricComparisonTarget: ProductComparisonTarget | null
  orderMetricComparisonTargetsLoading: boolean
}

export interface CandidateStashDetailTotals {
  qty: number
  expectedOrderAmount: number
  expectedSalesAmount: number
  expectedOpProfit: number
}

export interface CandidateStashDetailModalModel {
  companyUuid: string | undefined
  items: CandidateItemSummary[]
  candidateItemsLoading: boolean
  candidateItemsLoadError: string | null
  dataReferencePeriodStart: string
  dataReferencePeriodEnd: string
  periodStart: string | undefined
  periodEnd: string | undefined
  itemDeleteTarget: CandidateItemSummary | null
  detailTarget: CandidateStashSummary | null
  stashListLoadError: string | null
  setItemDeleteTarget: Dispatch<SetStateAction<CandidateItemSummary | null>>
  markDrawerSnapshotConfirmed: (itemUuid: string, snapshot: OrderSnapshotDocument, updatedItem: CandidateItemDetail) => void
  markDrawerSnapshotUnconfirmed: (itemUuid: string, updatedItem: CandidateItemDetail) => void
  loadItems: (nextPeriodStart?: string, nextPeriodEnd?: string, options?: CandidateMetricReloadOptions) => Promise<void>
  refreshStashes: () => Promise<void>
  confirmDeleteItem: () => Promise<void>
  recommendationItems: CandidateReferenceItemSummary[]
  recommendationLoading: boolean
  recommendationAppendBusy: boolean
  recommendationError: string | null
  clearRecommendationItems: () => void
  loadRecommendations: (force?: boolean) => Promise<CandidateReferenceItemSummary[]>
  appendRecommendedItems: (rows: CandidateReferenceItemSummary[]) => Promise<AppendRecommendedItemsResult>
  bulkConfirmBusy: boolean
  bulkConfirmProgress: CandidateBulkDetailConfirmProgress | null
  closeBulkConfirmProgress: () => void
  confirmBulkDetailItems: (itemUuids: string[]) => Promise<void>
  itemDeleteBusy: boolean
  bulkDeleteBusy: boolean
  bulkUnconfirmBusy: boolean
  orderExportBusy: boolean
  orderExportError: string | null
  confirmDeleteItems: (itemUuids: string[]) => Promise<void>
  confirmUnconfirmItems: (itemUuids: string[]) => Promise<void>
  downloadOrderExcel: (userName: string) => Promise<void>
  brandQuery: string
  setBrandQuery: Dispatch<SetStateAction<string>>
  codeQuery: string
  setCodeQuery: Dispatch<SetStateAction<string>>
  productNameQuery: string
  setProductNameQuery: Dispatch<SetStateAction<string>>
  tableSort: InnerCandidateSortState | null
  toggleTableSort: (key: InnerCandidateSortKey) => void
  resetTableSort: () => void
  brandOptions: string[]
  codeOptions: string[]
  productNameOptions: string[]
  tableRows: CandidateItemSummary[]
  totals: CandidateStashDetailTotals
  pendingOrderMetricCount: number
  totalExpectedOpProfitRatePct: number | null
  draftDataReferencePeriodStart: string
  draftDataReferencePeriodEnd: string
  dataReferencePeriodQueryDirty: boolean
  onDataReferencePeriodStartChange: (value: string) => void
  onDataReferencePeriodEndChange: (value: string) => void
  applyDataReferencePeriod: () => void
  drawerOpen: boolean
  drawerClosing: boolean
  drawerError: string | null
  openedItemUuid: string | null
  hydrateSnap: OrderSnapshotDocument | null
  hydrateSnapSource: DrawerSnapshotSource | null
  confirmedHydrateSnap: OrderSnapshotDocument | null
  fc: number
  bundle: ProductDrawerBundle | null
  mergedSummary: ProductPrimarySummary | null
  openItemDrawer: (row: InnerCandidateRow, options?: OpenItemDrawerOptions) => Promise<void>
  onRequestNavigateAdjacent: (direction: AdjacentDirection) => Promise<void>
  closeDrawer: () => void
  onDrawerForecastMonthsChange: (n: number) => void
  saveDrawerDraftSnapshot: (itemUuid: string, snapshot: OrderSnapshotDocument, source: DrawerSnapshotSource) => void
  clearDrawerDraftSnapshot: (itemUuid: string) => void
  restoreDrawerConfirmedSnapshot: (itemUuid: string) => void
}
