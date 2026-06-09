import type { AppendCandidateItemsResponse, AuthSession, CandidateDetailBulkConfirmProgressEvent, CandidateDetailBulkConfirmStartPayload, CandidateDetailBulkConfirmStartResult, CandidateItemDetail, CandidateItemListParams, CandidateItemListResult, CandidateOrderMetricEvent, CandidateOrderMetricStreamParams, CandidateOrderMetricSubscription, CandidateRecommendationParams, CandidateRecommendationResult, CandidateStashExcelUploadResult, CandidateStashLlmCommentJobProgressEvent, CandidateStashLlmCommentJobStartResult, CandidateStashSummary, CompanyScopeParams, CompetitorSalesParams, DashboardEventStreamErrorListener, ProductComparisonTarget, SecondaryCompetitorChannel, SelfSalesParams, UpdateCandidateItemPayload } from '..'
import type { AppendCandidateItemPayload, AppendCandidateItemsPayload, CompanyMutationScopeParams, CreateCandidateStashPayload, UpdateCandidateStashPayload } from '../types'
import type { CandidateJobSubscription, CandidateStashListParams } from '../types/candidate'
import type { CompetitorSalesRow, SelfSalesRow } from '../../types'
import { mockAuthApi, mockDashboardApi } from '../mock'
import type {
  CandidateStashExcelTemplateDownload,
  CompetitorSalesGridParams,
  DashboardApi,
  ProductComparisonTargetParams,
  ProductDrawerBundle,
  ProductDrawerBundleParams,
  ProductMonthlyTrend,
  ProductMonthlyTrendParams,
  ProductSalesInsight,
  ProductSalesInsightParams,
  ProductSecondaryDetail,
  ProductSecondaryDetailParams,
  SalesFilterMetaParams,
  ScatterSalesGridResponse,
  SecondaryAiCommentParams,
  SecondaryAiCommentResult,
  SecondaryDailyTrendParams,
  SecondaryDailyTrendPoint,
  SecondaryStockOrderCalcParams,
  SecondaryStockOrderCalcResult,
  SelfSalesGridParams,
} from '../types'
import {
  candidateStashExcelTemplateAsset,
  candidateStashExcelTemplateFilename,
  resolvePublicAssetUrl,
} from './dashboardRequestShared'

async function requireCurrentUserUuid(): Promise<string> {
  const session: AuthSession | null = await mockAuthApi.getCurrentSession()
  if (!session) throw new Error('로그인이 필요합니다.')
  return session.user.uuid
}

async function withCurrentUserUuid<T>(request: (userUuid: string) => Promise<T>): Promise<T> {
  return request(await requireCurrentUserUuid())
}

function withCurrentUserStream<S extends { close: () => void }>(
  connect: (userUuid: string) => S,
  onError?: (error: unknown) => void,
): S {
  let subscription: S | null = null
  let closed: boolean = false
  void requireCurrentUserUuid()
    .then((userUuid: string) : void => {
      if (closed) return
      subscription = connect(userUuid)
      if (closed) subscription.close()
    })
    .catch((error: unknown) : void => {
      if (!closed) onError?.(error)
    })
  return { close: () : void => { closed = true; subscription?.close() } } as S
}

const getCandidateStashExcelTemplateDownload: () => CandidateStashExcelTemplateDownload = (): CandidateStashExcelTemplateDownload => ({
  href: resolvePublicAssetUrl(candidateStashExcelTemplateAsset),
  filename: candidateStashExcelTemplateFilename,
})

