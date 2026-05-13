import type {
  CompetitorSalesRow,
  ProductSecondaryDetail,
  SelfSalesRow,
} from '../../types'
import type {
  ProductDrawerBundle,
  ProductMonthlyTrend,
  ProductMonthlyTrendParams,
  ProductSalesInsight,
  ProductSalesInsightParams,
} from './drawer'
import type {
  CompetitorSalesGridParams,
  CompetitorSalesParams,
  SalesFilterMeta,
  SelfSalesGridParams,
  SelfSalesParams,
  ScatterSalesGridResponse,
} from './sales'
import type {
  AppendCandidateItemPayload,
  AppendCandidateItemsPayload,
  UpdateCandidateItemPayload,
  CandidateItemDetail,
  CandidateItemListParams,
  CandidateItemListResult,
  CandidateRecommendationParams,
  CandidateRecommendationResult,
  CandidateStashAnalysisHandlers,
  CandidateStashAnalysisStartResult,
  CandidateStashAnalysisSubscription,
  CandidateStashExcelTemplateDownload,
  CandidateStashExcelUploadResult,
  CandidateStashSummary,
  CreateCandidateStashPayload,
  UpdateCandidateStashPayload,
} from './candidate'
import type {
  ProductSecondaryDetailParams,
  SecondaryCompetitorChannel,
  SecondaryDailyTrendParams,
  SecondaryDailyTrendPoint,
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
  getSelfSalesScatterGrid(params?: SelfSalesGridParams): Promise<ScatterSalesGridResponse>
  getCompetitorSalesScatterGrid(
    params?: CompetitorSalesGridParams,
  ): Promise<ScatterSalesGridResponse>
  getSalesFilterMeta(): Promise<SalesFilterMeta>
  getProductDrawerBundle(skuGroupKey: string): Promise<ProductDrawerBundle>
  getProductMonthlyTrend(skuGroupKey: string, params: ProductMonthlyTrendParams): Promise<ProductMonthlyTrend>
  getProductSalesInsight(skuGroupKey: string, params: ProductSalesInsightParams): Promise<ProductSalesInsight>
  getProductSecondaryDetail(
    skuGroupKey: string,
    params?: ProductSecondaryDetailParams,
  ): Promise<ProductSecondaryDetail>
  getSecondaryDailyTrend(params: SecondaryDailyTrendParams): Promise<SecondaryDailyTrendPoint[]>
  getSecondaryCompetitorChannels(): Promise<SecondaryCompetitorChannel[]>
  getCandidateStashes(): Promise<CandidateStashSummary[]>
  getCandidateItemsByStash(params: CandidateItemListParams): Promise<CandidateItemListResult>
  getCandidateRecommendations(params: CandidateRecommendationParams): Promise<CandidateRecommendationResult>
  getCandidateItemByUuid(itemUuid: string): Promise<CandidateItemDetail | null>
  deleteCandidateItem(itemUuid: string): Promise<void>
  deleteCandidateItems(stashUuid: string, itemUuids: string[]): Promise<void>
  deleteCandidateStash(stashUuid: string): Promise<void>
  createCandidateStash(payload: CreateCandidateStashPayload): Promise<CandidateStashSummary>
  updateCandidateStash(payload: UpdateCandidateStashPayload): Promise<CandidateStashSummary>
  duplicateCandidateStash(stashUuid: string): Promise<void>
  appendCandidateItem(payload: AppendCandidateItemPayload): Promise<void>
  appendCandidateItems(payload: AppendCandidateItemsPayload): Promise<void>
  updateCandidateItem(payload: UpdateCandidateItemPayload): Promise<void>
  getCandidateStashExcelTemplateDownload(): CandidateStashExcelTemplateDownload
  uploadCandidateStashExcel(file: File): Promise<CandidateStashExcelUploadResult>
  startCandidateStashAnalysis(stashUuid: string): Promise<CandidateStashAnalysisStartResult>
  subscribeCandidateStashAnalysis(
    jobId: string,
    handlers: CandidateStashAnalysisHandlers,
  ): CandidateStashAnalysisSubscription
  getSecondaryStockOrderCalc(params: SecondaryStockOrderCalcParams): Promise<SecondaryStockOrderCalcResult>
}
