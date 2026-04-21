import type {
  CompetitorSalesRow,
  OrderPlanRow,
  ProductSecondaryDetail,
  SelfSalesRow,
} from '../../types'
import type { ProductDrawerBundle, ProductDrawerBundleParams } from './drawer'
import type { CompetitorSalesParams, SelfSalesFilterMeta, SelfSalesParams } from './sales'
import type {
  AppendCandidateItemPayload,
  CandidateItemSummary,
  CandidateStashSummary,
  CreateCandidateStashPayload,
  ProductSecondaryDetailParams,
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
  getProductSecondaryDetail(
    id: string,
    params?: ProductSecondaryDetailParams,
  ): Promise<ProductSecondaryDetail>
  getSecondaryDailyTrend(params: SecondaryDailyTrendParams): Promise<SecondaryDailyTrendPoint[]>
  getSecondaryCompetitorChannels(): Promise<SecondaryCompetitorChannel[]>
  getSecondaryLlmAnswer(params: SecondaryLlmAnswerParams): Promise<string>
  saveSecondaryOrderSnapshot(snapshot: SecondaryOrderSnapshotPayload): Promise<void>
  getSecondaryOrderSnapshots(productId?: string): Promise<SecondaryOrderSnapshotPayload[]>
  deleteSecondaryOrderSnapshot(productId: string, savedAt: string): Promise<void>
  getCandidateStashes(productId?: string): Promise<CandidateStashSummary[]>
  getCandidateItemsByStash(stashUuid: string): Promise<CandidateItemSummary[]>
  deleteCandidateStash(stashUuid: string): Promise<void>
  createCandidateStash(payload: CreateCandidateStashPayload): Promise<CandidateStashSummary>
  appendCandidateItem(payload: AppendCandidateItemPayload): Promise<void>
  getSecondaryStockOrderCalc(params: SecondaryStockOrderCalcParams): Promise<SecondaryStockOrderCalcResult>
}
