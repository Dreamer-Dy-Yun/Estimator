import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ALL_COMPANY_UUID, type CompanyMutationScopeParams } from '../types/company'
import { httpDashboardRequests } from './httpDashboardRequests'

const httpClientMocks = vi.hoisted(() => ({
  apiRequest: vi.fn(() => Promise.resolve(undefined)),
  buildApiUrl: vi.fn((path: string) => `http://api.test${path}`),
  openApiEventStream: vi.fn(() => ({ close: vi.fn() })),
}))

vi.mock('./httpClient', () => ({
  apiRequest: httpClientMocks.apiRequest,
  buildApiUrl: httpClientMocks.buildApiUrl,
  openApiEventStream: httpClientMocks.openApiEventStream,
}))

const companyUuid = 'company-uuid-054'
type ApiRequestCall = [string, { query?: Record<string, unknown>; body?: unknown; method?: string }?]

beforeEach(() => {
  httpClientMocks.apiRequest.mockClear()
  httpClientMocks.buildApiUrl.mockClear()
  httpClientMocks.openApiEventStream.mockClear()
})

describe('httpDashboardRequests company scope forwarding', () => {
  it('forwards companyUuid through query requests and omits ALL_COMPANY_UUID', async () => {
    await httpDashboardRequests.getCandidateItemsByStash({
      stashUuid: 'stash-054',
      companyUuid,
      dataReferencePeriodStart: '2025-01-01',
      dataReferencePeriodEnd: '2025-12-31',
    })

    expect(httpClientMocks.apiRequest).toHaveBeenCalledWith(
      '/candidate-stashes/stash-054/items',
      {
        query: expect.objectContaining({
          companyUuid,
          dataReferencePeriodStart: '2025-01-01',
          dataReferencePeriodEnd: '2025-12-31',
        }),
      },
    )

    await httpDashboardRequests.getSelfSales({
      companyUuid: ALL_COMPANY_UUID,
      startDate: '2025-01-01',
      endDate: '2025-12-31',
    })

    const apiRequestCalls = httpClientMocks.apiRequest.mock.calls as unknown as ApiRequestCall[]
    const allCompanyQuery = apiRequestCalls[1]?.[1]?.query
    expect(allCompanyQuery).toMatchObject({
      startDate: '2025-01-01',
      endDate: '2025-12-31',
    })
    expect(allCompanyQuery).not.toHaveProperty('companyUuid')
  })

  it('forwards companyUuid through create, append, and update request bodies', async () => {
    await httpDashboardRequests.createCandidateStash({
      companyUuid,
      name: 'Spring 2025',
      note: 'scope test',
      periodStart: '2025-01-01',
      periodEnd: '2025-03-31',
      forecastMonths: 3,
    })
    await httpDashboardRequests.appendCandidateItems({
      stashUuid: 'stash-054',
      companyUuid,
      skuGroupKeys: ['SKU-054-BLK'],
    })
    await httpDashboardRequests.updateCandidateStash({
      stashUuid: 'stash-054',
      companyUuid,
      name: 'Spring 2025 updated',
      note: null,
    })

    expect(httpClientMocks.apiRequest).toHaveBeenNthCalledWith(
      1,
      '/candidate-stashes',
      expect.objectContaining({
        method: 'POST',
        body: expect.objectContaining({ companyUuid }),
      }),
    )
    expect(httpClientMocks.apiRequest).toHaveBeenNthCalledWith(
      2,
      '/candidate-stashes/stash-054/items/bulk',
      expect.objectContaining({
        method: 'POST',
        body: expect.objectContaining({ companyUuid }),
      }),
    )
    expect(httpClientMocks.apiRequest).toHaveBeenNthCalledWith(
      3,
      '/candidate-stashes/stash-054',
      expect.objectContaining({
        method: 'PATCH',
        body: expect.objectContaining({ companyUuid }),
      }),
    )
  })

  it('preserves concrete companyUuid for secondary read-like POST bodies', async () => {
    await httpDashboardRequests.getSecondaryAiComment({
      skuGroupKey: 'SKU-054-BLK',
      companyUuid,
      periodStart: '2025-01-01',
      periodEnd: '2025-03-31',
      forecastMonths: 3,
      competitorChannelId: 'musinsa',
    })
    await httpDashboardRequests.getSecondaryStockOrderCalc({
      skuGroupKey: 'SKU-054-BLK',
      companyUuid,
      periodStart: '2025-01-01',
      periodEnd: '2025-03-31',
      serviceLevelPct: 95,
      leadTimeDays: 21,
      safetyStockMode: 'formula',
      manualSafetyStock: 0,
    })

    expect(httpClientMocks.apiRequest).toHaveBeenNthCalledWith(
      1,
      '/products/SKU-054-BLK/secondary/ai-comment',
      expect.objectContaining({
        method: 'POST',
        body: expect.objectContaining({ companyUuid }),
      }),
    )
    expect(httpClientMocks.apiRequest).toHaveBeenNthCalledWith(
      2,
      '/secondary/stock-order-calc',
      expect.objectContaining({
        method: 'POST',
        body: expect.objectContaining({ companyUuid }),
      }),
    )
  })

  it('omits ALL, blank, and missing company scope for secondary read-like POST bodies', async () => {
    await httpDashboardRequests.getSecondaryAiComment({
      skuGroupKey: 'SKU-054-BLK',
      companyUuid: ALL_COMPANY_UUID,
      periodStart: '2025-01-01',
      periodEnd: '2025-03-31',
      forecastMonths: 3,
      competitorChannelId: 'musinsa',
    })
    await httpDashboardRequests.getSecondaryAiComment({
      skuGroupKey: 'SKU-054-BLK',
      companyUuid: '   ',
      periodStart: '2025-01-01',
      periodEnd: '2025-03-31',
      forecastMonths: 3,
      competitorChannelId: 'musinsa',
    })
    await httpDashboardRequests.getSecondaryStockOrderCalc({
      skuGroupKey: 'SKU-054-BLK',
      periodStart: '2025-01-01',
      periodEnd: '2025-03-31',
      serviceLevelPct: 95,
      leadTimeDays: 21,
      safetyStockMode: 'formula',
      manualSafetyStock: 0,
    })
    await httpDashboardRequests.getSecondaryStockOrderCalc({
      skuGroupKey: 'SKU-054-BLK',
      companyUuid: ALL_COMPANY_UUID,
      periodStart: '2025-01-01',
      periodEnd: '2025-03-31',
      serviceLevelPct: 95,
      leadTimeDays: 21,
      safetyStockMode: 'formula',
      manualSafetyStock: 0,
    })

    const apiRequestCalls = httpClientMocks.apiRequest.mock.calls as unknown as ApiRequestCall[]
    expect(apiRequestCalls[0]?.[1]?.body).not.toHaveProperty('companyUuid')
    expect(apiRequestCalls[1]?.[1]?.body).not.toHaveProperty('companyUuid')
    expect(apiRequestCalls[2]?.[1]?.body).not.toHaveProperty('companyUuid')
    expect(apiRequestCalls[3]?.[1]?.body).not.toHaveProperty('companyUuid')
  })

  it('forwards companyUuid through upload FormData', async () => {
    const file = new File(['skuGroupKey\nSKU-054-BLK'], 'candidate-stash.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })

    await httpDashboardRequests.uploadCandidateStashExcel(file, { companyUuid })

    const apiRequestCalls = httpClientMocks.apiRequest.mock.calls as unknown as ApiRequestCall[]
    const scopedBody = apiRequestCalls[0]?.[1]?.body
    expect(scopedBody).toBeInstanceOf(FormData)
    expect((scopedBody as FormData).get('file')).toBe(file)
    expect((scopedBody as FormData).get('companyUuid')).toBe(companyUuid)
  })

  it('forwards companyUuid through order metrics and detail bulk confirm SSE queries', () => {
    const listener = vi.fn()
    const onError = vi.fn()

    httpDashboardRequests.subscribeCandidateOrderMetrics(
      {
        stashUuid: 'stash-054',
        companyUuid,
        requestId: 'request-054',
        dataReferencePeriodStart: '2025-01-01',
        dataReferencePeriodEnd: '2025-12-31',
        candidateItemUuids: ['item-054'],
      },
      listener,
      onError,
    )
    httpDashboardRequests.subscribeCandidateDetailBulkConfirm(
      'job-054',
      listener,
      onError,
      { companyUuid },
    )

    expect(httpClientMocks.openApiEventStream).toHaveBeenNthCalledWith(
      1,
      '/candidate-stashes/stash-054/items/order-metrics/events',
      expect.objectContaining({
        companyUuid,
        requestId: 'request-054',
        candidateItemUuids: ['item-054'],
      }),
      listener,
      { onError },
    )
    expect(httpClientMocks.openApiEventStream).toHaveBeenNthCalledWith(
      2,
      '/candidate-item-detail-confirmation-jobs/job-054/events',
      expect.objectContaining({ companyUuid }),
      listener,
      { onError },
    )
  })

  it('hard-fails mutation and job requests before HTTP when company scope is missing or all-company', async () => {
    expect(() =>
      httpDashboardRequests.createCandidateStash({
        companyUuid: ALL_COMPANY_UUID,
        name: 'Spring 2025',
        note: null,
        periodStart: '2025-01-01',
        periodEnd: '2025-03-31',
        forecastMonths: 3,
      }),
    ).toThrow('single company scope')

    expect(() =>
      httpDashboardRequests.appendCandidateItems({
        stashUuid: 'stash-054',
        companyUuid: '   ',
        skuGroupKeys: ['SKU-054-BLK'],
      }),
    ).toThrow('single company scope')

    expect(() =>
      httpDashboardRequests.startCandidateStashLlmCommentJob('stash-054', undefined as never),
    ).toThrow('single company scope')
    expect(httpClientMocks.apiRequest).not.toHaveBeenCalled()
  })

  it('hard-fails SSE subscriptions before opening a stream when company scope is missing or all-company', () => {
    const listener = vi.fn()
    const onError = vi.fn()

    expect(() =>
      httpDashboardRequests.subscribeCandidateOrderMetrics(
        {
          stashUuid: 'stash-054',
          companyUuid: ALL_COMPANY_UUID,
          requestId: 'request-054',
          dataReferencePeriodStart: '2025-01-01',
          dataReferencePeriodEnd: '2025-12-31',
          candidateItemUuids: ['item-054'],
        },
        listener,
        onError,
      ),
    ).toThrow('single company scope')

    expect(() =>
      httpDashboardRequests.subscribeCandidateDetailBulkConfirm(
        'job-054',
        listener,
        onError,
        undefined as unknown as CompanyMutationScopeParams,
      ),
    ).toThrow('single company scope')
    expect(httpClientMocks.openApiEventStream).not.toHaveBeenCalled()
  })
})
