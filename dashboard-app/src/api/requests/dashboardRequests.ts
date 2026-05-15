import type { CompetitorSalesRow, SelfSalesRow } from '../../types'
import { mockAuthApi, mockDashboardApi } from '../mock'
import type {
  CandidateStashExcelTemplateDownload,
  DashboardApi,
  CompetitorSalesGridParams,
  ProductMonthlyTrend,
  ProductMonthlyTrendParams,
  ProductSalesInsight,
  ProductSalesInsightParams,
  ProductSecondaryDetail,
  ProductSecondaryDetailParams,
  SecondaryAiCommentParams,
  SecondaryAiCommentResult,
  SecondaryDailyTrendParams,
  SecondaryDailyTrendPoint,
  SecondaryStockOrderCalcParams,
  SecondaryStockOrderCalcResult,
  ScatterSalesGridResponse,
  SelfSalesGridParams,
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
 * - Analysis list default order is sales quantity descending. getSelfSales
 *   should return rows by qty DESC, and getCompetitorSales by competitorQty
 *   DESC after all filters and channel aggregation. The table's "no sort"
 *   state intentionally falls back to this API order.
 * - Scatter grid endpoints should be server-side aggregations for large result
 *   sets. Tens of thousands of raw rows should not be fetched only so the
 *   browser can bin them. The frontend may request xBucketSize/yBucketSize when
 *   it wants a specific data-unit grid density, but point radius is client-only:
 *   it is derived from response meta.bucketSize and the rendered chart size.
 * - getCompetitorSales treats an omitted competitorChannelId as "all competitor
 *   channels". Backend aggregation must sum channel sales qty/amount once per
 *   skuGroupKey and keep self sales unduplicated.
 * - Period/channel-sensitive drawer data should remain separate API calls rather
 *   than being merged back into a single oversized bundle.
 * - Secondary drawer AI comments are requested when the 2차 drawer opens.
 *   Backend should generate comments from skuGroupKey, data reference period,
 *   forecastMonths, selected competitor channel, and optional candidateItemUuid.
 *   Opening the drawer must not mutate candidate snapshots by itself; returned
 *   text is stored only when the user saves the secondary drawer.
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
 *   contained in the requested stash. The UI keeps date inputs as draft state
 *   and calls this endpoint only when the user presses 조회, not on every date
 *   keystroke/change. Cache period/channel ranking results if this becomes
 *   expensive.
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

/**
 * Scatter-grid request for self-sales analysis.
 *
 * Python backend implementation direction:
 * - Do this as a server-side aggregation endpoint. Do not return tens of
 *   thousands of raw sales rows to the browser just so the frontend can bin
 *   points.
 * - Reuse the same SQLAlchemy/query-builder filters as getSelfSales:
 *   startDate/endDate, brand, category, codeQuery, colorCode, nameQuery.
 * - Aggregate to one row per skuGroupKey first. skuGroupKey means
 *   SKU.code + SKU.color_code; size-level SKU rows should be folded into this
 *   product-color group before chart binning.
 * - Self chart axes:
 *   x = weighted/period operating margin rate (%)
 *   y = filtered period self sales quantity (EA)
 * - If xBucketSize/yBucketSize are absent, backend should derive bucket sizes
 *   from the filtered min/max range. Current mock default is roughly 70% of
 *   a 12-division bucket so cells are a bit denser than a plain 12x12 grid.
 * - Return only ScatterSalesGridResponse: cells + meta. The frontend derives
 *   marker color and rendered radius from count/meta/chart size.
 * - Cell skuIds currently contain skuGroupKey values used for client-side
 *   drill-down. Because point click must not issue another backend request,
 *   do not truncate those ids unless UX intentionally accepts partial lists.
 */
async function getSelfSalesScatterGrid(
  params: SelfSalesGridParams,
): Promise<ScatterSalesGridResponse> {
  return mockDashboardApi.getSelfSalesScatterGrid(params)
}

/**
 * Scatter-grid request for competitor-sales analysis.
 *
 * Python backend implementation direction:
 * - Same server-side binning rule as self scatter: filters and channel
 *   aggregation happen in Python/SQL, not in the browser.
 * - Reuse getCompetitorSales filter semantics. Omitted competitorChannelId
 *   means "all competitor channels"; competitor qty/amount must be summed
 *   across selected channels while self qty/amount is not duplicated.
 * - Aggregate to one row per skuGroupKey (SKU.code + SKU.color_code) before
 *   computing the point.
 * - Competitor chart axes:
 *   x = self sales quantity (EA)
 *   y = selected competitor-channel sales quantity (EA)
 * - Rows without self sales quantity are excluded from this scatter because
 *   they cannot be placed on the x-axis.
 * - Response cells must include the skuGroupKey list for each cell so point
 *   click can filter the already-loaded list without a second backend call.
 * - For large datasets, prefer database GROUP BY/window calculations for the
 *   per-skuGroupKey base rows, then bin either in SQL or Python. The response
 *   size should be proportional to number of occupied cells plus their keys,
 *   not raw transaction row count.
 */
async function getCompetitorSalesScatterGrid(
  params: CompetitorSalesGridParams,
): Promise<ScatterSalesGridResponse> {
  return mockDashboardApi.getCompetitorSalesScatterGrid(params)
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
  getSelfSalesScatterGrid,
  getCompetitorSalesScatterGrid,
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
  getSecondaryAiComment,
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

  getSecondaryStockOrderCalc,
}
