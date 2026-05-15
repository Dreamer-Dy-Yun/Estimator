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
import { type ApiQueryParams, apiRequest, buildApiUrl, openApiEventStream, USE_MOCK_API } from './httpClient'

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
 *   the requested period over the full eligible SKU universe, assign badges
 *   from that full-period distribution, and return the light reference list
 *   plus CANDIDATE_ITEM rows. CANDIDATE_ITEM.sku_uuid must equal SKU.uuid; do
 *   not compare CANDIDATE_ITEM.uuid with SKU.uuid. The UI keeps date inputs as
 *   draft state and calls this endpoint only when the user presses 조회, not on
 *   every date keystroke/change. Cache period/channel ranking results if this
 *   becomes expensive.
 * - Candidate total order qty/amount is intentionally not part of the first
 *   list payload. Use subscribeCandidateOrderMetrics as an SSE/EventSource-like
 *   stream keyed by requestId + candidate item uuid. Backend Python direction:
 *   flush one item event as each heavy calculation completes and send completed
 *   at the end; stale requestIds are ignored by the frontend.
 * - Stored snapshots remain the source of confirmed drawer/order state. Live
 *   candidate list values may recalculate by data reference period, but saved
 *   snapshot details must not be silently overwritten by adapter-side math.
 *   The only clear path is an explicit updateCandidateItem request with
 *   details: null, used by 상세확정 일괄해제.
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

const mockDashboardRequests: DashboardApi = {
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

  /**
   * Candidate Excel contracts.
   * Template link can later move to backend by changing this adapter only.
   * Upload remains server-imported; download remains client-generated from
   * already loaded candidate rows plus SSE CandidateItemSummary.orderExport.
   */
  getCandidateStashExcelTemplateDownload,
  uploadCandidateStashExcel: async (file) =>
    withCurrentUserUuid((userUuid) => mockDashboardApi.uploadCandidateStashExcel(file, userUuid)),

  getSecondaryStockOrderCalc,
}

function encodePathSegment(value: string): string {
  return encodeURIComponent(value)
}

function queryParams(params?: object): ApiQueryParams | undefined {
  if (!params) return undefined
  return Object.fromEntries(Object.entries(params)) as ApiQueryParams
}

function getHttpCandidateStashExcelTemplateDownload(): CandidateStashExcelTemplateDownload {
  return {
    href: buildApiUrl('/candidate-stashes/excel-template'),
    filename: candidateStashExcelTemplateFilename,
  }
}

