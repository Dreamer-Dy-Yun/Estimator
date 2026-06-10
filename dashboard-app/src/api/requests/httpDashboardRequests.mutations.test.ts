import type { AppendCandidateItemsResponse, CandidateStashLlmCommentJobStartResult, CandidateStashSummary } from '..'
import { describe, expect, it } from 'vitest'
import { ALL_COMPANY_UUID } from '../types/company'
import { companyUuid, httpClientMocks } from './httpDashboardRequestsTestSetup'
import { httpDashboardRequests } from './httpDashboardRequests'

describe('httpDashboardRequests mutation scope contract', () : void => {
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

  it('maps candidate mutation endpoints, methods, and scope placement explicitly', async () : Promise<void> => {
    await httpDashboardRequests.deleteCandidateItem('item-054', { companyUuid })
    await httpDashboardRequests.deleteCandidateItems('stash-054', ['item-054'], { companyUuid })
    await httpDashboardRequests.deleteCandidateStash('stash-054', { companyUuid })
    await httpDashboardRequests.duplicateCandidateStash('stash-054', { companyUuid })
    await httpDashboardRequests.updateCandidateItem({
      itemUuid: 'item-054',
      companyUuid,
      details: null,
      isLatestLlmComment: false,
    })
    await httpDashboardRequests.startCandidateDetailBulkConfirm({
      stashUuid: 'stash-054',
      itemUuids: ['item-054'],
      dataReferencePeriodStart: '2025-01-01',
      dataReferencePeriodEnd: '2025-12-31',
      companyUuid,
    })

    expect(httpClientMocks.apiRequest).toHaveBeenNthCalledWith(
      1,
      '/candidate-items/item-054',
      expect.objectContaining({
        method: 'DELETE',
        query: { companyUuid },
      }),
    )
    expect(httpClientMocks.apiRequest).toHaveBeenNthCalledWith(
      2,
      '/candidate-stashes/stash-054/items',
      expect.objectContaining({
        method: 'DELETE',
        body: { itemUuids: ['item-054'], companyUuid },
      }),
    )
    expect(httpClientMocks.apiRequest).toHaveBeenNthCalledWith(
      3,
      '/candidate-stashes/stash-054',
      expect.objectContaining({
        method: 'DELETE',
        query: { companyUuid },
      }),
    )
    expect(httpClientMocks.apiRequest).toHaveBeenNthCalledWith(
      4,
      '/candidate-stashes/stash-054/duplicate',
      expect.objectContaining({
        method: 'POST',
        body: { companyUuid },
      }),
    )
    expect(httpClientMocks.apiRequest).toHaveBeenNthCalledWith(
      5,
      '/candidate-items/item-054',
      expect.objectContaining({
        method: 'PATCH',
        body: { companyUuid, details: null, isLatestLlmComment: false },
      }),
    )
    expect(httpClientMocks.apiRequest).toHaveBeenNthCalledWith(
      6,
      '/candidate-stashes/stash-054/items/detail-confirmation-jobs',
      expect.objectContaining({
        method: 'POST',
        body: {
          itemUuids: ['item-054'],
          dataReferencePeriodStart: '2025-01-01',
          dataReferencePeriodEnd: '2025-12-31',
          companyUuid,
        },
      }),
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
})
