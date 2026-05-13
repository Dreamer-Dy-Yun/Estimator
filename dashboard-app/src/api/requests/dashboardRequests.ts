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
 * Contract watch points for the backend:
 * - This file is the only dashboard API switch point. Pages, drawers, and hooks
 *   must keep importing from src/api and should not know whether data is mock or
 *   HTTP.
 * - List responses are already screen-shaped DTOs. Do not make pages rebuild DB
 *   joins that belong to the backend, but also do not send oversized raw DB rows.
 * - Analysis list filters are query conditions, not local-only UI filters. The
 *   backend should apply date/brand/category/code/color/name/channel conditions
 *   before ranking, KPI, and chart values are returned.
 * - getCompetitorSales treats an omitted competitorChannelId as "all competitor
 *   channels". Backend aggregation must sum channel sales qty/amount once per
 *   skuGroupKey and keep self sales unduplicated.
 * - Period/channel-sensitive drawer data should remain separate API calls rather
 *   than being merged back into a single oversized bundle.
 * - Candidate stash ownership is based on USER_ACCOUNT.uuid. The UI does not pass
 *   userUuid around; this adapter resolves the current session and sends it only
 *   at the request boundary. If the backend uses HttpOnly session identity, still
 *   enforce the same owner filter server-side.
 * - SKU identity follows the DB sheet: SKU rows are unique by code + color_code
 *   + size. List/drawer APIs operate on a skuGroupKey, a product-level grouping
 *   of SKU.code + SKU.color_code. Backend implementations should map this key to
 *   the matching SKU rows before aggregating size-level data.
 * - Candidate stash item list is period-sensitive. The backend should calculate
 *   the requested period over the full eligible skuGroupKey universe, assign
 *   badges from that full-period distribution, then return only the skuGroupKeys
 *   contained in the requested stash. Cache period/channel ranking results if
 *   this becomes expensive.
 * - Stored snapshots remain the source of confirmed drawer/order state. Live
 *   candidate list values may recalculate by data reference period, but saved
 *   snapshot details must not be silently overwritten by adapter-side math.
 * - Candidate Excel upload is backend-owned. The frontend sends the file and
 *   refreshes the list from API response state; it should not parse/import rows.
 * - Candidate Excel download is frontend-owned for now and uses the already
 *   loaded CandidateItemSummary.orderExport DTO. Do not add a redundant backend
 *   refetch unless the contract intentionally changes.
 */
async function requireCurrentUserUuid(): Promise<string> {
  const session = await mockAuthApi.getCurrentSession()
  if (!session) throw new Error('로그인이 필요합니다.')
  return session.user.uuid
}

async function withCurrentUserUuid<T>(request: (userUuid: string) => Promise<T>): Promise<T> {
  return request(await requireCurrentUserUuid())
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
  /**
   * Analysis list contracts.
   * - Params mirror the visible filter bar.
   * - Competitor "전체" is represented by absent competitorChannelId.
   * - KPI and chart values consume these rows directly, so aggregation must be
   *   complete before the response reaches the page.
   */
  getSelfSales: (params): Promise<SelfSalesRow[]> => mockDashboardApi.getSelfSales(params),
  getCompetitorSales: (params): Promise<CompetitorSalesRow[]> => mockDashboardApi.getCompetitorSales(params),
  getSalesFilterMeta: () => mockDashboardApi.getSalesFilterMeta(),

  /**
   * Drawer contracts.
   * getProductDrawerBundle is only the light 1차 summary. Period/channel-heavy
   * sales insight, monthly trend, secondary detail, daily trend, and stock-order
   * calculation stay split so each container can request only its own data.
   */
  getProductDrawerBundle: (skuGroupKey) => mockDashboardApi.getProductDrawerBundle(skuGroupKey),
  getProductMonthlyTrend,
  getProductSalesInsight,
  getProductSecondaryDetail,
  getSecondaryDailyTrend,
  getSecondaryCompetitorChannels: () => mockDashboardApi.getSecondaryCompetitorChannels(),

  /**
   * Candidate stash contracts.
   * Backend replacement should derive the owner from the authenticated session.
   * The mock receives userUuid explicitly only because there is no real server.
   */
  getCandidateStashes: async () =>
    withCurrentUserUuid((userUuid) => mockDashboardApi.getCandidateStashes(userUuid)),
  getCandidateItemsByStash: async (params) =>
    withCurrentUserUuid((userUuid) => mockDashboardApi.getCandidateItemsByStash(params, userUuid)),
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

  /**
   * Candidate Excel contracts.
   * Template link can later move to backend by changing this adapter only.
   * Upload remains server-imported; download remains client-generated from
   * CandidateItemSummary.orderExport until the product explicitly changes it.
   */
  getCandidateStashExcelTemplateDownload,
  uploadCandidateStashExcel: async (file) =>
    withCurrentUserUuid((userUuid) => mockDashboardApi.uploadCandidateStashExcel(file, userUuid)),

  /** Candidate analysis progress is SSE-shaped in production. */
  startCandidateStashAnalysis: async (stashUuid) =>
    withCurrentUserUuid((userUuid) => mockDashboardApi.startCandidateStashAnalysis(stashUuid, userUuid)),
  subscribeCandidateStashAnalysis: (jobId, handlers) =>
    mockDashboardApi.subscribeCandidateStashAnalysis(jobId, handlers),
  getSecondaryStockOrderCalc,
}
