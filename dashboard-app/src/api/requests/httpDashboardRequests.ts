import type { AppendCandidateItemsResponse, CandidateDetailBulkConfirmProgressEvent, CandidateDetailBulkConfirmStartPayload, CandidateDetailBulkConfirmStartResult, CandidateItemDetail, CandidateItemListParams, CandidateItemListResult, CandidateOrderMetricEvent, CandidateOrderMetricStreamParams, CandidateRecommendationParams, CandidateRecommendationResult, CandidateStashExcelUploadResult, CandidateStashLlmCommentJobProgressEvent, CandidateStashLlmCommentJobStartResult, CandidateStashSummary, CompanyScopeParams, CompetitorSalesParams, DashboardEventStreamErrorListener, DashboardRuntimeConfig, ProductComparisonSubjectRef, ProductComparisonTarget, ProductDrawerBundle, ProductMonthlyTrend, ProductMonthlyTrendParams, ProductSalesInsight, ProductSecondaryDetail, SalesFilterMeta, SecondaryAiCommentParams, SecondaryAiCommentResult, SecondaryCompetitorChannel, SecondaryStockOrderCalcResult, SelfSalesParams, UpdateCandidateItemPayload } from '..'
import type { CompetitorSalesRow, SelfSalesRow } from '../../types'
import type { AppendCandidateItemPayload, AppendCandidateItemsPayload, CompanyMutationScopeParams, CompetitorSalesGridParams, CreateCandidateStashPayload, ProductComparisonTargetParams, ProductDrawerBundleParams, ProductSalesInsightParams, ProductSecondaryDetailParams, ScatterSalesGridResponse, SecondaryDailyTrendParams, SecondaryDailyTrendSource, SecondaryInboundSplitSource, SecondaryInboundSplitSourceParams, SecondaryStockOrderCalcParams, SelfSalesGridParams, UpdateCandidateStashPayload } from '../types'
import type { CandidateStashListParams } from '../types/candidate'
import type { ApiEventStreamSubscription } from './httpClient'
import type {
  CandidateStashExcelTemplateDownload,
  DashboardApi,
} from '../types'
import {
  getComparisonSubjectSourceIdForContract,
  getRequiredCompanyUuidForMutationScope,
  normalizeCompanyMutationScopeParams,
  normalizeCompanyScopeParams,
} from '../types'
import { apiRequest, buildApiUrl, openApiEventStream } from './httpClient'
import {
  candidateStashExcelTemplateFilename,
  encodePathSegment,
  queryParams,
} from './dashboardRequestShared'

function productComparisonSubjectQueryPrefix(
  prefix: 'base' | 'comparison',
  subject: ProductComparisonSubjectRef,
): Record<string, string> {
  if (subject.role !== prefix) {
    throw new Error(`${prefix}Role mismatch: got ${subject.role}.`)
  }
  if (subject.kind === 'competitor-channel' && !subject.sourceId) {
    throw new Error(`${prefix}SourceId is required for competitor-channel subjects.`)
  }
  const sourceId: string | undefined = getComparisonSubjectSourceIdForContract(subject)
  return {
    [`${prefix}Role`]: subject.role,
    [`${prefix}Kind`]: subject.kind,
    ...(sourceId == null ? {} : { [`${prefix}SourceId`]: sourceId }),
  }
}

function productComparisonTargetQuery(params: ProductComparisonTargetParams): Record<string, string> {
  return productComparisonSubjectQueryPrefix('base', params.base)
}

function productDrawerBundleQuery(params: ProductDrawerBundleParams): Record<string, string> {
  return productComparisonSubjectQueryPrefix('base', params.base)
}

function productSalesInsightQuery(params: ProductSalesInsightParams): Record<string, string> {
  return {
    startDate: params.startDate,
    endDate: params.endDate,
    ...productComparisonSubjectQueryPrefix('base', params.base),
    ...productComparisonSubjectQueryPrefix('comparison', params.comparison),
  }
}