const httpDashboardRequests: DashboardApi = {
  getSelfSales: (params) => apiRequest('/sales/self', { query: queryParams(params) }),
  getCompetitorSales: (params) => apiRequest('/sales/competitor', { query: queryParams(params) }),
  getSelfSalesScatterGrid: (params) =>
    apiRequest('/sales/self/scatter-grid', { query: queryParams(params) }),
  getCompetitorSalesScatterGrid: (params) =>
    apiRequest('/sales/competitor/scatter-grid', { query: queryParams(params) }),
  getSalesFilterMeta: () => apiRequest('/sales/filter-meta'),

  getProductDrawerBundle: (skuGroupKey) =>
    apiRequest(`/products/${encodePathSegment(skuGroupKey)}/drawer-bundle`),
  getProductMonthlyTrend: (skuGroupKey, params) =>
    apiRequest(`/products/${encodePathSegment(skuGroupKey)}/monthly-trend`, {
      query: queryParams(params),
    }),
  getProductSalesInsight: (skuGroupKey, params) =>
    apiRequest(`/products/${encodePathSegment(skuGroupKey)}/sales-insight`, {
      query: queryParams(params),
    }),
  getProductSecondaryDetail: (skuGroupKey, params) =>
    apiRequest(`/products/${encodePathSegment(skuGroupKey)}/secondary-detail`, {
      query: queryParams(params),
    }),
  getSecondaryDailyTrend: ({ skuGroupKey, ...params }) =>
    apiRequest(`/products/${encodePathSegment(skuGroupKey)}/secondary/daily-trend`, {
      query: queryParams(params),
    }),
  getSecondaryAiComment: ({ skuGroupKey, ...payload }) =>
    apiRequest(`/products/${encodePathSegment(skuGroupKey)}/secondary/ai-comment`, {
      method: 'POST',
      body: payload,
    }),
  getSecondaryCompetitorChannels: () => apiRequest('/secondary/competitor-channels'),

  getCandidateStashes: () => apiRequest('/candidate-stashes'),
  getCandidateItemsByStash: ({ stashUuid, ...params }) =>
    apiRequest(`/candidate-stashes/${encodePathSegment(stashUuid)}/items`, {
      query: queryParams(params),
    }),
  subscribeCandidateOrderMetrics: (params, listener) =>
    openApiEventStream(`/candidate-stashes/${encodePathSegment(params.stashUuid)}/items/order-metrics/events`, {
      requestId: params.requestId,
      dataReferencePeriodStart: params.dataReferencePeriodStart,
      dataReferencePeriodEnd: params.dataReferencePeriodEnd,
      candidateItemUuids: params.candidateItemUuids,
    }, listener),
  startCandidateStashAnalysis: (stashUuid) =>
    apiRequest(`/candidate-stashes/${encodePathSegment(stashUuid)}/analysis`, { method: 'POST' }),
  subscribeCandidateStashAnalysis: (jobId, listener) =>
    openApiEventStream(`/candidate-stash-analyses/${encodePathSegment(jobId)}/events`, undefined, listener),
  getCandidateRecommendations: ({ stashUuid, ...params }) =>
    apiRequest(`/candidate-stashes/${encodePathSegment(stashUuid)}/recommendations`, {
      query: queryParams(params),
    }),
  getCandidateItemByUuid: (itemUuid) => apiRequest(`/candidate-items/${encodePathSegment(itemUuid)}`),
  deleteCandidateItem: (itemUuid) =>
    apiRequest(`/candidate-items/${encodePathSegment(itemUuid)}`, { method: 'DELETE' }),
  deleteCandidateItems: (stashUuid, itemUuids) =>
    apiRequest(`/candidate-stashes/${encodePathSegment(stashUuid)}/items`, {
      method: 'DELETE',
      body: { itemUuids },
    }),
  deleteCandidateStash: (stashUuid) =>
    apiRequest(`/candidate-stashes/${encodePathSegment(stashUuid)}`, { method: 'DELETE' }),
  createCandidateStash: (payload) =>
    apiRequest('/candidate-stashes', { method: 'POST', body: payload }),
  updateCandidateStash: ({ stashUuid, ...payload }) =>
    apiRequest(`/candidate-stashes/${encodePathSegment(stashUuid)}`, {
      method: 'PATCH',
      body: payload,
    }),
  duplicateCandidateStash: (stashUuid) =>
    apiRequest(`/candidate-stashes/${encodePathSegment(stashUuid)}/duplicate`, { method: 'POST' }),
  appendCandidateItem: ({ stashUuid, ...payload }) =>
    apiRequest(`/candidate-stashes/${encodePathSegment(stashUuid)}/items`, {
      method: 'POST',
      body: payload,
    }),
  appendCandidateItems: ({ stashUuid, ...payload }) =>
    apiRequest(`/candidate-stashes/${encodePathSegment(stashUuid)}/items/bulk`, {
      method: 'POST',
      body: payload,
    }),
  updateCandidateItem: ({ itemUuid, ...payload }) =>
    apiRequest(`/candidate-items/${encodePathSegment(itemUuid)}`, {
      method: 'PATCH',
      body: payload,
    }),
  getCandidateStashExcelTemplateDownload: getHttpCandidateStashExcelTemplateDownload,
  uploadCandidateStashExcel: (file) => {
    const formData = new FormData()
    formData.append('file', file)
    return apiRequest('/candidate-stashes/import/excel', { method: 'POST', body: formData })
  },

  getSecondaryStockOrderCalc: (params) =>
    apiRequest('/secondary/stock-order-calc', { method: 'POST', body: params }),
}

export const dashboardRequests: DashboardApi = USE_MOCK_API ? mockDashboardRequests : httpDashboardRequests
