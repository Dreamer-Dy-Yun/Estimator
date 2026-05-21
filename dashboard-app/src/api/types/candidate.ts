import type { SecondaryOrderSnapshotPayload } from './snapshot'
import type {
  CandidateItemOrderExport,
  CandidateOrderMetricStatus,
} from './candidate-order-metrics'
import type { CompanyMutationScopeParams, CompanyScopeParams } from './company'

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

export interface CandidateItemSummary {
  /** CANDIDATE_ITEM.uuid */
  uuid: string
  stashUuid: string
  /** CANDIDATE_ITEM.sku_uuid. Mock uses the current skuGroupKey as SKU.uuid until the backend exists. */
  skuUuid: string
  /** Transitional product-color key used by existing drawer APIs. */
  skuGroupKey: string
  brand: string
  code: string
  productName: string
  colorCode: string
  orderMetricStatus: CandidateOrderMetricStatus
  qty: number
  /** Live expected order amount in KRW for the requested data reference period. */
  expectedOrderAmount: number
  expectedSalesAmount: number
  /** Live expected operating profit in KRW for the requested data reference period. */
  expectedOpProfit: number
  /** Badge/recommendation insight loading state. Period sales totals are part of the base item response. */
  insightStatus: 'loading' | 'loaded' | 'failed'
  insight: CandidateItemInsightSummary
  /** Whether the stored AI recommendation/comment reflects the latest saved secondary-drawer snapshot. */
  isLatestLlmComment: boolean
  /** True when this candidate item has a saved order snapshot from the secondary drawer. */
  isDetailConfirmed: boolean
  /** Download DTO loaded by the order-metric stream. Excel export must not refetch backend data. */
  orderExport: CandidateItemOrderExport | null
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

export interface CandidateReferenceItemSummary {
  /** SKU.uuid. Mock uses the current skuGroupKey as SKU.uuid until the backend exists. */
  uuid: string
  /** Transitional product-color key used by existing drawer APIs. */
  skuGroupKey: string
  brand: string
  code: string
  productName: string
  colorCode: string
  /** Period sales totals plus badge/rank insight for recommendation display and candidate-row patching. */
  insight: CandidateItemInsightSummary
}

export interface CandidateStashItemSummary {
  /** CANDIDATE_ITEM.uuid */
  uuid: string
  stashUuid: string
  /** CANDIDATE_ITEM.sku_uuid, equal to SKU.uuid. */
  skuUuid: string
  /** Transitional product-color key used by existing drawer APIs. */
  skuGroupKey: string
  isLatestLlmComment: boolean
  hasSnapshot: boolean
  snapshotUpdatedAt?: string
  dbCreatedAt: string
  dbUpdatedAt: string
}

export interface CandidateItemListResult {
  candidateItems: CandidateStashItemSummary[]
  /** Screen-composed candidate rows with SKU metadata and period sales totals. Badge/recommendation and order metrics arrive by separate requests. */
  items: CandidateItemSummary[]
}

export interface CandidateStashListParams extends CompanyScopeParams {
  companyUuid?: CompanyScopeParams['companyUuid']
}

export interface CandidateItemListParams extends CompanyScopeParams {
  stashUuid: string
  dataReferencePeriodStart: string
  dataReferencePeriodEnd: string
}

export interface CandidateRecommendationParams extends CompanyScopeParams {
  stashUuid: string
  dataReferencePeriodStart: string
  dataReferencePeriodEnd: string
  limit?: number
  cursor?: string
}

export interface CandidateRecommendationResult {
  /** Badge-bearing SKU rows with period sales totals. Frontend eagerly pages this response, patches stash rows, and hides duplicates from recommendation UI. */
  recommendations: CandidateReferenceItemSummary[]
  nextCursor?: string | null
}

export interface CandidateStashLlmCommentJobStartResult {
  jobId: string
  stashUuid: string
  itemCount: number
}

export type CandidateStashLlmCommentJobStatus = 'queued' | 'running' | 'completed' | 'failed'

export interface CandidateStashLlmCommentJobProgressEvent {
  jobId: string
  stashUuid: string
  status: CandidateStashLlmCommentJobStatus
  totalItems: number
  completedItems: number
  currentItemUuid?: string
  currentProductName?: string
  message: string
  error?: string
}

export interface CandidateStashLlmCommentJobSubscription {
  close: () => void
}

export interface CandidateDetailBulkConfirmStartPayload extends CompanyMutationScopeParams {
  stashUuid: string
  itemUuids: string[]
  dataReferencePeriodStart: string
  dataReferencePeriodEnd: string
}

export type CandidateStashLlmCommentJobParams = CompanyMutationScopeParams

export interface CandidateDetailBulkConfirmStartResult {
  jobId: string
  stashUuid: string
  itemCount: number
}

export type CandidateDetailBulkConfirmStatus = 'queued' | 'running' | 'completed' | 'failed'

export interface CandidateDetailBulkConfirmProgressEvent {
  jobId: string
  stashUuid: string
  status: CandidateDetailBulkConfirmStatus
  totalItems: number
  completedItems: number
  currentItemUuid?: string
  currentProductName?: string
  updatedItem?: CandidateItemDetail
  message: string
  error?: string
}

export interface CandidateDetailBulkConfirmSubscription {
  close: () => void
}

/**
 * Candidate item detail response.
 * `details` is null until the inner secondary drawer saves a snapshot.
 * PATCH /candidate-items/:itemUuid must return this shape after DB commit/cache invalidation.
 */
export interface CandidateItemDetail {
  uuid: string
  stashUuid: string
  skuUuid: string
  skuGroupKey: string
  details: SecondaryOrderSnapshotPayload | null
  /** Server-side confirmation state derived from whether details is null. */
  isDetailConfirmed: boolean
  isLatestLlmComment: boolean
  dbCreatedAt: string
  /** Must change whenever details or isLatestLlmComment changes. Used for read-after-write protection. */
  dbUpdatedAt: string
}

export interface CreateCandidateStashPayload extends CompanyMutationScopeParams {
  name: string
  note?: string | null
  periodStart: string
  periodEnd: string
  forecastMonths: number
}

/** Updates only candidate stash metadata. */
export interface UpdateCandidateStashPayload extends CompanyMutationScopeParams {
  stashUuid: string
  name: string
  note?: string | null
}

export interface AppendCandidateItemPayload extends CompanyMutationScopeParams {
  stashUuid: string
  skuGroupKey: string
  details: SecondaryOrderSnapshotPayload
  isLatestLlmComment: boolean
}

/** Adds SKU.code + SKU.color_code groups from analysis lists without saving an order snapshot. */
export interface AppendCandidateItemsPayload extends CompanyMutationScopeParams {
  stashUuid: string
  /** skuGroupKey values. Backend maps each key to matching SKU rows by code/color_code. */
  skuGroupKeys: string[]
}

export interface AppendCandidateItemsResponse {
  /** Newly created candidate item records only. Existing duplicates are not returned. */
  candidateItems: CandidateStashItemSummary[]
}

export interface UpdateCandidateItemPayload extends CompanyMutationScopeParams {
  itemUuid: string
  /** null clears the saved secondary-drawer snapshot and makes the item unconfirmed. */
  details: SecondaryOrderSnapshotPayload | null
  isLatestLlmComment: boolean
}

/**
 * PATCH /candidate-items/:itemUuid success response.
 * Backend must return this after the DB commit and cache invalidation are complete,
 * so the frontend can treat the response as the authoritative post-mutation state.
 */
export type UpdateCandidateItemResponse = CandidateItemDetail

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
