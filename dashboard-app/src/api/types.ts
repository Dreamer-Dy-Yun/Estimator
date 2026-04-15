import type {
  CompetitorSalesRow,
  OrderPlanRow,
  ProductPrimarySummary,
  ProductSecondaryDetail,
  SelfSalesRow,
} from '../types'

/** Query params for self sales list (keep in sync with backend when wired). */
export type SelfSalesParams = {
  startDate?: string
  endDate?: string
  brand?: string
  category?: string
}

/** 경쟁 분석 목록 — 자사 필터 + 선택 경쟁 채널(목업은 스큐 반영). */
export type CompetitorSalesParams = SelfSalesParams & {
  competitorChannelId?: string
}

/** One point on the product stock time series. */
export type ProductStockTrendPoint = {
  date: string
  stock: number
  inboundExpected: number
  expectedInboundDate: string | null
}

/** Filter and period UI metadata for self analysis (single fetch). */
export type SelfSalesFilterMeta = {
  brands: string[]
  categories: string[]
  /** Closed historical months axis (vs forecast months), e.g. period sliders. */
  historicalMonths: string[]
}

/** 1차 드로어 번들 요청 옵션 — 판매추이(월간) 포캐스트 구간 길이. */
export type ProductDrawerBundleParams = {
  /** 포캐스트로 포함할 월 수. 1~24, 생략 시 구현체 기본값(8). */
  forecastMonths?: number
}

/** 1차 드로어: 자사 요약 + 재고 시계열만. 경쟁·2차 전용은 `getProductSecondaryDetail`. */
export type ProductDrawerBundle = {
  summary: ProductPrimarySummary
  stockTrend: ProductStockTrendPoint[]
}

export type SecondaryDailyTrendPoint = {
  idx: number
  date: string
  month: string
  sales: number
  stockBar: number
  inboundAccumBar: number
  isForecast: boolean
}

export type SecondaryDailyTrendParams = {
  productId: string
  startMonth: string
  leadTimeDays: number
}

export type SecondaryCompetitorChannel = {
  id: string
  label: string
  priceSkew: number
  qtySkew: number
}

export type SecondaryLlmAnswerParams = {
  productId: string
  prompt: string
}

export type SecondaryOrderSnapshotPayload = {
  snapshotId: string
  productId: string
  savedAt: string
  periodStart: string
  periodEnd: string
  competitorChannelId: string
  minOpMarginPct: number
  salesSelf: unknown
  salesCompetitor: unknown
  stockInputs: unknown
  stockDerived: unknown
  llmPrompt: string
  llmAnswer: string
  selfWeightPct: number
  sizeRows: unknown[]
}

export type SecondaryStockOrderCalcParams = {
  productId: string
  periodStart: string
  periodEnd: string
  serviceLevelPct: number
  leadTimeDays: number
}

export type SecondaryStockOrderCalcResult = {
  safetyStockCalc: {
    safetyStock: number
    recommendedOrderQty: number
    expectedOrderAmount: number
    expectedSalesAmount: number
    expectedOpProfit: number
  }
  forecastQtyCalc: {
    safetyStock: null
    recommendedOrderQty: number
    expectedOrderAmount: number
    expectedSalesAmount: number
    expectedOpProfit: number
  }
}

/**
 * Dashboard data access contract.
 * Implemented by mock today; swap for HTTP client later.
 */
export interface DashboardApi {
  getSelfSales(params?: SelfSalesParams): Promise<SelfSalesRow[]>
  getCompetitorSales(params?: CompetitorSalesParams): Promise<CompetitorSalesRow[]>
  getOrderPlan(): Promise<OrderPlanRow[]>
  getSelfSalesFilterMeta(): Promise<SelfSalesFilterMeta>
  getProductDrawerBundle(id: string, params?: ProductDrawerBundleParams): Promise<ProductDrawerBundle>
  getProductSecondaryDetail(id: string): Promise<ProductSecondaryDetail>
  getSecondaryDailyTrend(params: SecondaryDailyTrendParams): Promise<SecondaryDailyTrendPoint[]>
  getSecondaryCompetitorChannels(): Promise<SecondaryCompetitorChannel[]>
  getSecondaryLlmAnswer(params: SecondaryLlmAnswerParams): Promise<string>
  saveSecondaryOrderSnapshot(snapshot: SecondaryOrderSnapshotPayload): Promise<void>
  getSecondaryStockOrderCalc(params: SecondaryStockOrderCalcParams): Promise<SecondaryStockOrderCalcResult>
}

export type { MonthlySalesPoint, ProductPrimarySummary, ProductSecondaryDetail } from '../types'
