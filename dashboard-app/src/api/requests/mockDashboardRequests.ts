import type { CompetitorSalesRow, SelfSalesRow } from '../../types'
import { mockAuthApi, mockDashboardApi } from '../mock'
import type {
  CandidateStashExcelTemplateDownload,
  CompetitorSalesGridParams,
  DashboardApi,
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
  const session = await mockAuthApi.getCurrentSession()
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
  let closed = false
  void requireCurrentUserUuid()
    .then((userUuid) => {
      if (closed) return
      subscription = connect(userUuid)
      if (closed) subscription.close()
    })
    .catch((error: unknown) => {
      if (!closed) onError?.(error)
    })
  return { close: () => { closed = true; subscription?.close() } } as S
}

const getCandidateStashExcelTemplateDownload = (): CandidateStashExcelTemplateDownload => ({
  href: resolvePublicAssetUrl(candidateStashExcelTemplateAsset),
  filename: candidateStashExcelTemplateFilename,
})

export const mockDashboardRequests: DashboardApi = {
  getSelfSales: (params): Promise<SelfSalesRow[]> => mockDashboardApi.getSelfSales(params),
  getCompetitorSales: (params): Promise<CompetitorSalesRow[]> => mockDashboardApi.getCompetitorSales(params),
  getSelfSalesScatterGrid: (params: SelfSalesGridParams): Promise<ScatterSalesGridResponse> => mockDashboardApi.getSelfSalesScatterGrid(params),
  getCompetitorSalesScatterGrid: (params: CompetitorSalesGridParams): Promise<ScatterSalesGridResponse> => mockDashboardApi.getCompetitorSalesScatterGrid(params),
  getSalesFilterMeta: (params?: SalesFilterMetaParams) => mockDashboardApi.getSalesFilterMeta(params),
  getProductDrawerBundle: (skuGroupKey: string, params?: ProductDrawerBundleParams): Promise<ProductDrawerBundle> => mockDashboardApi.getProductDrawerBundle(skuGroupKey, params),
  getProductMonthlyTrend: (skuGroupKey: string, params: ProductMonthlyTrendParams): Promise<ProductMonthlyTrend> => mockDashboardApi.getProductMonthlyTrend(skuGroupKey, params),
  getProductSalesInsight: (skuGroupKey: string, params: ProductSalesInsightParams): Promise<ProductSalesInsight> => mockDashboardApi.getProductSalesInsight(skuGroupKey, params),
  getProductSecondaryDetail: (skuGroupKey: string, params?: ProductSecondaryDetailParams): Promise<ProductSecondaryDetail> => mockDashboardApi.getProductSecondaryDetail(skuGroupKey, params),
  getSecondaryDailyTrend: (params: SecondaryDailyTrendParams): Promise<SecondaryDailyTrendPoint[]> => mockDashboardApi.getSecondaryDailyTrend(params),
  getSecondaryAiComment: (params: SecondaryAiCommentParams): Promise<SecondaryAiCommentResult> => mockDashboardApi.getSecondaryAiComment(params),
  getSecondaryCompetitorChannels: () => mockDashboardApi.getSecondaryCompetitorChannels(),
  getSecondaryStockOrderCalc: (params: SecondaryStockOrderCalcParams): Promise<SecondaryStockOrderCalcResult> => mockDashboardApi.getSecondaryStockOrderCalc(params),

  getCandidateStashes: (params) => withCurrentUserUuid((userUuid) => mockDashboardApi.getCandidateStashes(userUuid, params)),
  getCandidateItemsByStash: (params) => withCurrentUserUuid((userUuid) => mockDashboardApi.getCandidateItemsByStash(params, userUuid)),
  subscribeCandidateOrderMetrics: (params, listener, onError) => withCurrentUserStream(
    (userUuid) => mockDashboardApi.subscribeCandidateOrderMetrics(params, listener, userUuid),
    onError,
  ),
  startCandidateStashLlmCommentJob: (stashUuid, params) => withCurrentUserUuid(
    (userUuid) => mockDashboardApi.startCandidateStashLlmCommentJob(stashUuid, userUuid, params),
  ),
  subscribeCandidateStashLlmCommentJob: (jobId, listener, onError, params) => withCurrentUserStream(
    (userUuid) => mockDashboardApi.subscribeCandidateStashLlmCommentJob(jobId, listener, userUuid, params),
    onError,
  ),
  startCandidateDetailBulkConfirm: (payload) => withCurrentUserUuid((userUuid) => mockDashboardApi.startCandidateDetailBulkConfirm(payload, userUuid)),
  subscribeCandidateDetailBulkConfirm: (jobId, listener, onError, params) => withCurrentUserStream(
    (userUuid) => mockDashboardApi.subscribeCandidateDetailBulkConfirm(jobId, listener, userUuid, params),
    onError,
  ),
  getCandidateRecommendations: (params) => withCurrentUserUuid((userUuid) => mockDashboardApi.getCandidateRecommendations(params, userUuid)),
  getCandidateItemByUuid: (itemUuid, params) => withCurrentUserUuid((userUuid) => mockDashboardApi.getCandidateItemByUuid(itemUuid, userUuid, params)),
  deleteCandidateItem: (itemUuid, params) => withCurrentUserUuid((userUuid) => mockDashboardApi.deleteCandidateItem(itemUuid, userUuid, params)),
  deleteCandidateItems: (stashUuid, itemUuids, params) => withCurrentUserUuid((userUuid) => mockDashboardApi.deleteCandidateItems(stashUuid, itemUuids, userUuid, params)),
  deleteCandidateStash: (stashUuid, params) => withCurrentUserUuid((userUuid) => mockDashboardApi.deleteCandidateStash(stashUuid, userUuid, params)),
  createCandidateStash: (payload) => withCurrentUserUuid((userUuid) => mockDashboardApi.createCandidateStash(payload, userUuid)),
  updateCandidateStash: (payload) => withCurrentUserUuid((userUuid) => mockDashboardApi.updateCandidateStash(payload, userUuid)),
  duplicateCandidateStash: (stashUuid, params) => withCurrentUserUuid((userUuid) => mockDashboardApi.duplicateCandidateStash(stashUuid, userUuid, params)),
  appendCandidateItem: (payload) => withCurrentUserUuid((userUuid) => mockDashboardApi.appendCandidateItem(payload, userUuid)),
  appendCandidateItems: (payload) => withCurrentUserUuid((userUuid) => mockDashboardApi.appendCandidateItems(payload, userUuid)),
  updateCandidateItem: (payload) => withCurrentUserUuid((userUuid) => mockDashboardApi.updateCandidateItem(payload, userUuid)),
  uploadCandidateStashExcel: (file, params) => withCurrentUserUuid((userUuid) => mockDashboardApi.uploadCandidateStashExcel(file, userUuid, params)),
  getCandidateStashExcelTemplateDownload,
}
