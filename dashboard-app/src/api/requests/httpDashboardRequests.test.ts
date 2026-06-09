import type { AppendCandidateItemsResponse, CandidateOrderMetricSubscription, CandidateStashLlmCommentJobStartResult, CandidateStashSummary } from '..'
import type { CandidateJobSubscription } from '../types/candidate'
import { beforeEach, describe, expect, it, vi , type Mock} from 'vitest';
import { ALL_COMPANY_UUID, type CompanyMutationScopeParams } from '../types/company'
import type { CandidateOrderMetricStreamParams } from '../types/candidate-order-metrics'
import { httpDashboardRequests } from './httpDashboardRequests'

const httpClientMocks: { apiRequest: Mock<() => Promise<undefined>>; buildApiUrl: Mock<(path: string) => string>; openApiEventStream: Mock<() => { close: Mock<(...args: unknown[]) => unknown>; }>; } = vi.hoisted(() : { apiRequest: Mock<() => Promise<undefined>>; buildApiUrl: Mock<(path: string) => string>; openApiEventStream: Mock<() => { close: Mock<(...args: unknown[]) => unknown>; }>; } => ({
  apiRequest: vi.fn(() : Promise<undefined> => Promise.resolve(undefined)),
  buildApiUrl: vi.fn((path: string) : string => `http://api.test${path}`),
  openApiEventStream: vi.fn(() : { close: Mock<(...args: unknown[]) => unknown>; } => ({ close: vi.fn() })),
}))

vi.mock('./httpClient', () : { apiRequest: Mock<() => Promise<undefined>>; buildApiUrl: Mock<(path: string) => string>; openApiEventStream: Mock<() => { close: Mock<(...args: unknown[]) => unknown>; }>; } => ({
  apiRequest: httpClientMocks.apiRequest,
  buildApiUrl: httpClientMocks.buildApiUrl,
  openApiEventStream: httpClientMocks.openApiEventStream,
}))

const companyUuid = 'company-uuid-054' as const
const baseSubject = { role: 'base', kind: 'self-company', sourceId: companyUuid } as const
const unscopedBaseSubject = { role: 'base', kind: 'self-company' } as const
const musinsaComparison = { role: 'comparison', kind: 'competitor-channel', sourceId: 'musinsa' } as const
const kreamComparison = { role: 'comparison', kind: 'competitor-channel', sourceId: 'kream' } as const
export type ApiRequestCall = [string, { query?: Record<string, unknown>; body?: unknown; method?: string }?]

beforeEach(() : void => {
  httpClientMocks.apiRequest.mockClear()
  httpClientMocks.buildApiUrl.mockClear()
  httpClientMocks.openApiEventStream.mockClear()
})

