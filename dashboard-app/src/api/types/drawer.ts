import type { ProductPrimarySummary } from '../../types'

/** One point on the product stock time series. */
export interface ProductStockTrendPoint {
  date: string
  stock: number
  /** 1차 드로어·포캐스트 표시용(과거 월은 0일 수 있음) */
  inboundExpected: number
  /** 해당 월 실제 입고 수량(일간 추이 시뮬 등). 없으면 `inboundExpected`로 대체 */
  inboundQty?: number
}

/** 1차 드로어 번들 요청 옵션 — 판매추이(월간) 포캐스트 구간 길이. */
export interface ProductDrawerBundleParams {
  /** 포캐스트로 포함할 월 수. 1~24, 생략 시 구현체 기본값(8). */
  forecastMonths?: number
}

/** 1차 드로어: 자사 요약 + 재고 시계열만. 경쟁·2차 전용은 `getProductSecondaryDetail(id, params?)`. */
export interface ProductDrawerBundle {
  summary: ProductPrimarySummary
  stockTrend: ProductStockTrendPoint[]
}

export interface ProductSalesInsightParams {
  startDate: string
  endDate: string
  competitorChannelId?: string
}

export interface ProductSalesInsightColumn {
  avgPrice: number
  qty: number
  amount: number
  avgCost: number | null
  grossMarginPerUnit: number | null
  feePerUnit: number | null
  feeRatePct: number | null
  opMarginPerUnit: number | null
  opMarginRatePct: number | null
  qtyRank: number
  amountRank: number
  feeRank: number | null
  opMarginRank: number | null
  rankTotal: number
  costRatioPct: number | null
}

export interface ProductSalesInsight {
  productId: string
  targetPeriodDays: {
    start: string
    end: string
  }
  competitorChannelId: string
  competitorChannelLabel: string
  self: ProductSalesInsightColumn
  competitor: ProductSalesInsightColumn
}