function productMonthlyTrendQuery(params: ProductMonthlyTrendParams): Record<string, string> {
  return {
    startDate: params.startDate,
    endDate: params.endDate,
    forecastMonths: String(params.forecastMonths),
    ...productComparisonSubjectQueryPrefix('base', params.base),
    ...productComparisonSubjectQueryPrefix('comparison', params.comparison),
  }
}

function productSecondaryDetailQuery(params: ProductSecondaryDetailParams): Record<string, string> {
  return {
    ...productComparisonSubjectQueryPrefix('base', params.base),
    ...productComparisonSubjectQueryPrefix('comparison', params.comparison),
    ...(params.minOpMarginPct == null ? {} : { minOpMarginPct: String(params.minOpMarginPct) }),
  }
}

function secondaryDailyTrendQuery(params: Omit<SecondaryDailyTrendParams, 'skuGroupKey'>): Record<string, string> {
  return {
    startDate: params.startDate,
    endDate: params.endDate,
    forecastDays: String(params.forecastDays),
    ...productComparisonSubjectQueryPrefix('base', params.base),
    ...productComparisonSubjectQueryPrefix('comparison', params.comparison),
  }
}

function secondaryInboundSplitSourceQuery(params: Omit<SecondaryInboundSplitSourceParams, 'skuGroupKey'>): Record<string, string> {
  return {
    dateStart: params.dateStart,
    dateEnd: params.dateEnd,
    ...productComparisonSubjectQueryPrefix('base', params.base),
  }
}

/**
 * HTTP implementation of DashboardApi.
 *
 * Backend watch points:
 * - Sales list endpoints must apply filters before KPI/rank/chart values.
 * - Omitted competitorChannelId means all competitor channels aggregated once
 *   per skuGroupKey while self sales are not duplicated.
 * - Scatter grid and candidate order metrics are backend-heavy aggregations;
 *   do not fetch raw transaction rows just to bin/calculate in the browser.
 * - Candidate stash ownership must be enforced from the authenticated session.
 * - Candidate order metrics use SSE with requestId; frontend drops stale events.
 * - Empty comparison target lists are valid unavailable states; adapters must not synthesize defaults.
 * - Candidate order metric SSE requires concrete company scope and the selected comparison subject.
 * - Snapshot/non-snapshot metric source is item-owned; this adapter only serializes request contract inputs.
 */
function getHttpCandidateStashExcelTemplateDownload(): CandidateStashExcelTemplateDownload {
  return {
    href: buildApiUrl('/candidate-stashes/excel-template'),
    filename: candidateStashExcelTemplateFilename,
  }
}

