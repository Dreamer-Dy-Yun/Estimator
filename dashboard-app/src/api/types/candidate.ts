import type { SecondaryOrderSnapshotPayload } from './snapshot'

export interface CandidateStashSummary {
  uuid: string
  name: string
  note: string | null
  periodStart: string
  periodEnd: string
  forecastMonths: number
  itemCount: number
  dbCreatedAt: string
  dbUpdatedAt: string
}

export interface CandidateItemOrderExportSizeQty {
  size: string
  orderQty: number
}

export interface CandidateItemOrderExport {
  /** Label for the selected competitor channel used to calculate competitorQty. */
  competitorChannelLabel: string
  selfQty: number | null
  competitorQty: number | null
  expectedSalesQty: number
  expectedOrderAmount: number
  avgCost: number | null
  avgPrice: number | null
  feeRatePct: number | null
  opMarginRatePct: number | null
  inboundExpectedDate: string | null
  sizeOrderQty: CandidateItemOrderExportSizeQty[]
}

export interface CandidateItemSummary {
  uuid: string
  stashUuid: string
  skuGroupKey: string
  brand: string
  code: string
  productName: string
  colorCode: string
  qty: number
  /** Live expected order amount in KRW for the requested data reference period. */
  expectedOrderAmount: number
  expectedSalesAmount: number
  /** Live expected operating profit in KRW for the requested data reference period. */
  expectedOpProfit: number
  insight: CandidateItemInsightSummary
  /** Whether the stored AI recommendation/comment reflects the latest saved secondary-drawer snapshot. */
  isLatestLlmComment: boolean
  /** True when this candidate item has a saved order snapshot from the secondary drawer. */
  isDetailConfirmed: boolean
  /** Download DTO already loaded with the list so Excel export does not call the backend again. */
  orderExport: CandidateItemOrderExport
  dbCreatedAt: string
  dbUpdatedAt: string
}

/** Candidate item badge stored as CANDIDATE_ITEM.badge JSON. */
export interface CandidateBadge {
  name: string
  color: string
  tooltip: string
}

export interface CandidateItemInsightSummary {
  competitorChannelLabel: string
  competitorQty: number | null
  competitorAmount: number | null
  selfQty: number | null
  selfAmount: number | null
  expectedSalesQty: number
  expectedSalesAmount: number
  expectedOpProfit: number
  selfOpProfitRatePct: number | null
  rankTone: 'top' | 'bottom' | 'neutral'
  topPercentThreshold: number
  bottomPercentThreshold: number
  badges: CandidateBadge[]
}

export interface CandidateItemListResult {
  items: CandidateItemSummary[]
}

export interface CandidateItemListParams {
  stashUuid: string
  dataReferencePeriodStart: string
  dataReferencePeriodEnd: string
}

export interface CandidateRecommendationParams {
  stashUuid: string
  dataReferencePeriodStart: string
  dataReferencePeriodEnd: string
}

export type CandidateRecommendationResult = CandidateItemListResult

/** Candidate item detail response. `details` is null until the inner secondary drawer saves a snapshot. */
export interface CandidateItemDetail {
  uuid: string
  stashUuid: string
  skuGroupKey: string
  details: SecondaryOrderSnapshotPayload | null
  isLatestLlmComment: boolean
  dbCreatedAt: string
  dbUpdatedAt: string
}

export interface CreateCandidateStashPayload {
  name: string
  note?: string | null
  periodStart: string
  periodEnd: string
  forecastMonths: number
}

/** Updates only candidate stash metadata. */
export interface UpdateCandidateStashPayload {
  stashUuid: string
  name: string
  note?: string | null
}

export interface AppendCandidateItemPayload {
  stashUuid: string
  skuGroupKey: string
  details: SecondaryOrderSnapshotPayload
  isLatestLlmComment: boolean
}

/** Adds SKU.code + SKU.color_code groups from analysis lists without saving an order snapshot. */
export interface AppendCandidateItemsPayload {
  stashUuid: string
  /** skuGroupKey values. Backend maps each key to matching SKU rows by code/color_code. */
  skuGroupKeys: string[]
}

export interface UpdateCandidateItemPayload {
  itemUuid: string
  details: SecondaryOrderSnapshotPayload
  isLatestLlmComment: boolean
}

export interface CandidateStashExcelUploadResult {
  stashUuid: string
  stashName: string
  itemCount: number
  warnings: string[]
}

export interface CandidateStashExcelTemplateDownload {
  href: string
  filename: string
}

export type CandidateStashAnalysisStatus = 'queued' | 'running' | 'completed' | 'failed'

export interface CandidateStashAnalysisStartResult {
  jobId: string
  stashUuid: string
  itemCount: number
}

export interface CandidateStashAnalysisProgressEvent {
  jobId: string
  stashUuid: string
  status: CandidateStashAnalysisStatus
  totalItems: number
  completedItems: number
  currentItemUuid: string | null
  currentProductName: string | null
  message: string
  error?: string | null
}

export interface CandidateStashAnalysisHandlers {
  onEvent: (event: CandidateStashAnalysisProgressEvent) => void
  onError?: (error: Error) => void
  onClose?: () => void
}

export interface CandidateStashAnalysisSubscription {
  close: () => void
}
