import type { SecondaryOrderSnapshotPayload } from './snapshot'

export interface CandidateStashSummary {
  uuid: string
  name: string
  note: string | null
  productId: string
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
  productId: string
  brand: string
  productCode: string
  productName: string
  qty: number
  /** Expected order amount in KRW; same meaning as details.drawer2.stockDerived.expectedOrderAmount. */
  expectedOrderAmount: number
  expectedSalesAmount: number
  /** Expected operating profit in KRW; same meaning as details.drawer2.stockDerived.expectedOpProfit. */
  expectedOpProfit: number
  insight: CandidateItemInsightSummary
  /** Whether the stored AI recommendation/comment reflects the latest saved snapshot. */
  isLatestLlmComment: boolean
  dbCreatedAt: string
  dbUpdatedAt: string
}

/**
 * Backend-driven badge definition map.
 * The response owns badge color/tooltip metadata, while each item carries only
 * badge names that reference this map.
 */
export interface CandidateBadgeDefinition {
  color: string
  tooltip: string
}

export type CandidateBadgeDefinitionMap = Record<string, CandidateBadgeDefinition>

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
  badgeNames: string[]
}

export interface CandidateItemListResult {
  items: CandidateItemSummary[]
  badgeDefinitions: CandidateBadgeDefinitionMap
}

/** Candidate item detail response with the saved order snapshot JSON. */
export interface CandidateItemDetail {
  uuid: string
  stashUuid: string
  productId: string
  details: SecondaryOrderSnapshotPayload
  isLatestLlmComment: boolean
  dbCreatedAt: string
  dbUpdatedAt: string
}

export interface CreateCandidateStashPayload {
  productId: string
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
  productId: string
  details: SecondaryOrderSnapshotPayload
  isLatestLlmComment: boolean
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
