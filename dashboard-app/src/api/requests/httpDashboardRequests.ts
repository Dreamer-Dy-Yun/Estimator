import type { AppendCandidateItemsResponse, CandidateDetailBulkConfirmProgressEvent, CandidateDetailBulkConfirmStartPayload, CandidateDetailBulkConfirmStartResult, CandidateItemDetail, CandidateItemListParams, CandidateItemListResult, CandidateOrderMetricEvent, CandidateOrderMetricStreamParams, CandidateRecommendationParams, CandidateRecommendationResult, CandidateStashExcelUploadResult, CandidateStashLlmCommentJobProgressEvent, CandidateStashLlmCommentJobStartResult, CandidateStashSummary, CompanyScopeParams, CompetitorSalesParams, DashboardEventStreamErrorListener, ProductDrawerBundle, ProductMonthlyTrend, ProductMonthlyTrendParams, ProductSalesInsight, ProductSecondaryDetail, SalesFilterMeta, SecondaryAiCommentParams, SecondaryAiCommentResult, SecondaryCompetitorChannel, SecondaryStockOrderCalcResult, SelfSalesParams, UpdateCandidateItemPayload } from '..'
import type { CompetitorSalesRow, SelfSalesRow } from '../../types'
import type { AppendCandidateItemPayload, AppendCandidateItemsPayload, CompanyMutationScopeParams, CompetitorSalesGridParams, CreateCandidateStashPayload, ProductDrawerBundleParams, ProductSalesInsightParams, ProductSecondaryDetailParams, ScatterSalesGridResponse, SecondaryDailyTrendParams, SecondaryDailyTrendPoint, SecondaryStockOrderCalcParams, SelfSalesGridParams, UpdateCandidateStashPayload } from '../types'
import type { CandidateStashListParams } from '../types/candidate'
import type { ApiEventStreamSubscription } from './httpClient'
import type {
  CandidateStashExcelTemplateDownload,
  DashboardApi,
} from '../types'
import {
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
 */
function getHttpCandidateStashExcelTemplateDownload(): CandidateStashExcelTemplateDownload {
  return {
    href: buildApiUrl('/candidate-stashes/excel-template'),
    filename: candidateStashExcelTemplateFilename,
  }
}

export const httpDashboardRequests: DashboardApi = {
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
  getProductDrawerBundle: (skuGroupKey: string, params: ProductDrawerBundleParams | undefined) : Promise<ProductDrawerBundle> =>
    apiRequest(`/products/${encodePathSegment(skuGroupKey)}/drawer-bundle`, {
      query: queryParams(normalizeCompanyScopeParams(params)),
    }),
  getProductMonthlyTrend: (skuGroupKey: string, params: ProductMonthlyTrendParams) : Promise<ProductMonthlyTrend> =>
    apiRequest(`/products/${encodePathSegment(skuGroupKey)}/monthly-trend`, {
      query: queryParams(normalizeCompanyScopeParams(params)),
    }),
  getProductSalesInsight: (skuGroupKey: string, params: ProductSalesInsightParams) : Promise<ProductSalesInsight> =>
    apiRequest(`/products/${encodePathSegment(skuGroupKey)}/sales-insight`, {
      query: queryParams(normalizeCompanyScopeParams(params)),
    }),
  getProductSecondaryDetail: (skuGroupKey: string, params: ProductSecondaryDetailParams | undefined) : Promise<ProductSecondaryDetail> =>
    apiRequest(`/products/${encodePathSegment(skuGroupKey)}/secondary-detail`, {
      query: queryParams(normalizeCompanyScopeParams(params)),
    }),
  getSecondaryDailyTrend: ({ skuGroupKey, ...params }: SecondaryDailyTrendParams) : Promise<SecondaryDailyTrendPoint[]> =>
    apiRequest(`/products/${encodePathSegment(skuGroupKey)}/secondary/daily-trend`, {
      query: queryParams(normalizeCompanyScopeParams(params)),
    }),
  getSecondaryAiComment: ({ skuGroupKey, ...payload }: SecondaryAiCommentParams) : Promise<SecondaryAiCommentResult> =>
    apiRequest(`/products/${encodePathSegment(skuGroupKey)}/secondary/ai-comment`, {
      method: 'POST',
      body: normalizeCompanyScopeParams(payload),
    }),
  getSecondaryCompetitorChannels: () : Promise<SecondaryCompetitorChannel[]> => apiRequest('/secondary/competitor-channels'),
  getCandidateStashes: (params: CandidateStashListParams | undefined) : Promise<CandidateStashSummary[]> =>
    apiRequest('/candidate-stashes', { query: queryParams(normalizeCompanyScopeParams(params)) }),
  getCandidateItemsByStash: ({ stashUuid, ...params }: CandidateItemListParams) : Promise<CandidateItemListResult> =>
    apiRequest(`/candidate-stashes/${encodePathSegment(stashUuid)}/items`, {
      query: queryParams(normalizeCompanyScopeParams(params)),
    }),
  subscribeCandidateOrderMetrics: (params: CandidateOrderMetricStreamParams, listener: (event: CandidateOrderMetricEvent) => void, onError: DashboardEventStreamErrorListener | undefined) : ApiEventStreamSubscription =>
    openApiEventStream(`/candidate-stashes/${encodePathSegment(params.stashUuid)}/items/order-metrics/events`, {
      requestId: params.requestId,
      dataReferencePeriodStart: params.dataReferencePeriodStart,
      dataReferencePeriodEnd: params.dataReferencePeriodEnd,
      candidateItemUuids: params.candidateItemUuids,
      companyUuid: getRequiredCompanyUuidForMutationScope(params.companyUuid),
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
  getSecondaryStockOrderCalc: (params: SecondaryStockOrderCalcParams) : Promise<SecondaryStockOrderCalcResult> =>
    apiRequest('/secondary/stock-order-calc', { method: 'POST', body: normalizeCompanyScopeParams(params) }),
}
