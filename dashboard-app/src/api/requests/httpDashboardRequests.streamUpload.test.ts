import type { CandidateOrderMetricSubscription } from '..'
import type { CandidateJobSubscription } from '../types/candidate'
import type { CandidateOrderMetricStreamParams } from '../types/candidate-order-metrics'
import type { CompanyMutationScopeParams } from '../types/company'
import { describe, expect, it, vi, type Mock } from 'vitest'
import { ALL_COMPANY_UUID } from '../types/company'
import { companyUuid, httpClientMocks, type ApiRequestCall } from './httpDashboardRequestsTestSetup'
import { httpDashboardRequests } from './httpDashboardRequests'

describe('httpDashboardRequests stream and upload scope contract', () : void => {
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
