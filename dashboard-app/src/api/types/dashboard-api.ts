import type {
  CompetitorSalesRow,
  OrderPlanRow,
  ProductSecondaryDetail,
  SelfSalesRow,
} from '../../types'
import type { ProductDrawerBundle, ProductDrawerBundleParams } from './drawer'
import type { CompetitorSalesParams, SelfSalesFilterMeta, SelfSalesParams } from './sales'
import type {
  SecondaryCompetitorChannel,
  SecondaryDailyTrendParams,
  SecondaryDailyTrendPoint,
  SecondaryLlmAnswerParams,
  SecondaryOrderSnapshotPayload,
  SecondaryStockOrderCalcParams,
  SecondaryStockOrderCalcResult,
} from './secondary'

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