export const mockDashboardRequests: DashboardApi = {
  getSelfSales: (params: SelfSalesParams | undefined): Promise<SelfSalesRow[]> => mockDashboardApi.getSelfSales(params),
  getCompetitorSales: (params: CompetitorSalesParams | undefined): Promise<CompetitorSalesRow[]> => mockDashboardApi.getCompetitorSales(params),
  getSelfSalesScatterGrid: (params: SelfSalesGridParams): Promise<ScatterSalesGridResponse> => mockDashboardApi.getSelfSalesScatterGrid(params),
  getCompetitorSalesScatterGrid: (params: CompetitorSalesGridParams): Promise<ScatterSalesGridResponse> => mockDashboardApi.getCompetitorSalesScatterGrid(params),
  getSalesFilterMeta: (params?: SalesFilterMetaParams) : Promise<{ brands: string[]; categories: string[]; codes: string[]; colorCodes: string[]; productNames: string[]; historicalMonths: string[]; }> => mockDashboardApi.getSalesFilterMeta(params),
  getProductDrawerBundle: (skuGroupKey: string, params: ProductDrawerBundleParams): Promise<ProductDrawerBundle> => mockDashboardApi.getProductDrawerBundle(skuGroupKey, params),
  getProductComparisonTargets: (params: ProductComparisonTargetParams): Promise<ProductComparisonTarget[]> => mockDashboardApi.getProductComparisonTargets(params),
  getProductMonthlyTrend: (skuGroupKey: string, params: ProductMonthlyTrendParams): Promise<ProductMonthlyTrend> => mockDashboardApi.getProductMonthlyTrend(skuGroupKey, params),
  getProductSalesInsight: (skuGroupKey: string, params: ProductSalesInsightParams): Promise<ProductSalesInsight> => mockDashboardApi.getProductSalesInsight(skuGroupKey, params),
  getProductSecondaryDetail: (skuGroupKey: string, params: ProductSecondaryDetailParams): Promise<ProductSecondaryDetail> => mockDashboardApi.getProductSecondaryDetail(skuGroupKey, params),
  getSecondaryDailyTrend: (params: SecondaryDailyTrendParams): Promise<SecondaryDailyTrendPoint[]> => mockDashboardApi.getSecondaryDailyTrend(params),
  getSecondaryAiComment: (params: SecondaryAiCommentParams): Promise<SecondaryAiCommentResult> => mockDashboardApi.getSecondaryAiComment(params),
  getSecondaryCompetitorChannels: () : Promise<SecondaryCompetitorChannel[]> => mockDashboardApi.getSecondaryCompetitorChannels(),
  getSecondaryStockOrderCalc: (params: SecondaryStockOrderCalcParams): Promise<SecondaryStockOrderCalcResult> => mockDashboardApi.getSecondaryStockOrderCalc(params),

  getCandidateStashes: (params: CandidateStashListParams | undefined) : Promise<CandidateStashSummary[]> => withCurrentUserUuid((userUuid: string) : Promise<CandidateStashSummary[]> => mockDashboardApi.getCandidateStashes(userUuid, params)),
  getCandidateItemsByStash: (params: CandidateItemListParams) : Promise<CandidateItemListResult> => withCurrentUserUuid((userUuid: string) : Promise<CandidateItemListResult> => mockDashboardApi.getCandidateItemsByStash(params, userUuid)),
  subscribeCandidateOrderMetrics: (params: CandidateOrderMetricStreamParams, listener: (event: CandidateOrderMetricEvent) => void, onError: DashboardEventStreamErrorListener | undefined) : CandidateOrderMetricSubscription => withCurrentUserStream(
    (userUuid: string) : CandidateOrderMetricSubscription => mockDashboardApi.subscribeCandidateOrderMetrics(params, listener, userUuid),
    onError,
  ),
  startCandidateStashLlmCommentJob: (stashUuid: string, params: CompanyMutationScopeParams) : Promise<CandidateStashLlmCommentJobStartResult> => withCurrentUserUuid(
    (userUuid: string) : Promise<CandidateStashLlmCommentJobStartResult> => mockDashboardApi.startCandidateStashLlmCommentJob(stashUuid, userUuid, params),
  ),
  subscribeCandidateStashLlmCommentJob: (jobId: string, listener: (event: CandidateStashLlmCommentJobProgressEvent) => void, onError: DashboardEventStreamErrorListener | undefined, params: CompanyMutationScopeParams) : CandidateJobSubscription => withCurrentUserStream(
    (userUuid: string) : CandidateJobSubscription => mockDashboardApi.subscribeCandidateStashLlmCommentJob(jobId, listener, userUuid, params),
    onError,
  ),
  startCandidateDetailBulkConfirm: (payload: CandidateDetailBulkConfirmStartPayload) : Promise<CandidateDetailBulkConfirmStartResult> => withCurrentUserUuid((userUuid: string) : Promise<CandidateDetailBulkConfirmStartResult> => mockDashboardApi.startCandidateDetailBulkConfirm(payload, userUuid)),
  subscribeCandidateDetailBulkConfirm: (jobId: string, listener: (event: CandidateDetailBulkConfirmProgressEvent) => void, onError: DashboardEventStreamErrorListener | undefined, params: CompanyMutationScopeParams) : CandidateJobSubscription => withCurrentUserStream(
    (userUuid: string) : CandidateJobSubscription => mockDashboardApi.subscribeCandidateDetailBulkConfirm(jobId, listener, userUuid, params),
    onError,
  ),
  getCandidateRecommendations: (params: CandidateRecommendationParams) : Promise<CandidateRecommendationResult> => withCurrentUserUuid((userUuid: string) : Promise<CandidateRecommendationResult> => mockDashboardApi.getCandidateRecommendations(params, userUuid)),
  getCandidateItemByUuid: (itemUuid: string, params: CompanyScopeParams | undefined) : Promise<CandidateItemDetail | null> => withCurrentUserUuid((userUuid: string) : Promise<CandidateItemDetail | null> => mockDashboardApi.getCandidateItemByUuid(itemUuid, userUuid, params)),
  deleteCandidateItem: (itemUuid: string, params: CompanyMutationScopeParams) : Promise<void> => withCurrentUserUuid((userUuid: string) : Promise<void> => mockDashboardApi.deleteCandidateItem(itemUuid, userUuid, params)),
  deleteCandidateItems: (stashUuid: string, itemUuids: string[], params: CompanyMutationScopeParams) : Promise<void> => withCurrentUserUuid((userUuid: string) : Promise<void> => mockDashboardApi.deleteCandidateItems(stashUuid, itemUuids, userUuid, params)),
  deleteCandidateStash: (stashUuid: string, params: CompanyMutationScopeParams) : Promise<void> => withCurrentUserUuid((userUuid: string) : Promise<void> => mockDashboardApi.deleteCandidateStash(stashUuid, userUuid, params)),
  createCandidateStash: (payload: CreateCandidateStashPayload) : Promise<CandidateStashSummary> => withCurrentUserUuid((userUuid: string) : Promise<CandidateStashSummary> => mockDashboardApi.createCandidateStash(payload, userUuid)),
  updateCandidateStash: (payload: UpdateCandidateStashPayload) : Promise<CandidateStashSummary> => withCurrentUserUuid((userUuid: string) : Promise<CandidateStashSummary> => mockDashboardApi.updateCandidateStash(payload, userUuid)),
  duplicateCandidateStash: (stashUuid: string, params: CompanyMutationScopeParams) : Promise<void> => withCurrentUserUuid((userUuid: string) : Promise<void> => mockDashboardApi.duplicateCandidateStash(stashUuid, userUuid, params)),
  appendCandidateItem: (payload: AppendCandidateItemPayload) : Promise<void> => withCurrentUserUuid((userUuid: string) : Promise<void> => mockDashboardApi.appendCandidateItem(payload, userUuid)),
  appendCandidateItems: (payload: AppendCandidateItemsPayload) : Promise<AppendCandidateItemsResponse> => withCurrentUserUuid((userUuid: string) : Promise<AppendCandidateItemsResponse> => mockDashboardApi.appendCandidateItems(payload, userUuid)),
  updateCandidateItem: (payload: UpdateCandidateItemPayload) : Promise<CandidateItemDetail> => withCurrentUserUuid((userUuid: string) : Promise<CandidateItemDetail> => mockDashboardApi.updateCandidateItem(payload, userUuid)),
  uploadCandidateStashExcel: (file: File, params: CompanyMutationScopeParams) : Promise<CandidateStashExcelUploadResult> => withCurrentUserUuid((userUuid: string) : Promise<CandidateStashExcelUploadResult> => mockDashboardApi.uploadCandidateStashExcel(file, userUuid, params)),
  getCandidateStashExcelTemplateDownload,
}
