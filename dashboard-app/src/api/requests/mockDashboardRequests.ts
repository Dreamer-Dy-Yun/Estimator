import type { AppendCandidateItemsResponse, AuthSession, CandidateDetailBulkConfirmProgressEvent, CandidateDetailBulkConfirmStartPayload, CandidateDetailBulkConfirmStartResult, CandidateItemDetail, CandidateItemListParams, CandidateItemListResult, CandidateOrderMetricEvent, CandidateOrderMetricStreamParams, CandidateOrderMetricSubscription, CandidateRecommendationParams, CandidateRecommendationResult, CandidateStashExcelUploadResult, CandidateStashLlmCommentJobProgressEvent, CandidateStashLlmCommentJobStartResult, CandidateStashSummary, CompanyScopeParams, CompetitorSalesParams, DashboardEventStreamErrorListener, DashboardRuntimeConfig, ProductComparisonTarget, SecondaryCompetitorChannel, SelfSalesParams, UpdateCandidateItemPayload } from '..'
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
  SecondaryDailyTrendSource,
  SecondaryStockOrderCalcParams,
  SecondaryStockOrderCalcResult,
  SelfSalesGridParams,
} from '../types'
import {
  candidateStashExcelTemplateAsset,
  candidateStashExcelTemplateFilename,
} from './dashboardRequestShared'
import { resolvePublicAssetUrl } from '../publicAsset'
import { notifyMockStreamError, withMockApiAdapterErrors } from './mockApiError'

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
      if (!closed) notifyMockStreamError(onError, error)
    })
  return { close: () : void => { closed = true; subscription?.close() } } as S
}

const getCandidateStashExcelTemplateDownload: () => CandidateStashExcelTemplateDownload = (): CandidateStashExcelTemplateDownload => ({
  href: candidateStashExcelTemplateAsset.startsWith('/')
    ? candidateStashExcelTemplateAsset
    : resolvePublicAssetUrl(candidateStashExcelTemplateAsset),
  filename: candidateStashExcelTemplateFilename,
})

