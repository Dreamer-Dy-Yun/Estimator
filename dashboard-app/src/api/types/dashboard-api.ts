import type {
  CompetitorSalesRow,
  ProductSecondaryDetail,
  SelfSalesRow,
} from '../../types'
import type {
  ProductDrawerBundle,
  ProductDrawerBundleParams,
  ProductComparisonTarget,
  ProductComparisonTargetParams,
  ProductMonthlyTrend,
  ProductMonthlyTrendParams,
  ProductSalesInsight,
  ProductSalesInsightParams,
} from './drawer'
import type { CompanyMutationScopeParams, CompanyScopeParams } from './company'
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
  CandidateStashLlmCommentJobParams,
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
 * Implemented by HTTP and mock adapters; screens/hooks must depend on this interface only.
 * Mock behavior is a backend-contract substitute, not a UI fallback path.
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
    params: ProductDrawerBundleParams,
  ): Promise<ProductDrawerBundle>
  /** Empty target arrays are valid unavailable states; callers must not synthesize a default target. */
  getProductComparisonTargets(params: ProductComparisonTargetParams): Promise<ProductComparisonTarget[]>
  getProductMonthlyTrend(skuGroupKey: string, params: ProductMonthlyTrendParams): Promise<ProductMonthlyTrend>
  getProductSalesInsight(skuGroupKey: string, params: ProductSalesInsightParams): Promise<ProductSalesInsight>
  getProductSecondaryDetail(
    skuGroupKey: string,
    params: ProductSecondaryDetailParams,
  ): Promise<ProductSecondaryDetail>
  getSecondaryDailyTrend(params: SecondaryDailyTrendParams): Promise<SecondaryDailyTrendPoint[]>
  getSecondaryAiComment(params: SecondaryAiCommentParams): Promise<SecondaryAiCommentResult>
  getSecondaryCompetitorChannels(): Promise<SecondaryCompetitorChannel[]>
  getCandidateStashes(params?: CandidateStashListParams): Promise<CandidateStashSummary[]>
  getCandidateItemsByStash(params: CandidateItemListParams): Promise<CandidateItemListResult>
  /**
   * Streams candidate order metrics after a selected comparison target exists.
   * Requires concrete company scope, data reference period, requestId, item UUIDs, and comparison subject.
   * Snapshot rows project stored details; non-snapshot rows use the selected comparison for secondary calculation.
   */
  subscribeCandidateOrderMetrics(
    params: CandidateOrderMetricStreamParams,
    listener: (event: CandidateOrderMetricEvent) => void,
    onError?: DashboardEventStreamErrorListener,
  ): CandidateOrderMetricSubscription
  startCandidateStashLlmCommentJob(
    stashUuid: string,
    params: CandidateStashLlmCommentJobParams,
  ): Promise<CandidateStashLlmCommentJobStartResult>
  subscribeCandidateStashLlmCommentJob(
    jobId: string,
    listener: (event: CandidateStashLlmCommentJobProgressEvent) => void,
    onError: DashboardEventStreamErrorListener | undefined,
    params: CandidateStashLlmCommentJobParams,
  ): CandidateStashLlmCommentJobSubscription
  startCandidateDetailBulkConfirm(
    payload: CandidateDetailBulkConfirmStartPayload,
  ): Promise<CandidateDetailBulkConfirmStartResult>
  subscribeCandidateDetailBulkConfirm(
    jobId: string,
    listener: (event: CandidateDetailBulkConfirmProgressEvent) => void,
    onError: DashboardEventStreamErrorListener | undefined,
    params: CompanyMutationScopeParams,
  ): CandidateDetailBulkConfirmSubscription
  getCandidateRecommendations(params: CandidateRecommendationParams): Promise<CandidateRecommendationResult>
  getCandidateItemByUuid(itemUuid: string, params?: CompanyScopeParams): Promise<CandidateItemDetail | null>
  deleteCandidateItem(itemUuid: string, params: CompanyMutationScopeParams): Promise<void>
  deleteCandidateItems(stashUuid: string, itemUuids: string[], params: CompanyMutationScopeParams): Promise<void>
  deleteCandidateStash(stashUuid: string, params: CompanyMutationScopeParams): Promise<void>
  createCandidateStash(payload: CreateCandidateStashPayload): Promise<CandidateStashSummary>
  updateCandidateStash(payload: UpdateCandidateStashPayload): Promise<CandidateStashSummary>
  duplicateCandidateStash(stashUuid: string, params: CompanyMutationScopeParams): Promise<void>
  appendCandidateItem(payload: AppendCandidateItemPayload): Promise<void>
  appendCandidateItems(payload: AppendCandidateItemsPayload): Promise<AppendCandidateItemsResponse>
  updateCandidateItem(payload: UpdateCandidateItemPayload): Promise<UpdateCandidateItemResponse>
  getCandidateStashExcelTemplateDownload(): CandidateStashExcelTemplateDownload
  uploadCandidateStashExcel(file: File, params: CompanyMutationScopeParams): Promise<CandidateStashExcelUploadResult>
  getSecondaryStockOrderCalc(params: SecondaryStockOrderCalcParams): Promise<SecondaryStockOrderCalcResult>
}
