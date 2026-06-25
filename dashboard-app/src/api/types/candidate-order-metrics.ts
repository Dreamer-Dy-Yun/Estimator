import type { CompanyMutationScopeParams } from './company'
import type { ProductComparisonComparisonSubjectRef } from './drawer'

export interface CandidateItemOrderExportSizeQty {
  size: string
  orderQty: number
}

export interface CandidateItemOrderExportInboundRound {
  round: number
  inboundDate: string
  sizeOrderQty: CandidateItemOrderExportSizeQty[]
}

export interface CandidateItemOrderExport {
  /** Label for the selected comparison subject used by order metric and export fields. */
  comparisonSubjectLabel: string
  selfQty: number | null
  competitorQty: number | null
  expectedSalesQty: number
  expectedOrderAmount: number
  avgCost: number | null
  avgPrice: number | null
  feeRatePct: number | null
  opMarginRatePct: number | null
  inboundExpectedDate: string | null
  inboundRounds: CandidateItemOrderExportInboundRound[]
  sizeOrderQty: CandidateItemOrderExportSizeQty[]
}

export type CandidateOrderMetricStatus = 'loading' | 'loaded' | 'failed'
/** 'snapshot' ignores current target selection; 'secondary-calc' recalculates from the selected comparison subject. */
export type CandidateOrderMetricSource = 'snapshot' | 'secondary-calc'

export interface CandidateOrderMetric {
  itemUuid: string
  /** CANDIDATE_ITEM.sku_uuid, equal to SKU.uuid in the backend contract. */
  skuUuid: string
  /** Snapshot-backed rows must not be recalculated by the comparison selector. */
  source: CandidateOrderMetricSource
  /** Confirmed total order quantity used by the inner order list. */
  qty: number
  expectedOrderAmount: number
  expectedSalesAmount: number
  expectedOpProfit: number
  orderExport: CandidateItemOrderExport
}

/**
 * Order metric SSE request. Open only when company scope and selected comparison target are available.
 * If target selection settles unavailable, callers should not open this stream.
 */
export interface CandidateOrderMetricStreamParams extends CompanyMutationScopeParams {
  stashUuid: string
  dataReferencePeriodStart: string
  dataReferencePeriodEnd: string
  requestId: string
  candidateItemUuids: string[]
  /** Size comparison basis used only for non-snapshot secondary order calculation. */
  comparison: ProductComparisonComparisonSubjectRef
}

export type CandidateOrderMetricEvent =
  | {
      type: 'item'
      requestId: string
      itemUuid: string
      skuUuid: string
      metric: CandidateOrderMetric
    }
  | {
      type: 'itemFailed'
      requestId: string
      itemUuid: string
      skuUuid: string
      message: string
    }
  | {
      type: 'completed'
      requestId: string
      processedCount: number
      failedCount: number
    }

export interface CandidateOrderMetricSubscription {
  close: () => void
}