export const mockDashboardRequests: DashboardApi = withMockApiAdapterErrors<DashboardApi>({
  // GET /dashboard/runtime-config: 런타임 설정 조회.
  getDashboardRuntimeConfig: (): Promise<DashboardRuntimeConfig> => mockDashboardApi.getDashboardRuntimeConfig(),
  // GET /sales/self: 자사 판매 리스트 조회.
  getSelfSales: (params: SelfSalesParams | undefined): Promise<SelfSalesRow[]> => mockDashboardApi.getSelfSales(params),
  // GET /sales/competitor: 경쟁사 판매 리스트 조회.
  getCompetitorSales: (params: CompetitorSalesParams | undefined): Promise<CompetitorSalesRow[]> => mockDashboardApi.getCompetitorSales(params),
  // GET /sales/self/scatter-grid: 자사 scatter 집계.
  getSelfSalesScatterGrid: (params: SelfSalesGridParams): Promise<ScatterSalesGridResponse> => mockDashboardApi.getSelfSalesScatterGrid(params),
  // GET /sales/competitor/scatter-grid: 경쟁사 scatter 집계.
  getCompetitorSalesScatterGrid: (params: CompetitorSalesGridParams): Promise<ScatterSalesGridResponse> => mockDashboardApi.getCompetitorSalesScatterGrid(params),
  // GET /sales/filter-meta: 판매 필터 메타 조회.
  getSalesFilterMeta: (params?: SalesFilterMetaParams) : Promise<{ brands: string[]; categories: string[]; codes: string[]; colorCodes: string[]; productNames: string[]; historicalMonths: string[]; }> => mockDashboardApi.getSalesFilterMeta(params),
  // GET /products/{skuGroupKey}/drawer-bundle: 상품 드로어 기본 번들 조회.
  getProductDrawerBundle: (skuGroupKey: string, params: ProductDrawerBundleParams): Promise<ProductDrawerBundle> => mockDashboardApi.getProductDrawerBundle(skuGroupKey, params),
  // GET /products/comparison-targets: 비교 대상 목록 조회.
  getProductComparisonTargets: (params: ProductComparisonTargetParams): Promise<ProductComparisonTarget[]> => mockDashboardApi.getProductComparisonTargets(params),
  // GET /products/{skuGroupKey}/monthly-trend: 월간 추세 조회.
  getProductMonthlyTrend: (skuGroupKey: string, params: ProductMonthlyTrendParams): Promise<ProductMonthlyTrend> => mockDashboardApi.getProductMonthlyTrend(skuGroupKey, params),
  // GET /products/{skuGroupKey}/sales-insight: 상품 판매 인사이트 조회.
  getProductSalesInsight: (skuGroupKey: string, params: ProductSalesInsightParams): Promise<ProductSalesInsight> => mockDashboardApi.getProductSalesInsight(skuGroupKey, params),
  // GET /products/{skuGroupKey}/secondary-detail: 상품 secondary 상세 조회.
  getProductSecondaryDetail: (skuGroupKey: string, params: ProductSecondaryDetailParams): Promise<ProductSecondaryDetail> => mockDashboardApi.getProductSecondaryDetail(skuGroupKey, params),
  // GET /products/{skuGroupKey}/secondary/daily-trend: 일별 추세 조회.
  getSecondaryDailyTrend: (params: SecondaryDailyTrendParams): Promise<SecondaryDailyTrendSource> => mockDashboardApi.getSecondaryDailyTrend(params),
  // POST /products/{skuGroupKey}/secondary/ai-comment: secondary AI 코멘트 생성.
  getSecondaryAiComment: (params: SecondaryAiCommentParams): Promise<SecondaryAiCommentResult> => mockDashboardApi.getSecondaryAiComment(params),
  // GET /secondary/competitor-channels: 비교 채널 목록 조회.
  getSecondaryCompetitorChannels: () : Promise<SecondaryCompetitorChannel[]> => mockDashboardApi.getSecondaryCompetitorChannels(),
  // POST /secondary/stock-order-calc: 주문량 계산.
  getSecondaryStockOrderCalc: (params: SecondaryStockOrderCalcParams): Promise<SecondaryStockOrderCalcResult> => mockDashboardApi.getSecondaryStockOrderCalc(params),

  // GET /candidate-stashes: 후보 풀 목록 조회.
  getCandidateStashes: (params: CandidateStashListParams | undefined) : Promise<CandidateStashSummary[]> => withCurrentUserUuid((userUuid: string) : Promise<CandidateStashSummary[]> => mockDashboardApi.getCandidateStashes(userUuid, params)),
  // GET /candidate-stashes/{stashUuid}/items: 후보 항목 목록 조회.
  getCandidateItemsByStash: (params: CandidateItemListParams) : Promise<CandidateItemListResult> => withCurrentUserUuid((userUuid: string) : Promise<CandidateItemListResult> => mockDashboardApi.getCandidateItemsByStash(params, userUuid)),
  // GET /candidate-stashes/{stashUuid}/items/order-metrics/events: 후보 주문 지표 SSE 구독.
  subscribeCandidateOrderMetrics: (params: CandidateOrderMetricStreamParams, listener: (event: CandidateOrderMetricEvent) => void, onError: DashboardEventStreamErrorListener | undefined) : CandidateOrderMetricSubscription => withCurrentUserStream(
    (userUuid: string) : CandidateOrderMetricSubscription => mockDashboardApi.subscribeCandidateOrderMetrics(params, listener, userUuid),
    onError,
  ),
  // POST /candidate-stashes/{stashUuid}/llm-comment-jobs: 후보 LLM 코멘트 배치 시작.
  startCandidateStashLlmCommentJob: (stashUuid: string, params: CompanyMutationScopeParams) : Promise<CandidateStashLlmCommentJobStartResult> => withCurrentUserUuid(
    (userUuid: string) : Promise<CandidateStashLlmCommentJobStartResult> => mockDashboardApi.startCandidateStashLlmCommentJob(stashUuid, userUuid, params),
  ),
  // GET /candidate-stash-llm-comment-jobs/{jobId}/events: 후보 LLM 코멘트 SSE 구독.
  subscribeCandidateStashLlmCommentJob: (jobId: string, listener: (event: CandidateStashLlmCommentJobProgressEvent) => void, onError: DashboardEventStreamErrorListener | undefined, params: CompanyMutationScopeParams) : CandidateJobSubscription => withCurrentUserStream(
    (userUuid: string) : CandidateJobSubscription => mockDashboardApi.subscribeCandidateStashLlmCommentJob(jobId, listener, userUuid, params),
    onError,
  ),
  // POST /candidate-stashes/{stashUuid}/items/detail-confirmation-jobs: 후보 상세 확정 배치 시작.
  startCandidateDetailBulkConfirm: (payload: CandidateDetailBulkConfirmStartPayload) : Promise<CandidateDetailBulkConfirmStartResult> => withCurrentUserUuid((userUuid: string) : Promise<CandidateDetailBulkConfirmStartResult> => mockDashboardApi.startCandidateDetailBulkConfirm(payload, userUuid)),
  // GET /candidate-item-detail-confirmation-jobs/{jobId}/events: 후보 상세 확정 SSE 구독.
  subscribeCandidateDetailBulkConfirm: (jobId: string, listener: (event: CandidateDetailBulkConfirmProgressEvent) => void, onError: DashboardEventStreamErrorListener | undefined, params: CompanyMutationScopeParams) : CandidateJobSubscription => withCurrentUserStream(
    (userUuid: string) : CandidateJobSubscription => mockDashboardApi.subscribeCandidateDetailBulkConfirm(jobId, listener, userUuid, params),
    onError,
  ),
  // GET /candidate-stashes/{stashUuid}/recommendations: 후보 추천 조회.
  getCandidateRecommendations: (params: CandidateRecommendationParams) : Promise<CandidateRecommendationResult> => withCurrentUserUuid((userUuid: string) : Promise<CandidateRecommendationResult> => mockDashboardApi.getCandidateRecommendations(params, userUuid)),
  // GET /candidate-items/{itemUuid}: 후보 항목 단건 조회.
  getCandidateItemByUuid: (itemUuid: string, params: CompanyScopeParams | undefined) : Promise<CandidateItemDetail | null> => withCurrentUserUuid((userUuid: string) : Promise<CandidateItemDetail | null> => mockDashboardApi.getCandidateItemByUuid(itemUuid, userUuid, params)),
  // DELETE /candidate-items/{itemUuid}: 후보 항목 삭제.
  deleteCandidateItem: (itemUuid: string, params: CompanyMutationScopeParams) : Promise<void> => withCurrentUserUuid((userUuid: string) : Promise<void> => mockDashboardApi.deleteCandidateItem(itemUuid, userUuid, params)),
  // DELETE /candidate-stashes/{stashUuid}/items: 후보 항목 벌크 삭제.
  deleteCandidateItems: (stashUuid: string, itemUuids: string[], params: CompanyMutationScopeParams) : Promise<void> => withCurrentUserUuid((userUuid: string) : Promise<void> => mockDashboardApi.deleteCandidateItems(stashUuid, itemUuids, userUuid, params)),
  // DELETE /candidate-stashes/{stashUuid}: 후보 풀 삭제.
  deleteCandidateStash: (stashUuid: string, params: CompanyMutationScopeParams) : Promise<void> => withCurrentUserUuid((userUuid: string) : Promise<void> => mockDashboardApi.deleteCandidateStash(stashUuid, userUuid, params)),
  // POST /candidate-stashes: 후보 풀 생성.
  createCandidateStash: (payload: CreateCandidateStashPayload) : Promise<CandidateStashSummary> => withCurrentUserUuid((userUuid: string) : Promise<CandidateStashSummary> => mockDashboardApi.createCandidateStash(payload, userUuid)),
  // PATCH /candidate-stashes/{stashUuid}: 후보 풀 수정.
  updateCandidateStash: (payload: UpdateCandidateStashPayload) : Promise<CandidateStashSummary> => withCurrentUserUuid((userUuid: string) : Promise<CandidateStashSummary> => mockDashboardApi.updateCandidateStash(payload, userUuid)),
  // POST /candidate-stashes/{stashUuid}/duplicate: 후보 풀 복제.
  duplicateCandidateStash: (stashUuid: string, params: CompanyMutationScopeParams) : Promise<void> => withCurrentUserUuid((userUuid: string) : Promise<void> => mockDashboardApi.duplicateCandidateStash(stashUuid, userUuid, params)),
  // POST /candidate-stashes/{stashUuid}/items: 후보 항목 단건 추가.
  appendCandidateItem: (payload: AppendCandidateItemPayload) : Promise<void> => withCurrentUserUuid((userUuid: string) : Promise<void> => mockDashboardApi.appendCandidateItem(payload, userUuid)),
  // POST /candidate-stashes/{stashUuid}/items/bulk: 후보 항목 벌크 추가.
  appendCandidateItems: (payload: AppendCandidateItemsPayload) : Promise<AppendCandidateItemsResponse> => withCurrentUserUuid((userUuid: string) : Promise<AppendCandidateItemsResponse> => mockDashboardApi.appendCandidateItems(payload, userUuid)),
  // PATCH /candidate-items/{itemUuid}: 후보 항목 수정.
  updateCandidateItem: (payload: UpdateCandidateItemPayload) : Promise<CandidateItemDetail> => withCurrentUserUuid((userUuid: string) : Promise<CandidateItemDetail> => mockDashboardApi.updateCandidateItem(payload, userUuid)),
  // POST /candidate-stashes/import/excel: 엑셀 업로드 처리.
  uploadCandidateStashExcel: (file: File, params: CompanyMutationScopeParams) : Promise<CandidateStashExcelUploadResult> => withCurrentUserUuid((userUuid: string) : Promise<CandidateStashExcelUploadResult> => mockDashboardApi.uploadCandidateStashExcel(file, userUuid, params)),
  // GET /candidate-stashes/excel-template: 템플릿 다운로드 링크 조회.
  getCandidateStashExcelTemplateDownload,
})
