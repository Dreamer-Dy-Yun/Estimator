import { describe, expect, it } from 'vitest'
import { allCompanyBaseSubject, baseSubject, companyUuid, httpClientMocks, kreamComparison, missingSourceComparison, musinsaComparison, roleMismatchBase } from './httpDashboardRequestsTestSetup'
import { httpDashboardRequests } from './httpDashboardRequests'

describe('httpDashboardRequests product comparison subject contract', () : void => {
  it('requests dashboard runtime config without synthesizing query params', async () : Promise<void> => {
    await httpDashboardRequests.getDashboardRuntimeConfig()

    expect(httpClientMocks.apiRequest).toHaveBeenCalledWith('/dashboard/runtime-config')
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
      orderCoverageDays: 21,
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

  it('omits all-company self source from product subject query and preserves concrete comparison source', async () : Promise<void> => {
    await httpDashboardRequests.getProductMonthlyTrend('SKU-054-BLK', {
      startDate: '2025-01-01',
      endDate: '2025-12-31',
      forecastMonths: 12,
      base: allCompanyBaseSubject,
      comparison: kreamComparison,
    })

    expect(httpClientMocks.apiRequest).toHaveBeenCalledWith(
      '/products/SKU-054-BLK/monthly-trend',
      {
        query: {
          startDate: '2025-01-01',
          endDate: '2025-12-31',
          forecastMonths: '12',
          baseRole: 'base',
          baseKind: 'self-company',
          comparisonRole: 'comparison',
          comparisonKind: 'competitor-channel',
          comparisonSourceId: 'kream',
        },
      },
    )
  })

  it('uses subject query fields for product target and sales insight endpoints', async () : Promise<void> => {
    await httpDashboardRequests.getProductComparisonTargets({ base: baseSubject })
    await httpDashboardRequests.getProductSalesInsight('SKU-054-BLK', {
      startDate: '2025-01-01',
      endDate: '2025-12-31',
      base: baseSubject,
      comparison: musinsaComparison,
    })

    expect(httpClientMocks.apiRequest).toHaveBeenNthCalledWith(
      1,
      '/products/comparison-targets',
      {
        query: {
          baseRole: 'base',
          baseKind: 'self-company',
          baseSourceId: companyUuid,
        },
      },
    )
    expect(httpClientMocks.apiRequest).toHaveBeenNthCalledWith(
      2,
      '/products/SKU-054-BLK/sales-insight',
      {
        query: {
          startDate: '2025-01-01',
          endDate: '2025-12-31',
          baseRole: 'base',
          baseKind: 'self-company',
          baseSourceId: companyUuid,
          comparisonRole: 'comparison',
          comparisonKind: 'competitor-channel',
          comparisonSourceId: 'musinsa',
        },
      },
    )
  })

  it('hard-fails invalid product subject role and missing competitor source before HTTP', () : void => {
    expect(() : Promise<unknown> => httpDashboardRequests.getProductDrawerBundle('SKU-054-BLK', {
      base: roleMismatchBase as unknown as typeof baseSubject,
    })).toThrow('baseRole mismatch')

    expect(() : Promise<unknown> => httpDashboardRequests.getProductSalesInsight('SKU-054-BLK', {
      startDate: '2025-01-01',
      endDate: '2025-12-31',
      base: baseSubject,
      comparison: missingSourceComparison as unknown as typeof musinsaComparison,
    })).toThrow('comparisonSourceId is required')

    expect(httpClientMocks.apiRequest).not.toHaveBeenCalled()
  })
})
