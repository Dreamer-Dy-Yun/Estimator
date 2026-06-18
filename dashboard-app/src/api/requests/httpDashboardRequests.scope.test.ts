import { describe, expect, it } from 'vitest'
import { ALL_COMPANY_UUID } from '../types/company'
import { baseSubject, companyUuid, httpClientMocks, kreamComparison, musinsaComparison, unscopedBaseSubject, type ApiRequestCall } from './httpDashboardRequestsTestSetup'
import { httpDashboardRequests } from './httpDashboardRequests'

describe('httpDashboardRequests company read scope contract', () : void => {
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
    const productIdentity = { productUuid: null, skuGroupKey: 'SKU-054-BLK', brand: 'Brand', code: 'SKU-054', colorCode: 'BLK' } as const
    await httpDashboardRequests.getSecondaryStockOrderCalc({
      skuGroupKey: 'SKU-054-BLK',
      productIdentity,
      base: unscopedBaseSubject,
      periodStart: '2025-01-01',
      periodEnd: '2025-03-31',
      calculationBaseDate: '2026-01-01',
      currentOrderInboundDueDate: '2026-02-01',
      orderCoverageDays: 21,
    })
    await httpDashboardRequests.getSecondaryStockOrderCalc({
      skuGroupKey: 'SKU-054-BLK',
      productIdentity,
      base: unscopedBaseSubject,
      periodStart: '2025-01-01',
      periodEnd: '2025-03-31',
      calculationBaseDate: '2026-01-01',
      currentOrderInboundDueDate: '2026-02-01',
      orderCoverageDays: 21,
    })

    const apiRequestCalls: ApiRequestCall[] = httpClientMocks.apiRequest.mock.calls as unknown as ApiRequestCall[]
    expect(apiRequestCalls[0]?.[1]?.body).not.toHaveProperty('companyUuid')
    expect(apiRequestCalls[1]?.[1]?.body).not.toHaveProperty('companyUuid')
    expect(apiRequestCalls[2]?.[1]?.body).not.toHaveProperty('companyUuid')
    expect(apiRequestCalls[3]?.[1]?.body).not.toHaveProperty('companyUuid')
  })
})
