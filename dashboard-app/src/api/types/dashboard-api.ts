import type {
  CompetitorSalesRow,
  ProductSecondaryDetail,
  SelfSalesRow,
} from '../../types'
import type {
  ProductDrawerBundle,
  ProductDrawerBundleParams,
  ProductSalesInsight,
  ProductSalesInsightParams,
} from './drawer'
import type { CompetitorSalesParams, SelfSalesFilterMeta, SelfSalesParams } from './sales'
import type {
  AppendCandidateItemPayload,
  UpdateCandidateItemPayload,
  CandidateItemDetail,
  CandidateItemSummary,
  CandidateStashAnalysisHandlers,
  CandidateStashAnalysisStartResult,
  CandidateStashAnalysisSubscription,
  CandidateStashExcelUploadResult,
  CandidateStashSummary,
  CreateCandidateStashPayload,
  UpdateCandidateStashPayload,
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
  getSelfSalesFilterMeta(): Promise<SelfSalesFilterMeta>
  getProductDrawerBundle(id: string, params?: ProductDrawerBundleParams): Promise<ProductDrawerBundle>
  getProductSalesInsight(id: string, params: ProductSalesInsightParams): Promise<ProductSalesInsight>
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
  getCandidateItemByUuid(itemUuid: string): Promise<CandidateItemDetail | null>
  deleteCandidateItem(itemUuid: string): Promise<void>
  deleteCandidateStash(stashUuid: string): Promise<void>
  createCandidateStash(payload: CreateCandidateStashPayload): Promise<CandidateStashSummary>
  updateCandidateStash(payload: UpdateCandidateStashPayload): Promise<CandidateStashSummary>
  duplicateCandidateStash(stashUuid: string): Promise<void>
  appendCandidateItem(payload: AppendCandidateItemPayload): Promise<void>
  updateCandidateItem(payload: UpdateCandidateItemPayload): Promise<void>
  uploadCandidateStashExcel(file: File): Promise<CandidateStashExcelUploadResult>
  startCandidateStashAnalysis(stashUuid: string): Promise<CandidateStashAnalysisStartResult>
  subscribeCandidateStashAnalysis(
    jobId: string,
    handlers: CandidateStashAnalysisHandlers,
  ): CandidateStashAnalysisSubscription
  getSecondaryStockOrderCalc(params: SecondaryStockOrderCalcParams): Promise<SecondaryStockOrderCalcResult>
}