export const httpDashboardRequests: DashboardApi = {
  getDashboardRuntimeConfig: () : Promise<DashboardRuntimeConfig> =>
    apiRequest('/dashboard/runtime-config'),
  // Sales analysis list and scatter endpoints share the same filter contract.
  // Backend doc: MD/backend-api/dashboard-api-contract-catalog.md section 8.
  getSelfSales: (params: SelfSalesParams | undefined) : Promise<SelfSalesRow[]> =>
    apiRequest('/sales/self', { query: queryParams(normalizeCompanyScopeParams(params)) }),
  getCompetitorSales: (params: CompetitorSalesParams | undefined) : Promise<CompetitorSalesRow[]> =>
    apiRequest('/sales/competitor', { query: queryParams(normalizeCompanyScopeParams(params)) }),
  getSelfSalesScatterGrid: (params: SelfSalesGridParams | undefined) : Promise<ScatterSalesGridResponse> =>
    apiRequest('/sales/self/scatter-grid', { query: queryParams(normalizeCompanyScopeParams(params)) }),
  getCompetitorSalesScatterGrid: (params: CompetitorSalesGridParams | undefined) : Promise<ScatterSalesGridResponse> =>
    apiRequest('/sales/competitor/scatter-grid', { query: queryParams(normalizeCompanyScopeParams(params)) }),
  getSalesFilterMeta: (params: CompanyScopeParams | undefined) : Promise<SalesFilterMeta> =>
    apiRequest('/sales/filter-meta', { query: queryParams(normalizeCompanyScopeParams(params)) }),
  // Product drawer endpoints use subject query fields instead of top-level companyUuid.
  // Backend doc: MD/backend-api/dashboard-api-contract-catalog.md section 9.
  getProductDrawerBundle: (skuGroupKey: string, params: ProductDrawerBundleParams) : Promise<ProductDrawerBundle> =>
    apiRequest(`/products/${encodePathSegment(skuGroupKey)}/drawer-bundle`, {
      query: queryParams(productDrawerBundleQuery(params)),
    }),
  getProductComparisonTargets: (params: ProductComparisonTargetParams) : Promise<ProductComparisonTarget[]> =>
    // Empty arrays are contract-level unavailable states. HTTP failures must stay failures, not fake empty targets.
    apiRequest('/products/comparison-targets', {
      query: queryParams(productComparisonTargetQuery(params)),
    }),
  getProductMonthlyTrend: (skuGroupKey: string, params: ProductMonthlyTrendParams) : Promise<ProductMonthlyTrend> =>
    apiRequest(`/products/${encodePathSegment(skuGroupKey)}/monthly-trend`, {
      query: queryParams(productMonthlyTrendQuery(params)),
    }),
  getProductSalesInsight: (skuGroupKey: string, params: ProductSalesInsightParams) : Promise<ProductSalesInsight> =>
    apiRequest(`/products/${encodePathSegment(skuGroupKey)}/sales-insight`, {
      query: queryParams(productSalesInsightQuery(params)),
    }),
  getProductSecondaryDetail: (skuGroupKey: string, params: ProductSecondaryDetailParams) : Promise<ProductSecondaryDetail> =>
    apiRequest(`/products/${encodePathSegment(skuGroupKey)}/secondary-detail`, {
      query: queryParams(productSecondaryDetailQuery(params)),
    }),
  getSecondaryDailyTrend: ({ skuGroupKey, ...params }: SecondaryDailyTrendParams) : Promise<SecondaryDailyTrendSource> =>
    apiRequest(`/products/${encodePathSegment(skuGroupKey)}/secondary/daily-trend`, {
      query: queryParams(secondaryDailyTrendQuery(params)),
    }),
  getSecondaryInboundSplitSource: ({ skuGroupKey, ...params }: SecondaryInboundSplitSourceParams) : Promise<SecondaryInboundSplitSource> =>
    apiRequest(`/products/${encodePathSegment(skuGroupKey)}/secondary/inbound-split-source`, {
      query: queryParams(secondaryInboundSplitSourceQuery(params)),
    }),
  getSecondaryAiComment: ({ skuGroupKey, ...payload }: SecondaryAiCommentParams) : Promise<SecondaryAiCommentResult> =>
    apiRequest(`/products/${encodePathSegment(skuGroupKey)}/secondary/ai-comment`, {
      method: 'POST',
      body: payload,
    }),
  getSecondaryCompetitorChannels: () : Promise<SecondaryCompetitorChannel[]> => apiRequest('/secondary/competitor-channels'),
  // Candidate stash endpoints are session-owned workflows; mutations/jobs/SSE require concrete company scope.
  // Backend doc: MD/backend-api/dashboard-api-contract-catalog.md sections 11 and 12.
  getCandidateStashes: (params: CandidateStashListParams | undefined) : Promise<CandidateStashSummary[]> =>
    apiRequest('/candidate-stashes', { query: queryParams(normalizeCompanyScopeParams(params)) }),
  getCandidateItemsByStash: ({ stashUuid, ...params }: CandidateItemListParams) : Promise<CandidateItemListResult> =>
    apiRequest(`/candidate-stashes/${encodePathSegment(stashUuid)}/items`, {
      query: queryParams(normalizeCompanyScopeParams(params)),
    }),
  subscribeCandidateOrderMetrics: (params: CandidateOrderMetricStreamParams, listener: (event: CandidateOrderMetricEvent) => void, onError: DashboardEventStreamErrorListener | undefined) : ApiEventStreamSubscription =>
    // The caller owns comparison target selection. The adapter serializes the selected subject and never chooses defaults.
    openApiEventStream(`/candidate-stashes/${encodePathSegment(params.stashUuid)}/items/order-metrics/events`, {
      requestId: params.requestId,
      dataReferencePeriodStart: params.dataReferencePeriodStart,
      dataReferencePeriodEnd: params.dataReferencePeriodEnd,
      candidateItemUuids: params.candidateItemUuids,
      companyUuid: getRequiredCompanyUuidForMutationScope(params.companyUuid),
      ...productComparisonSubjectQueryPrefix('comparison', params.comparison),
    }, listener, { onError }),
  // Starts a backend job that calculates each requested item's secondary drawer state,
  // saves CANDIDATE_ITEM.details, and emits committed CandidateItemDetail rows by SSE.
  startCandidateDetailBulkConfirm: ({ stashUuid, ...payload }: CandidateDetailBulkConfirmStartPayload) : Promise<CandidateDetailBulkConfirmStartResult> =>
    apiRequest(`/candidate-stashes/${encodePathSegment(stashUuid)}/items/detail-confirmation-jobs`, {
      method: 'POST',
      body: normalizeCompanyMutationScopeParams(payload),
    }),
  subscribeCandidateDetailBulkConfirm: (jobId: string, listener: (event: CandidateDetailBulkConfirmProgressEvent) => void, onError: DashboardEventStreamErrorListener | undefined, params: CompanyMutationScopeParams) : ApiEventStreamSubscription =>
    openApiEventStream(
      `/candidate-item-detail-confirmation-jobs/${encodePathSegment(jobId)}/events`,
      queryParams(normalizeCompanyMutationScopeParams(params)),
      listener,
      { onError },
    ),
  startCandidateStashLlmCommentJob: (stashUuid: string, params: CompanyMutationScopeParams) : Promise<CandidateStashLlmCommentJobStartResult> =>
    apiRequest(`/candidate-stashes/${encodePathSegment(stashUuid)}/llm-comment-jobs`, {
      method: 'POST',
      body: normalizeCompanyMutationScopeParams(params),
    }),
  subscribeCandidateStashLlmCommentJob: (jobId: string, listener: (event: CandidateStashLlmCommentJobProgressEvent) => void, onError: DashboardEventStreamErrorListener | undefined, params: CompanyMutationScopeParams) : ApiEventStreamSubscription =>
    openApiEventStream(
      `/candidate-stash-llm-comment-jobs/${encodePathSegment(jobId)}/events`,
      queryParams(normalizeCompanyMutationScopeParams(params)),
      listener,
      { onError },
    ),
  getCandidateRecommendations: ({ stashUuid, ...params }: CandidateRecommendationParams) : Promise<CandidateRecommendationResult> =>
    apiRequest(`/candidate-stashes/${encodePathSegment(stashUuid)}/recommendations`, {
      query: queryParams(normalizeCompanyScopeParams(params)),
    }),
  getCandidateItemByUuid: (itemUuid: string, params: CompanyScopeParams | undefined) : Promise<CandidateItemDetail | null> =>
    apiRequest(`/candidate-items/${encodePathSegment(itemUuid)}`, {
      query: queryParams(normalizeCompanyScopeParams(params)),
    }),
  deleteCandidateItem: (itemUuid: string, params: CompanyMutationScopeParams) : Promise<void> =>
    apiRequest(`/candidate-items/${encodePathSegment(itemUuid)}`, {
      method: 'DELETE',
      query: queryParams(normalizeCompanyMutationScopeParams(params)),
    }),
  deleteCandidateItems: (stashUuid: string, itemUuids: string[], params: CompanyMutationScopeParams) : Promise<void> =>
    apiRequest(`/candidate-stashes/${encodePathSegment(stashUuid)}/items`, {
      method: 'DELETE',
      body: normalizeCompanyMutationScopeParams({ itemUuids, companyUuid: params?.companyUuid }),
    }),
  deleteCandidateStash: (stashUuid: string, params: CompanyMutationScopeParams) : Promise<void> =>
    apiRequest(`/candidate-stashes/${encodePathSegment(stashUuid)}`, {
      method: 'DELETE',
      query: queryParams(normalizeCompanyMutationScopeParams(params)),
    }),
  createCandidateStash: (payload: CreateCandidateStashPayload) : Promise<CandidateStashSummary> =>
    apiRequest('/candidate-stashes', { method: 'POST', body: normalizeCompanyMutationScopeParams(payload) }),
  updateCandidateStash: ({ stashUuid, ...payload }: UpdateCandidateStashPayload) : Promise<CandidateStashSummary> =>
    apiRequest(`/candidate-stashes/${encodePathSegment(stashUuid)}`, {
      method: 'PATCH',
      body: normalizeCompanyMutationScopeParams(payload),
    }),
  duplicateCandidateStash: (stashUuid: string, params: CompanyMutationScopeParams) : Promise<void> =>
    apiRequest(`/candidate-stashes/${encodePathSegment(stashUuid)}/duplicate`, {
      method: 'POST',
      body: normalizeCompanyMutationScopeParams(params),
    }),
  appendCandidateItem: ({ stashUuid, ...payload }: AppendCandidateItemPayload) : Promise<void> =>
    apiRequest(`/candidate-stashes/${encodePathSegment(stashUuid)}/items`, {
      method: 'POST',
      body: normalizeCompanyMutationScopeParams(payload),
    }),
  appendCandidateItems: ({ stashUuid, ...payload }: AppendCandidateItemsPayload) : Promise<AppendCandidateItemsResponse> =>
    apiRequest(`/candidate-stashes/${encodePathSegment(stashUuid)}/items/bulk`, {
      method: 'POST',
      body: normalizeCompanyMutationScopeParams(payload),
    }),
  // Response contract: latest CandidateItemDetail after DB commit/cache invalidation.
  // The frontend uses isDetailConfirmed/isLatestLlmComment/dbUpdatedAt from this response
  // as the authoritative post-mutation state and protects it from stale follow-up GETs.
  updateCandidateItem: ({ itemUuid, ...payload }: UpdateCandidateItemPayload) : Promise<CandidateItemDetail> =>
    apiRequest(`/candidate-items/${encodePathSegment(itemUuid)}`, {
      method: 'PATCH',
      body: normalizeCompanyMutationScopeParams(payload),
    }),
  getCandidateStashExcelTemplateDownload: getHttpCandidateStashExcelTemplateDownload,
  uploadCandidateStashExcel: (file: File, params: CompanyMutationScopeParams) : Promise<CandidateStashExcelUploadResult> => {
    const formData: FormData = new FormData()
    formData.append('file', file)
    formData.append('companyUuid', getRequiredCompanyUuidForMutationScope(params?.companyUuid))
    return apiRequest('/candidate-stashes/import/excel', { method: 'POST', body: formData })
  },
  // Stock-order calc is a backend calculation endpoint. Do not duplicate this business calculation in UI code.
  // Backend doc: MD/backend-api/dashboard-api-contract-catalog.md section 9.
  getSecondaryStockOrderCalc: (params: SecondaryStockOrderCalcParams) : Promise<SecondaryStockOrderCalcResult> =>
    apiRequest('/secondary/stock-order-calc', { method: 'POST', body: params }),
}
