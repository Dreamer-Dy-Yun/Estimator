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

export type CandidateOrderMetricStatus = 'loading' | 'loaded' | 'failed'

export interface CandidateOrderMetric {
  itemUuid: string
  /** CANDIDATE_ITEM.sku_uuid, equal to SKU.uuid in the backend contract. */
  skuUuid: string
  qty: number
  expectedOrderAmount: number
  expectedSalesAmount: number
  expectedOpProfit: number
  orderExport: CandidateItemOrderExport
}

export interface CandidateOrderMetricStreamParams {
  stashUuid: string
  dataReferencePeriodStart: string
  dataReferencePeriodEnd: string
  requestId: string
  candidateItemUuids: string[]
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
