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
  uuid: string
  stashUuid: string
  skuUuid: string
  skuGroupKey: string
  brand: string
  code: string
  productName: string
  colorCode: string
  orderMetricStatus: CandidateOrderMetricStatus
  qty: number
  expectedOrderAmount: number
  expectedSalesAmount: number
  expectedOpProfit: number
  insightStatus: 'loading' | 'loaded' | 'failed'
  insight: CandidateItemInsightSummary
  isLatestLlmComment: boolean
  isDetailConfirmed: boolean
  orderExport: CandidateItemOrderExport | null
  dbCreatedAt: string
  dbUpdatedAt: string
}

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
  uuid: string
  skuGroupKey: string
  brand: string
  code: string
  productName: string
  colorCode: string
  insight: CandidateItemInsightSummary
}

export interface CandidateStashItemSummary {
  uuid: string
  stashUuid: string
  skuUuid: string
  skuGroupKey: string
  isLatestLlmComment: boolean
  hasSnapshot: boolean
  snapshotUpdatedAt?: string
  dbCreatedAt: string
  dbUpdatedAt: string
}

export interface CandidateItemListResult {
  candidateItems: CandidateStashItemSummary[]
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
  recommendations: CandidateReferenceItemSummary[]
  nextCursor?: string | null
}

export interface CandidateStashLlmCommentJobStartResult {
  jobId: string
  stashUuid: string
  itemCount: number
}

export type CandidateJobStatus = 'queued' | 'running' | 'completed' | 'failed'
export type CandidateStashLlmCommentJobStatus = CandidateJobStatus
export type CandidateDetailBulkConfirmStatus = CandidateJobStatus

export interface CandidateJobProgressEventBase {
  jobId: string
  stashUuid: string
  status: CandidateJobStatus
  totalItems: number
  completedItems: number
  currentItemUuid?: string
  currentProductName?: string
  message: string
  error?: string
}

export type CandidateStashLlmCommentJobProgressEvent = CandidateJobProgressEventBase

export interface CandidateJobSubscription {
  close: () => void
}

export type CandidateStashLlmCommentJobSubscription = CandidateJobSubscription

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

export interface CandidateDetailBulkConfirmProgressEvent extends CandidateJobProgressEventBase {
  updatedItem?: CandidateItemDetail
}

export type CandidateDetailBulkConfirmSubscription = CandidateJobSubscription

export interface CandidateItemDetail {
  uuid: string
  stashUuid: string
  skuUuid: string
  skuGroupKey: string
  /** Persisted order snapshot payload. Null means the backend has no stored snapshot for this candidate item. */
  details: SecondaryOrderSnapshotPayload | null
  isDetailConfirmed: boolean
  isLatestLlmComment: boolean
  dbCreatedAt: string
  dbUpdatedAt: string
}

export interface CreateCandidateStashPayload extends CompanyMutationScopeParams {
  name: string
  note?: string | null
  periodStart: string
  periodEnd: string
  forecastMonths: number
}

export interface UpdateCandidateStashPayload extends CompanyMutationScopeParams {
  stashUuid: string
  name: string
  note?: string | null
}

export interface AppendCandidateItemPayload extends CompanyMutationScopeParams {
  stashUuid: string
  skuGroupKey: string
  /** Snapshot document captured from the secondary drawer; callers must not synthesize missing business values. */
  details: SecondaryOrderSnapshotPayload
  isLatestLlmComment: boolean
}

export interface AppendCandidateItemsPayload extends CompanyMutationScopeParams {
  stashUuid: string
  skuGroupKeys: string[]
}

export interface AppendCandidateItemsResponse {
  candidateItems: CandidateStashItemSummary[]
}

export interface UpdateCandidateItemPayload extends CompanyMutationScopeParams {
  itemUuid: string
  /** Null clears the stored snapshot; non-null values must already satisfy the snapshot API contract. */
  details: SecondaryOrderSnapshotPayload | null
  isLatestLlmComment: boolean
}

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
