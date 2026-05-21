import type {
  CandidateStashExcelTemplateDownload,
  DashboardApi,
} from '../types'
import { normalizeCompanyScopeParams } from '../types'
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
  getSelfSales: (params) =>
    apiRequest('/sales/self', { query: queryParams(normalizeCompanyScopeParams(params)) }),
  getCompetitorSales: (params) =>
    apiRequest('/sales/competitor', { query: queryParams(normalizeCompanyScopeParams(params)) }),
  getSelfSalesScatterGrid: (params) =>
    apiRequest('/sales/self/scatter-grid', { query: queryParams(normalizeCompanyScopeParams(params)) }),
  getCompetitorSalesScatterGrid: (params) =>
    apiRequest('/sales/competitor/scatter-grid', { query: queryParams(normalizeCompanyScopeParams(params)) }),
  getSalesFilterMeta: (params) =>
    apiRequest('/sales/filter-meta', { query: queryParams(normalizeCompanyScopeParams(params)) }),
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
  subscribeCandidateOrderMetrics: (params, listener, onError) =>
    openApiEventStream(`/candidate-stashes/${encodePathSegment(params.stashUuid)}/items/order-metrics/events`, {
      requestId: params.requestId,
      dataReferencePeriodStart: params.dataReferencePeriodStart,
      dataReferencePeriodEnd: params.dataReferencePeriodEnd,
      candidateItemUuids: params.candidateItemUuids,
    }, listener, { onError }),
  // Starts a backend job that calculates each requested item's secondary drawer state,
  // saves CANDIDATE_ITEM.details, and emits committed CandidateItemDetail rows by SSE.
  startCandidateDetailBulkConfirm: ({ stashUuid, ...payload }) =>
    apiRequest(`/candidate-stashes/${encodePathSegment(stashUuid)}/items/detail-confirmation-jobs`, {
      method: 'POST',
      body: payload,
    }),
  subscribeCandidateDetailBulkConfirm: (jobId, listener, onError) =>
    openApiEventStream(
      `/candidate-item-detail-confirmation-jobs/${encodePathSegment(jobId)}/events`,
      undefined,
      listener,
      { onError },
    ),
  startCandidateStashLlmCommentJob: (stashUuid) =>
    apiRequest(`/candidate-stashes/${encodePathSegment(stashUuid)}/llm-comment-jobs`, { method: 'POST' }),
  subscribeCandidateStashLlmCommentJob: (jobId, listener, onError) =>
    openApiEventStream(
      `/candidate-stash-llm-comment-jobs/${encodePathSegment(jobId)}/events`,
      undefined,
      listener,
      { onError },
    ),
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
  // Response contract: latest CandidateItemDetail after DB commit/cache invalidation.
  // The frontend uses isDetailConfirmed/isLatestLlmComment/dbUpdatedAt from this response
  // as the authoritative post-mutation state and protects it from stale follow-up GETs.
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