describe('httpDashboardRequests company scope forwarding', () : void => {
  it('forwards companyUuid through query requests and omits ALL_COMPANY_UUID', async () : Promise<void> => {
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

    const apiRequestCalls: ApiRequestCall[] = httpClientMocks.apiRequest.mock.calls as unknown as ApiRequestCall[]
    const allCompanyQuery: Record<string, unknown> | undefined = apiRequestCalls[1]?.[1]?.query
    expect(allCompanyQuery).toMatchObject({
      startDate: '2025-01-01',
      endDate: '2025-12-31',
    })
    expect(allCompanyQuery).not.toHaveProperty('companyUuid')

    await httpDashboardRequests.getSecondaryDailyTrend({
      skuGroupKey: 'SKU-054-BLK',
      startDate: '2025-01-01',
      endDate: '2026-05-28',
      forecastDays: 30,
      base: baseSubject,
      comparison: kreamComparison,
    })

    const dailyTrendQuery: Record<string, unknown> | undefined = apiRequestCalls[2]?.[1]?.query
    expect(dailyTrendQuery).toMatchObject({
      baseRole: 'base',
      baseKind: 'self-company',
      baseSourceId: companyUuid,
      startDate: '2025-01-01',
      endDate: '2026-05-28',
      forecastDays: '30',
      comparisonRole: 'comparison',
      comparisonKind: 'competitor-channel',
      comparisonSourceId: 'kream',
    })
    expect(httpClientMocks.apiRequest).toHaveBeenNthCalledWith(
      3,
      '/products/SKU-054-BLK/secondary/daily-trend',
      expect.objectContaining({ query: dailyTrendQuery }),
    )
  })

  it('forwards companyUuid through create, append, and update request bodies', async () : Promise<void> => {
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

  it('preserves concrete companyUuid for secondary read-like POST bodies', async () : Promise<void> => {
    await httpDashboardRequests.getSecondaryAiComment({
      skuGroupKey: 'SKU-054-BLK',
      periodStart: '2025-01-01',
      periodEnd: '2025-03-31',
      forecastMonths: 3,
      base: baseSubject,
      comparison: musinsaComparison,
    })
    await httpDashboardRequests.getSecondaryStockOrderCalc({
      skuGroupKey: 'SKU-054-BLK',
      base: baseSubject,
      periodStart: '2025-01-01',
      periodEnd: '2025-03-31',
      leadTimeDays: 21,
    })

    expect(httpClientMocks.apiRequest).toHaveBeenNthCalledWith(
      1,
      '/products/SKU-054-BLK/secondary/ai-comment',
      expect.objectContaining({
        method: 'POST',
        body: expect.objectContaining({ base: baseSubject, comparison: musinsaComparison }),
      }),
    )
    expect(httpClientMocks.apiRequest).toHaveBeenNthCalledWith(
      2,
      '/secondary/stock-order-calc',
      expect.objectContaining({
        method: 'POST',
        body: expect.objectContaining({ base: baseSubject }),
      }),
    )
  })

  it('omits ALL, blank, and missing company scope for secondary read-like POST bodies', async () : Promise<void> => {
    await httpDashboardRequests.getSecondaryAiComment({
      skuGroupKey: 'SKU-054-BLK',
      periodStart: '2025-01-01',
      periodEnd: '2025-03-31',
      forecastMonths: 3,
      base: unscopedBaseSubject,
      comparison: musinsaComparison,
    })
    await httpDashboardRequests.getSecondaryAiComment({
      skuGroupKey: 'SKU-054-BLK',
      periodStart: '2025-01-01',
      periodEnd: '2025-03-31',
      forecastMonths: 3,
      base: unscopedBaseSubject,
      comparison: musinsaComparison,
    })
    await httpDashboardRequests.getSecondaryStockOrderCalc({
      skuGroupKey: 'SKU-054-BLK',
      base: unscopedBaseSubject,
      periodStart: '2025-01-01',
      periodEnd: '2025-03-31',
      leadTimeDays: 21,
    })
    await httpDashboardRequests.getSecondaryStockOrderCalc({
      skuGroupKey: 'SKU-054-BLK',
      base: unscopedBaseSubject,
      periodStart: '2025-01-01',
      periodEnd: '2025-03-31',
      leadTimeDays: 21,
    })

    const apiRequestCalls: ApiRequestCall[] = httpClientMocks.apiRequest.mock.calls as unknown as ApiRequestCall[]
    expect(apiRequestCalls[0]?.[1]?.body).not.toHaveProperty('companyUuid')
    expect(apiRequestCalls[1]?.[1]?.body).not.toHaveProperty('companyUuid')
    expect(apiRequestCalls[2]?.[1]?.body).not.toHaveProperty('companyUuid')
    expect(apiRequestCalls[3]?.[1]?.body).not.toHaveProperty('companyUuid')
  })

  it('forwards companyUuid through upload FormData', async () : Promise<void> => {
    const file: File = new File(['skuGroupKey\nSKU-054-BLK'], 'candidate-stash.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })

    await httpDashboardRequests.uploadCandidateStashExcel(file, { companyUuid })

    const apiRequestCalls: ApiRequestCall[] = httpClientMocks.apiRequest.mock.calls as unknown as ApiRequestCall[]
    const scopedBody: unknown = apiRequestCalls[0]?.[1]?.body
    expect(scopedBody).toBeInstanceOf(FormData)
    expect((scopedBody as FormData).get('file')).toBe(file)
    expect((scopedBody as FormData).get('companyUuid')).toBe(companyUuid)
  })

  it('forwards companyUuid through order metrics and detail bulk confirm SSE queries', () : void => {
    const listener: Mock<(...args: unknown[]) => unknown> = vi.fn()
    const onError: Mock<(...args: unknown[]) => unknown> = vi.fn()

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

  it('hard-fails mutation and job requests before HTTP when company scope is missing or all-company', async () : Promise<void> => {
    expect(() : Promise<CandidateStashSummary> =>
      httpDashboardRequests.createCandidateStash({
        companyUuid: ALL_COMPANY_UUID,
        name: 'Spring 2025',
        note: null,
        periodStart: '2025-01-01',
        periodEnd: '2025-03-31',
        forecastMonths: 3,
      }),
    ).toThrow('single company scope')

    expect(() : Promise<AppendCandidateItemsResponse> =>
      httpDashboardRequests.appendCandidateItems({
        stashUuid: 'stash-054',
        companyUuid: '   ',
        skuGroupKeys: ['SKU-054-BLK'],
      }),
    ).toThrow('single company scope')

    expect(() : Promise<CandidateStashLlmCommentJobStartResult> =>
      httpDashboardRequests.startCandidateStashLlmCommentJob('stash-054', undefined as never),
    ).toThrow('single company scope')
    expect(httpClientMocks.apiRequest).not.toHaveBeenCalled()
  })

  it('hard-fails SSE subscriptions before opening a stream when company scope is missing or all-company', () : void => {
    const listener: Mock<(...args: unknown[]) => unknown> = vi.fn()
    const onError: Mock<(...args: unknown[]) => unknown> = vi.fn()

    expect(() : CandidateOrderMetricSubscription =>
      httpDashboardRequests.subscribeCandidateOrderMetrics(
        {
          stashUuid: 'stash-054',
          requestId: 'request-054',
          dataReferencePeriodStart: '2025-01-01',
          dataReferencePeriodEnd: '2025-12-31',
          candidateItemUuids: ['item-054'],
        } as unknown as CandidateOrderMetricStreamParams,
        listener,
        onError,
      ),
    ).toThrow('single company scope')

    expect(() : CandidateOrderMetricSubscription =>
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

    expect(() : CandidateJobSubscription =>
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
