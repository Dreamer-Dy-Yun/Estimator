import type {
  CompetitorSalesRow,
  ProductSecondaryDetail,
  SelfSalesRow,
} from '../../types'
import type {
  ProductDrawerBundle,
  ProductDrawerBundleParams,
  ProductMonthlyTrend,
  ProductMonthlyTrendParams,
  ProductSalesInsight,
  ProductSalesInsightParams,
} from './drawer'
import type { CompanyScopeParams } from './company'
import type {
  CompetitorSalesGridParams,
  CompetitorSalesParams,
  SalesFilterMeta,
  SalesFilterMetaParams,
  SelfSalesGridParams,
  SelfSalesParams,
  ScatterSalesGridResponse,
} from './sales'
import type {
  AppendCandidateItemPayload,
  AppendCandidateItemsPayload,
  AppendCandidateItemsResponse,
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
  CandidateStashListParams,
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
export type DashboardEventStreamErrorListener = (error: unknown) => void

export interface DashboardApi {
  getSelfSales(params?: SelfSalesParams): Promise<SelfSalesRow[]>
  getCompetitorSales(params?: CompetitorSalesParams): Promise<CompetitorSalesRow[]>
  getSelfSalesScatterGrid(params?: SelfSalesGridParams): Promise<ScatterSalesGridResponse>
  getCompetitorSalesScatterGrid(
    params?: CompetitorSalesGridParams,
  ): Promise<ScatterSalesGridResponse>
  getSalesFilterMeta(params?: SalesFilterMetaParams): Promise<SalesFilterMeta>
  getProductDrawerBundle(
    skuGroupKey: string,
    params?: ProductDrawerBundleParams,
  ): Promise<ProductDrawerBundle>
  getProductMonthlyTrend(skuGroupKey: string, params: ProductMonthlyTrendParams): Promise<ProductMonthlyTrend>
  getProductSalesInsight(skuGroupKey: string, params: ProductSalesInsightParams): Promise<ProductSalesInsight>
  getProductSecondaryDetail(
    skuGroupKey: string,
    params?: ProductSecondaryDetailParams,
  ): Promise<ProductSecondaryDetail>
  getSecondaryDailyTrend(params: SecondaryDailyTrendParams): Promise<SecondaryDailyTrendPoint[]>
  getSecondaryAiComment(params: SecondaryAiCommentParams): Promise<SecondaryAiCommentResult>
  getSecondaryCompetitorChannels(): Promise<SecondaryCompetitorChannel[]>
  getCandidateStashes(params?: CandidateStashListParams): Promise<CandidateStashSummary[]>
  getCandidateItemsByStash(params: CandidateItemListParams): Promise<CandidateItemListResult>
  subscribeCandidateOrderMetrics(
    params: CandidateOrderMetricStreamParams & CompanyScopeParams,
    listener: (event: CandidateOrderMetricEvent) => void,
    onError?: DashboardEventStreamErrorListener,
  ): CandidateOrderMetricSubscription
  startCandidateStashLlmCommentJob(
    stashUuid: string,
    params?: CompanyScopeParams,
  ): Promise<CandidateStashLlmCommentJobStartResult>
  subscribeCandidateStashLlmCommentJob(
    jobId: string,
    listener: (event: CandidateStashLlmCommentJobProgressEvent) => void,
    onError?: DashboardEventStreamErrorListener,
    params?: CompanyScopeParams,
  ): CandidateStashLlmCommentJobSubscription
  startCandidateDetailBulkConfirm(
    payload: CandidateDetailBulkConfirmStartPayload,
  ): Promise<CandidateDetailBulkConfirmStartResult>
  subscribeCandidateDetailBulkConfirm(
    jobId: string,
    listener: (event: CandidateDetailBulkConfirmProgressEvent) => void,
    onError?: DashboardEventStreamErrorListener,
    params?: CompanyScopeParams,
  ): CandidateDetailBulkConfirmSubscription
  getCandidateRecommendations(params: CandidateRecommendationParams): Promise<CandidateRecommendationResult>
  getCandidateItemByUuid(itemUuid: string, params?: CompanyScopeParams): Promise<CandidateItemDetail | null>
  deleteCandidateItem(itemUuid: string, params?: CompanyScopeParams): Promise<void>
  deleteCandidateItems(stashUuid: string, itemUuids: string[], params?: CompanyScopeParams): Promise<void>
  deleteCandidateStash(stashUuid: string, params?: CompanyScopeParams): Promise<void>
  createCandidateStash(payload: CreateCandidateStashPayload): Promise<CandidateStashSummary>
  updateCandidateStash(payload: UpdateCandidateStashPayload): Promise<CandidateStashSummary>
  duplicateCandidateStash(stashUuid: string, params?: CompanyScopeParams): Promise<void>
  appendCandidateItem(payload: AppendCandidateItemPayload): Promise<void>
  appendCandidateItems(payload: AppendCandidateItemsPayload): Promise<AppendCandidateItemsResponse>
  updateCandidateItem(payload: UpdateCandidateItemPayload): Promise<UpdateCandidateItemResponse>
  getCandidateStashExcelTemplateDownload(): CandidateStashExcelTemplateDownload
  uploadCandidateStashExcel(file: File, params?: CompanyScopeParams): Promise<CandidateStashExcelUploadResult>
  getSecondaryStockOrderCalc(params: SecondaryStockOrderCalcParams): Promise<SecondaryStockOrderCalcResult>
}
