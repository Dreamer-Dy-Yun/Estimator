import type { CompetitorSalesRow, SelfSalesRow } from '../../types'
import { mockAuthApi, mockDashboardApi } from '../mock'
import type {
  CandidateStashExcelTemplateDownload,
  CompetitorSalesGridParams,
  DashboardApi,
  ProductMonthlyTrend,
  ProductMonthlyTrendParams,
  ProductSalesInsight,
  ProductSalesInsightParams,
  ProductSecondaryDetail,
  ProductSecondaryDetailParams,
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

/**
 * Mock implementation of DashboardApi.
 *
 * This adapter is intentionally shaped like the future backend boundary:
 * - It resolves the current USER_ACCOUNT.uuid at the request boundary.
 * - Pages/hooks never import mock files directly.
 * - Candidate list metrics are still streamed through subscribeCandidateOrderMetrics
 *   so the UI exercises the same async flow the Python backend should expose.
 */
async function requireCurrentUserUuid(): Promise<string> {
  const session = await mockAuthApi.getCurrentSession()
  if (!session) throw new Error('로그인이 필요합니다.')
  return session.user.uuid
}

async function withCurrentUserUuid<T>(request: (userUuid: string) => Promise<T>): Promise<T> {
  return request(await requireCurrentUserUuid())
}

async function getProductMonthlyTrend(
  skuGroupKey: string,
  params: ProductMonthlyTrendParams,
): Promise<ProductMonthlyTrend> {
  return mockDashboardApi.getProductMonthlyTrend(skuGroupKey, params)
}

async function getProductSalesInsight(
  skuGroupKey: string,
  params: ProductSalesInsightParams,
): Promise<ProductSalesInsight> {
  return mockDashboardApi.getProductSalesInsight(skuGroupKey, params)
}

async function getProductSecondaryDetail(
  skuGroupKey: string,
  params?: ProductSecondaryDetailParams,
): Promise<ProductSecondaryDetail> {
  return mockDashboardApi.getProductSecondaryDetail(skuGroupKey, params)
}

async function getSecondaryDailyTrend(
  params: SecondaryDailyTrendParams,
): Promise<SecondaryDailyTrendPoint[]> {
  return mockDashboardApi.getSecondaryDailyTrend(params)
}

async function getSecondaryAiComment(
  params: SecondaryAiCommentParams,
): Promise<SecondaryAiCommentResult> {
  return mockDashboardApi.getSecondaryAiComment(params)
}

function getCandidateStashExcelTemplateDownload(): CandidateStashExcelTemplateDownload {
  return {
    href: resolvePublicAssetUrl(candidateStashExcelTemplateAsset),
    filename: candidateStashExcelTemplateFilename,
  }
}

async function getSecondaryStockOrderCalc(
  params: SecondaryStockOrderCalcParams,
): Promise<SecondaryStockOrderCalcResult> {
  return mockDashboardApi.getSecondaryStockOrderCalc(params)
}

async function getSelfSalesScatterGrid(
  params: SelfSalesGridParams,
): Promise<ScatterSalesGridResponse> {
  return mockDashboardApi.getSelfSalesScatterGrid(params)
}

async function getCompetitorSalesScatterGrid(
  params: CompetitorSalesGridParams,
): Promise<ScatterSalesGridResponse> {
  return mockDashboardApi.getCompetitorSalesScatterGrid(params)
}

export const mockDashboardRequests: DashboardApi = {
  getSelfSales: (params): Promise<SelfSalesRow[]> => mockDashboardApi.getSelfSales(params),
  getCompetitorSales: (params): Promise<CompetitorSalesRow[]> => mockDashboardApi.getCompetitorSales(params),
  getSelfSalesScatterGrid,
  getCompetitorSalesScatterGrid,
  getSalesFilterMeta: () => mockDashboardApi.getSalesFilterMeta(),
  getProductDrawerBundle: (skuGroupKey) => mockDashboardApi.getProductDrawerBundle(skuGroupKey),
  getProductMonthlyTrend,
  getProductSalesInsight,
  getProductSecondaryDetail,
  getSecondaryDailyTrend,
  getSecondaryAiComment,
  getSecondaryCompetitorChannels: () => mockDashboardApi.getSecondaryCompetitorChannels(),
  getCandidateStashes: async () =>
    withCurrentUserUuid((userUuid) => mockDashboardApi.getCandidateStashes(userUuid)),
  getCandidateItemsByStash: async (params) =>
    withCurrentUserUuid((userUuid) => mockDashboardApi.getCandidateItemsByStash(params, userUuid)),
  subscribeCandidateOrderMetrics: (params, listener) => {
    let subscription: ReturnType<typeof mockDashboardApi.subscribeCandidateOrderMetrics> | null = null
    let closed = false
    void withCurrentUserUuid(async (userUuid) => {
      if (closed) return
      subscription = mockDashboardApi.subscribeCandidateOrderMetrics(params, listener, userUuid)
      if (closed) subscription.close()
    })
    return {
      close: () => {
        closed = true
        subscription?.close()
      },
    }
  },
  startCandidateStashAnalysis: async (stashUuid) =>
    withCurrentUserUuid((userUuid) => mockDashboardApi.startCandidateStashAnalysis(stashUuid, userUuid)),
  subscribeCandidateStashAnalysis: (jobId, listener) => {
    let subscription: ReturnType<typeof mockDashboardApi.subscribeCandidateStashAnalysis> | null = null
    let closed = false
    void withCurrentUserUuid(async (userUuid) => {
      if (closed) return
      subscription = mockDashboardApi.subscribeCandidateStashAnalysis(jobId, listener, userUuid)
      if (closed) subscription.close()
    })
    return {
      close: () => {
        closed = true
        subscription?.close()
      },
    }
  },
  getCandidateRecommendations: async (params) =>
    withCurrentUserUuid((userUuid) => mockDashboardApi.getCandidateRecommendations(params, userUuid)),
  getCandidateItemByUuid: async (itemUuid) =>
    withCurrentUserUuid((userUuid) => mockDashboardApi.getCandidateItemByUuid(itemUuid, userUuid)),
  deleteCandidateItem: async (itemUuid) =>
    withCurrentUserUuid((userUuid) => mockDashboardApi.deleteCandidateItem(itemUuid, userUuid)),
  deleteCandidateItems: async (stashUuid, itemUuids) =>
    withCurrentUserUuid((userUuid) => mockDashboardApi.deleteCandidateItems(stashUuid, itemUuids, userUuid)),
  deleteCandidateStash: async (stashUuid) =>
    withCurrentUserUuid((userUuid) => mockDashboardApi.deleteCandidateStash(stashUuid, userUuid)),
  createCandidateStash: async (payload) =>
    withCurrentUserUuid((userUuid) => mockDashboardApi.createCandidateStash(payload, userUuid)),
  updateCandidateStash: async (payload) =>
    withCurrentUserUuid((userUuid) => mockDashboardApi.updateCandidateStash(payload, userUuid)),
  duplicateCandidateStash: async (stashUuid) =>
    withCurrentUserUuid((userUuid) => mockDashboardApi.duplicateCandidateStash(stashUuid, userUuid)),
  appendCandidateItem: async (payload) =>
    withCurrentUserUuid((userUuid) => mockDashboardApi.appendCandidateItem(payload, userUuid)),
  appendCandidateItems: async (payload) =>
    withCurrentUserUuid((userUuid) => mockDashboardApi.appendCandidateItems(payload, userUuid)),
  updateCandidateItem: async (payload) =>
    withCurrentUserUuid((userUuid) => mockDashboardApi.updateCandidateItem(payload, userUuid)),
  getCandidateStashExcelTemplateDownload,
  uploadCandidateStashExcel: async (file) =>
    withCurrentUserUuid((userUuid) => mockDashboardApi.uploadCandidateStashExcel(file, userUuid)),
  getSecondaryStockOrderCalc,
}
