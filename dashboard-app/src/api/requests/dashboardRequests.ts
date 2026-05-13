import type { CompetitorSalesRow, SelfSalesRow } from '../../types'
import { mockAuthApi, mockDashboardApi } from '../mock'
import type {
  CandidateStashExcelTemplateDownload,
  DashboardApi,
  ProductMonthlyTrend,
  ProductMonthlyTrendParams,
  ProductSalesInsight,
  ProductSalesInsightParams,
  ProductSecondaryDetail,
  ProductSecondaryDetailParams,
  SecondaryDailyTrendParams,
  SecondaryDailyTrendPoint,
  SecondaryStockOrderCalcParams,
  SecondaryStockOrderCalcResult,
} from '../types'

const candidateStashExcelTemplateAsset = 'templates/candidate-stash-upload-template-v0.0.0.xlsx'
const candidateStashExcelTemplateFilename = '(Han.A)Template(ver.0.0.0).xlsx'

/**
 * Dashboard request adapter.
 *
 * Backend switch point: replace the mock calls in this file with HTTP requests.
 * The frontend has no backend endpoints yet, so endpoint design should follow
 * DashboardApi in src/api/types/dashboard-api.ts and MD/backend-api.
 *
 * Watch points for the backend:
 * - Candidate stash ownership is based on USER_ACCOUNT.uuid. The UI does not pass
 *   userUuid around; this adapter resolves the current session and sends it only
 *   at the request boundary. If the backend uses HttpOnly session identity, still
 *   enforce the same owner filter server-side.
 * - Stored snapshots remain the source of drawer/order state. Do not silently
 *   recalculate or replace snapshot fields in the request adapter.
 * - SKU identity follows the DB sheet: SKU rows are unique by code + color_code
 *   + size. List/drawer APIs operate on a skuGroupKey, a product-level grouping
 *   of SKU.code + SKU.color_code. Backend implementations should map this key to
 *   the matching SKU rows before aggregating size-level data.
 * - Candidate stash item list is period-sensitive. The backend should calculate
 *   the requested period over the full eligible skuGroupKey universe, assign
 *   badges from that full-period distribution, then return only the skuGroupKeys
 *   contained in the requested stash. Cache period/channel ranking results if
 *   this becomes expensive.
 * - Period/channel-sensitive drawer data should remain separate API calls rather
 *   than being merged back into a single oversized bundle.
 */
async function requireCurrentUserUuid(): Promise<string> {
  const session = await mockAuthApi.getCurrentSession()
  if (!session) throw new Error('로그인이 필요합니다.')
  return session.user.uuid
}

function resolvePublicAssetUrl(path: string): string {
  const baseUrl = import.meta.env.BASE_URL || '/'
  return `${baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`}${path.replace(/^\/+/, '')}`
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

export const dashboardRequests: DashboardApi = {
  getSelfSales: (params): Promise<SelfSalesRow[]> => mockDashboardApi.getSelfSales(params),
  getCompetitorSales: (params): Promise<CompetitorSalesRow[]> => mockDashboardApi.getCompetitorSales(params),
  getSalesFilterMeta: () => mockDashboardApi.getSalesFilterMeta(),
  getProductDrawerBundle: (skuGroupKey) => mockDashboardApi.getProductDrawerBundle(skuGroupKey),
  getProductMonthlyTrend,
  getProductSalesInsight,
  getProductSecondaryDetail,
  getSecondaryDailyTrend,
  getSecondaryCompetitorChannels: () => mockDashboardApi.getSecondaryCompetitorChannels(),
  getCandidateStashes: async () =>
    mockDashboardApi.getCandidateStashes(await requireCurrentUserUuid()),
  getCandidateItemsByStash: async (params) =>
    mockDashboardApi.getCandidateItemsByStash(params, await requireCurrentUserUuid()),
  getCandidateRecommendations: async (params) =>
    mockDashboardApi.getCandidateRecommendations(params, await requireCurrentUserUuid()),
  getCandidateItemByUuid: async (itemUuid) =>
    mockDashboardApi.getCandidateItemByUuid(itemUuid, await requireCurrentUserUuid()),
  deleteCandidateItem: async (itemUuid) =>
    mockDashboardApi.deleteCandidateItem(itemUuid, await requireCurrentUserUuid()),
  deleteCandidateItems: async (stashUuid, itemUuids) =>
    mockDashboardApi.deleteCandidateItems(stashUuid, itemUuids, await requireCurrentUserUuid()),
  deleteCandidateStash: async (stashUuid) =>
    mockDashboardApi.deleteCandidateStash(stashUuid, await requireCurrentUserUuid()),
  createCandidateStash: async (payload) =>
    mockDashboardApi.createCandidateStash(payload, await requireCurrentUserUuid()),
  updateCandidateStash: async (payload) =>
    mockDashboardApi.updateCandidateStash(payload, await requireCurrentUserUuid()),
  duplicateCandidateStash: async (stashUuid) =>
    mockDashboardApi.duplicateCandidateStash(stashUuid, await requireCurrentUserUuid()),
  appendCandidateItem: async (payload) =>
    mockDashboardApi.appendCandidateItem(payload, await requireCurrentUserUuid()),
  appendCandidateItems: async (payload) =>
    mockDashboardApi.appendCandidateItems(payload, await requireCurrentUserUuid()),
  updateCandidateItem: async (payload) =>
    mockDashboardApi.updateCandidateItem(payload, await requireCurrentUserUuid()),
  getCandidateStashExcelTemplateDownload,
  uploadCandidateStashExcel: async (file) => {
    await requireCurrentUserUuid()
    return mockDashboardApi.uploadCandidateStashExcel(file)
  },
  startCandidateStashAnalysis: async (stashUuid) =>
    mockDashboardApi.startCandidateStashAnalysis(stashUuid, await requireCurrentUserUuid()),
  subscribeCandidateStashAnalysis: (jobId, handlers) =>
    mockDashboardApi.subscribeCandidateStashAnalysis(jobId, handlers),
  getSecondaryStockOrderCalc,
}
