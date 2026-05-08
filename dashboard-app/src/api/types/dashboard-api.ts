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
import type { CompetitorSalesParams, SelfSalesFilterMeta, SelfSalesParams } from './sales'
import type {
  AppendCandidateItemPayload,
  UpdateCandidateItemPayload,
  CandidateItemDetail,
  CandidateItemListResult,
  CandidateRecommendationParams,
  CandidateRecommendationResult,
  CandidateStashAnalysisHandlers,
  CandidateStashAnalysisStartResult,
  CandidateStashAnalysisSubscription,
  CandidateStashOrderExcelDownload,
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
  getSelfSalesFilterMeta(): Promise<SelfSalesFilterMeta>
  getProductDrawerBundle(id: string): Promise<ProductDrawerBundle>
  getProductMonthlyTrend(id: string, params: ProductMonthlyTrendParams): Promise<ProductMonthlyTrend>
  getProductSalesInsight(id: string, params: ProductSalesInsightParams): Promise<ProductSalesInsight>
  getProductSecondaryDetail(
    id: string,
    params?: ProductSecondaryDetailParams,
  ): Promise<ProductSecondaryDetail>
  getSecondaryDailyTrend(params: SecondaryDailyTrendParams): Promise<SecondaryDailyTrendPoint[]>
  getSecondaryCompetitorChannels(): Promise<SecondaryCompetitorChannel[]>
  getCandidateStashes(productId?: string): Promise<CandidateStashSummary[]>
  getCandidateItemsByStash(stashUuid: string): Promise<CandidateItemListResult>
  getCandidateRecommendations(params: CandidateRecommendationParams): Promise<CandidateRecommendationResult>
  getCandidateItemByUuid(itemUuid: string): Promise<CandidateItemDetail | null>
  deleteCandidateItem(itemUuid: string): Promise<void>
  deleteCandidateItems(stashUuid: string, itemUuids: string[]): Promise<void>
  deleteCandidateStash(stashUuid: string): Promise<void>
  createCandidateStash(payload: CreateCandidateStashPayload): Promise<CandidateStashSummary>
  updateCandidateStash(payload: UpdateCandidateStashPayload): Promise<CandidateStashSummary>
  duplicateCandidateStash(stashUuid: string): Promise<void>
  appendCandidateItem(payload: AppendCandidateItemPayload): Promise<void>
  updateCandidateItem(payload: UpdateCandidateItemPayload): Promise<void>
  getCandidateStashExcelTemplateDownload(): CandidateStashExcelTemplateDownload
  downloadCandidateStashOrderExcel(stashUuid: string, userName: string): Promise<CandidateStashOrderExcelDownload>
  uploadCandidateStashExcel(file: File): Promise<CandidateStashExcelUploadResult>
  startCandidateStashAnalysis(stashUuid: string): Promise<CandidateStashAnalysisStartResult>
  subscribeCandidateStashAnalysis(
    jobId: string,
    handlers: CandidateStashAnalysisHandlers,
  ): CandidateStashAnalysisSubscription
  getSecondaryStockOrderCalc(params: SecondaryStockOrderCalcParams): Promise<SecondaryStockOrderCalcResult>
}
