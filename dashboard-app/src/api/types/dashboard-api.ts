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
  CandidateItemDetail,
  CandidateItemListParams,
  CandidateItemListResult,
  CandidateDetailBulkConfirmProgressEvent,
  CandidateDetailBulkConfirmStartPayload,
  CandidateDetailBulkConfirmStartResult,
  CandidateDetailBulkConfirmSubscription,
  CandidateStashLlmCommentJobProgressEvent,
  CandidateStashLlmCommentJobStartResult,
  CandidateStashLlmCommentJobSubscription,
  CandidateRecommendationParams,
  CandidateRecommendationResult,
  CandidateStashExcelTemplateDownload,
  CandidateStashExcelUploadResult,
  CandidateStashSummary,
  CreateCandidateStashPayload,
  UpdateCandidateItemPayload,
  UpdateCandidateItemResponse,
  UpdateCandidateStashPayload,
} from './candidate'
import type {
  CandidateOrderMetricEvent,
  CandidateOrderMetricStreamParams,
  CandidateOrderMetricSubscription,
} from './candidate-order-metrics'
import type {
  SecondaryAiCommentParams,
  SecondaryAiCommentResult,
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
  getSecondaryAiComment(params: SecondaryAiCommentParams): Promise<SecondaryAiCommentResult>
  getSecondaryCompetitorChannels(): Promise<SecondaryCompetitorChannel[]>
  getCandidateStashes(): Promise<CandidateStashSummary[]>
  getCandidateItemsByStash(params: CandidateItemListParams): Promise<CandidateItemListResult>
  subscribeCandidateOrderMetrics(
    params: CandidateOrderMetricStreamParams,
    listener: (event: CandidateOrderMetricEvent) => void,
  ): CandidateOrderMetricSubscription
  startCandidateStashLlmCommentJob(stashUuid: string): Promise<CandidateStashLlmCommentJobStartResult>
  subscribeCandidateStashLlmCommentJob(
    jobId: string,
    listener: (event: CandidateStashLlmCommentJobProgressEvent) => void,
  ): CandidateStashLlmCommentJobSubscription
  startCandidateDetailBulkConfirm(
    payload: CandidateDetailBulkConfirmStartPayload,
  ): Promise<CandidateDetailBulkConfirmStartResult>
  subscribeCandidateDetailBulkConfirm(
    jobId: string,
    listener: (event: CandidateDetailBulkConfirmProgressEvent) => void,
  ): CandidateDetailBulkConfirmSubscription
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
  updateCandidateItem(payload: UpdateCandidateItemPayload): Promise<UpdateCandidateItemResponse>
  getCandidateStashExcelTemplateDownload(): CandidateStashExcelTemplateDownload
  uploadCandidateStashExcel(file: File): Promise<CandidateStashExcelUploadResult>
  getSecondaryStockOrderCalc(params: SecondaryStockOrderCalcParams): Promise<SecondaryStockOrderCalcResult>
}
