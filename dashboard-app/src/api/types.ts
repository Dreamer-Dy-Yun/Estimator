import type { CompetitorSalesRow, OrderPlanRow, ProductSummary, SelfSalesRow } from '../types'

/** Query params for self sales list (keep in sync with backend when wired). */
export type SelfSalesParams = {
  startDate?: string
  endDate?: string
  brand?: string
  category?: string
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

/** Primary drawer: product summary + stock trend. Secondary detail is a separate fetch. */
export type ProductSummaryBundle = {
  summary: ProductSummary
  stockTrend: ProductStockTrendPoint[]
}

/**
 * Dashboard data access contract.
 * Implemented by mock today; swap for HTTP client later.
 */
export interface DashboardApi {
  getSelfSales(params?: SelfSalesParams): Promise<SelfSalesRow[]>
  getCompetitorSales(): Promise<CompetitorSalesRow[]>
  getOrderPlan(): Promise<OrderPlanRow[]>
  getSelfSalesFilterMeta(): Promise<SelfSalesFilterMeta>
  getProductSummaryBundle(id: string): Promise<ProductSummaryBundle>
}
