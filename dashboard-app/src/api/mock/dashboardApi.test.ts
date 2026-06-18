import type { ProductComparisonBaseSubjectRef, ProductComparisonTarget, ProductMonthlyTrend, SecondaryCompetitorChannel, SecondaryStockOrderCalcResult } from '..'
import type { ProductMonthlyTrendPoint, SecondaryDailyTrendFlowCell, SecondaryDailyTrendPoint, SecondaryDailyTrendSource } from '../types'
import type { SecondaryStockOrderDisplaySizeRow } from '../types/secondary'
import { describe, expect, it } from 'vitest'
import { buildSecondaryDailyTrendPoints } from '../../dashboard/components/product-drawer/secondary/model/secondaryDailyTrendSourceModel'
import { mockDashboardApi } from './dashboardApi'
import { MOCK_HANA_COMPANY_UUID, MOCK_T1_COMPANY_UUID } from './mockCompanyScope'
import { skuGroupKeyByLegacyId } from './salesTables'

const skuGroupKey: (legacyId: string) => string = (legacyId: string) : string => skuGroupKeyByLegacyId[legacyId] ?? legacyId
const MOCK_COMPANY_UUID: '00000000-0000-4000-8000-000000000101' = MOCK_HANA_COMPANY_UUID
const MOCK_BASE_SUBJECT: ProductComparisonBaseSubjectRef = { role: 'base', kind: 'self-company', sourceId: MOCK_COMPANY_UUID }
const mockCompetitorTarget: (sourceId: string) => ProductComparisonTarget = (sourceId: string) : ProductComparisonTarget => ({
  role: 'comparison',
  kind: 'competitor-channel',
  id: `comparison:competitor-channel:${sourceId}`,
  sourceId,
  label: sourceId,
})

describe('api/mock dashboardApi competitor channel behavior', () : void => {
  it('returns runtime config with candidate order metric comparison', async () : Promise<void> => {
    const config = await mockDashboardApi.getDashboardRuntimeConfig()

    expect(config.candidateOrderMetricComparison?.role).toBe('comparison')
    expect(config.candidateOrderMetricComparison?.kind).toBe('competitor-channel')
    expect(config.candidateOrderMetricComparison?.sourceId).toBe('kream')
  })

  it('returns only kream/musinsa competitor channels', async () : Promise<void> => {
    const channels: SecondaryCompetitorChannel[] = await mockDashboardApi.getSecondaryCompetitorChannels()
    expect(channels.map((c: SecondaryCompetitorChannel) : string => c.id)).toEqual(['kream', 'musinsa'])
    expect(channels.some((c: SecondaryCompetitorChannel) : boolean => c.id === 'naver')).toBe(false)
  })

  it('applies musinsa skew to competitor sales rows', async () : Promise<void> => {
    const base: { competitorQty: number; competitorAvgPrice: number; competitorAmount: number; selfQty: number | null; selfAmount: number | null; id: string; skuGroupKey: string; rank: number; rankPercentile: number; brand: string; category: string; code: string; productName: string; colorCode: string; selfAvgPrice: number | null; }[] = await mockDashboardApi.getCompetitorSales({
      competitorChannelId: 'kream',
      companyUuid: MOCK_COMPANY_UUID,
    })
    const musinsa: { competitorQty: number; competitorAvgPrice: number; competitorAmount: number; selfQty: number | null; selfAmount: number | null; id: string; skuGroupKey: string; rank: number; rankPercentile: number; brand: string; category: string; code: string; productName: string; colorCode: string; selfAvgPrice: number | null; }[] = await mockDashboardApi.getCompetitorSales({
      competitorChannelId: 'musinsa',
      companyUuid: MOCK_COMPANY_UUID,
    })

    expect(base.length).toBeGreaterThan(0)
    expect(musinsa.length).toBe(base.length)

    const baseRow: { competitorQty: number; competitorAvgPrice: number; competitorAmount: number; selfQty: number | null; selfAmount: number | null; id: string; skuGroupKey: string; rank: number; rankPercentile: number; brand: string; category: string; code: string; productName: string; colorCode: string; selfAvgPrice: number | null; } | undefined = base.find((row: { competitorQty: number; competitorAvgPrice: number; competitorAmount: number; selfQty: number | null; selfAmount: number | null; id: string; skuGroupKey: string; rank: number; rankPercentile: number; brand: string; category: string; code: string; productName: string; colorCode: string; selfAvgPrice: number | null; }) : boolean => row.id === 'B')
    if (!baseRow) throw new Error('Expected mock competitor row B')
    const musinsaRow: { competitorQty: number; competitorAvgPrice: number; competitorAmount: number; selfQty: number | null; selfAmount: number | null; id: string; skuGroupKey: string; rank: number; rankPercentile: number; brand: string; category: string; code: string; productName: string; colorCode: string; selfAvgPrice: number | null; } | undefined = musinsa.find((row: { competitorQty: number; competitorAvgPrice: number; competitorAmount: number; selfQty: number | null; selfAmount: number | null; id: string; skuGroupKey: string; rank: number; rankPercentile: number; brand: string; category: string; code: string; productName: string; colorCode: string; selfAvgPrice: number | null; }) : boolean => row.id === baseRow.id)

    expect(musinsaRow).toBeDefined()
    if (!musinsaRow) throw new Error('Expected mock musinsa row B')

    expect(musinsaRow?.competitorAvgPrice).toBe(Math.max(0, Math.round(baseRow.competitorAvgPrice * 1.02)))
    expect(musinsaRow?.competitorQty).toBe(Math.max(0, Math.round(baseRow.competitorQty * 0.88)))
    expect(musinsaRow?.competitorAmount).toBe(
      Math.max(0, Math.round(musinsaRow.competitorQty * musinsaRow.competitorAvgPrice)),
    )
  })

  it('aggregates all competitor channels when no channel is selected', async () : Promise<void> => {
    const all: { competitorQty: number; competitorAvgPrice: number; competitorAmount: number; selfQty: number | null; selfAmount: number | null; id: string; skuGroupKey: string; rank: number; rankPercentile: number; brand: string; category: string; code: string; productName: string; colorCode: string; selfAvgPrice: number | null; }[] = await mockDashboardApi.getCompetitorSales({ companyUuid: MOCK_COMPANY_UUID })
    const kream: { competitorQty: number; competitorAvgPrice: number; competitorAmount: number; selfQty: number | null; selfAmount: number | null; id: string; skuGroupKey: string; rank: number; rankPercentile: number; brand: string; category: string; code: string; productName: string; colorCode: string; selfAvgPrice: number | null; }[] = await mockDashboardApi.getCompetitorSales({
      competitorChannelId: 'kream',
      companyUuid: MOCK_COMPANY_UUID,
    })
    const musinsa: { competitorQty: number; competitorAvgPrice: number; competitorAmount: number; selfQty: number | null; selfAmount: number | null; id: string; skuGroupKey: string; rank: number; rankPercentile: number; brand: string; category: string; code: string; productName: string; colorCode: string; selfAvgPrice: number | null; }[] = await mockDashboardApi.getCompetitorSales({
      competitorChannelId: 'musinsa',
      companyUuid: MOCK_COMPANY_UUID,
    })

    const allRow: { competitorQty: number; competitorAvgPrice: number; competitorAmount: number; selfQty: number | null; selfAmount: number | null; id: string; skuGroupKey: string; rank: number; rankPercentile: number; brand: string; category: string; code: string; productName: string; colorCode: string; selfAvgPrice: number | null; } | undefined = all.find((row: { competitorQty: number; competitorAvgPrice: number; competitorAmount: number; selfQty: number | null; selfAmount: number | null; id: string; skuGroupKey: string; rank: number; rankPercentile: number; brand: string; category: string; code: string; productName: string; colorCode: string; selfAvgPrice: number | null; }) : boolean => row.id === 'B')
    const kreamRow: { competitorQty: number; competitorAvgPrice: number; competitorAmount: number; selfQty: number | null; selfAmount: number | null; id: string; skuGroupKey: string; rank: number; rankPercentile: number; brand: string; category: string; code: string; productName: string; colorCode: string; selfAvgPrice: number | null; } | undefined = kream.find((row: { competitorQty: number; competitorAvgPrice: number; competitorAmount: number; selfQty: number | null; selfAmount: number | null; id: string; skuGroupKey: string; rank: number; rankPercentile: number; brand: string; category: string; code: string; productName: string; colorCode: string; selfAvgPrice: number | null; }) : boolean => row.id === allRow?.id)
    const musinsaRow: { competitorQty: number; competitorAvgPrice: number; competitorAmount: number; selfQty: number | null; selfAmount: number | null; id: string; skuGroupKey: string; rank: number; rankPercentile: number; brand: string; category: string; code: string; productName: string; colorCode: string; selfAvgPrice: number | null; } | undefined = musinsa.find((row: { competitorQty: number; competitorAvgPrice: number; competitorAmount: number; selfQty: number | null; selfAmount: number | null; id: string; skuGroupKey: string; rank: number; rankPercentile: number; brand: string; category: string; code: string; productName: string; colorCode: string; selfAvgPrice: number | null; }) : boolean => row.id === allRow?.id)

    expect(allRow).toBeDefined()
    expect(kreamRow).toBeDefined()
    expect(musinsaRow).toBeDefined()
    if (!allRow || !kreamRow || !musinsaRow) throw new Error('Expected mock rows for channel aggregation')
    expect(allRow.competitorQty).toBe(kreamRow.competitorQty + musinsaRow.competitorQty)
    expect(allRow.competitorAmount).toBe(kreamRow.competitorAmount + musinsaRow.competitorAmount)
    expect(allRow.competitorAvgPrice).toBe(Math.round(allRow.competitorAmount / allRow.competitorQty))
    expect(allRow.selfQty).toBe(kreamRow.selfQty)
    expect(allRow.selfAmount).toBe(kreamRow.selfAmount)
  })

  it('rejects unknown competitor channel ids instead of substituting another channel', async () : Promise<void> => {
    await expect(
      mockDashboardApi.getCompetitorSales({
        competitorChannelId: 'unknown-channel',
        companyUuid: MOCK_COMPANY_UUID,
      }),
    )
      .rejects.toThrow('Unknown mock competitor channel')
  })

  it('rejects removed competitor channel ids instead of treating them as default', async () : Promise<void> => {
    await expect(
      mockDashboardApi.getCompetitorSales({
        competitorChannelId: 'naver',
        companyUuid: MOCK_COMPANY_UUID,
      }),
    )
      .rejects.toThrow('Unknown mock competitor channel')
  })

  it('filters self and competitor sales by product code query', async () : Promise<void> => {
    const self: { qty: number; amount: number; opMarginAmount: number; id: string; skuGroupKey: string; rank: number; rankPercentile: number; brand: string; category: string; code: string; productName: string; colorCode: string; avgPrice: number; avgCost: number; marginRate: number; feeRate: number; opMarginRate: number; }[] = await mockDashboardApi.getSelfSales({
      codeQuery: 'test-shoe',
      companyUuid: MOCK_COMPANY_UUID,
    })
    const competitor: { competitorQty: number; competitorAvgPrice: number; competitorAmount: number; selfQty: number | null; selfAmount: number | null; id: string; skuGroupKey: string; rank: number; rankPercentile: number; brand: string; category: string; code: string; productName: string; colorCode: string; selfAvgPrice: number | null; }[] = await mockDashboardApi.getCompetitorSales({
      codeQuery: 'test-shoe',
      companyUuid: MOCK_COMPANY_UUID,
    })

    expect(self.map((row: { qty: number; amount: number; opMarginAmount: number; id: string; skuGroupKey: string; rank: number; rankPercentile: number; brand: string; category: string; code: string; productName: string; colorCode: string; avgPrice: number; avgCost: number; marginRate: number; feeRate: number; opMarginRate: number; }) : string => row.code)).toEqual(['TEST-SHOE'])
    expect(competitor.map((row: { competitorQty: number; competitorAvgPrice: number; competitorAmount: number; selfQty: number | null; selfAmount: number | null; id: string; skuGroupKey: string; rank: number; rankPercentile: number; brand: string; category: string; code: string; productName: string; colorCode: string; selfAvgPrice: number | null; }) : string => row.code)).toEqual(['TEST-SHOE'])
  })

  it('applies selected company scope to sales calculations instead of ignoring companyUuid', async () : Promise<void> => {
    const hanaSelf: { qty: number; amount: number; opMarginAmount: number; id: string; skuGroupKey: string; rank: number; rankPercentile: number; brand: string; category: string; code: string; productName: string; colorCode: string; avgPrice: number; avgCost: number; marginRate: number; feeRate: number; opMarginRate: number; }[] = await mockDashboardApi.getSelfSales({ companyUuid: MOCK_HANA_COMPANY_UUID })
    const t1Self: { qty: number; amount: number; opMarginAmount: number; id: string; skuGroupKey: string; rank: number; rankPercentile: number; brand: string; category: string; code: string; productName: string; colorCode: string; avgPrice: number; avgCost: number; marginRate: number; feeRate: number; opMarginRate: number; }[] = await mockDashboardApi.getSelfSales({ companyUuid: MOCK_T1_COMPANY_UUID })
    const allSelf: { qty: number; amount: number; opMarginAmount: number; id: string; skuGroupKey: string; rank: number; rankPercentile: number; brand: string; category: string; code: string; productName: string; colorCode: string; avgPrice: number; avgCost: number; marginRate: number; feeRate: number; opMarginRate: number; }[] = await mockDashboardApi.getSelfSales()
    const sumQty: (rows: { qty: number; amount: number; opMarginAmount: number; id: string; skuGroupKey: string; rank: number; rankPercentile: number; brand: string; category: string; code: string; productName: string; colorCode: string; avgPrice: number; avgCost: number; marginRate: number; feeRate: number; opMarginRate: number; }[]) => number = (rows: typeof hanaSelf) : number => rows.reduce((sum: number, row: { qty: number; amount: number; opMarginAmount: number; id: string; skuGroupKey: string; rank: number; rankPercentile: number; brand: string; category: string; code: string; productName: string; colorCode: string; avgPrice: number; avgCost: number; marginRate: number; feeRate: number; opMarginRate: number; }) : number => sum + row.qty, 0)

    expect(hanaSelf.length).toBeGreaterThan(0)
    expect(t1Self.length).toBe(hanaSelf.length)
    expect(sumQty(hanaSelf)).not.toBe(sumQty(t1Self))
    expect(sumQty(allSelf)).toBeGreaterThan(sumQty(hanaSelf))
    expect(sumQty(allSelf)).toBeGreaterThan(sumQty(t1Self))
  })

  it('returns analysis sales rows in default sales quantity descending order', async () : Promise<void> => {
    const self: { qty: number; amount: number; opMarginAmount: number; id: string; skuGroupKey: string; rank: number; rankPercentile: number; brand: string; category: string; code: string; productName: string; colorCode: string; avgPrice: number; avgCost: number; marginRate: number; feeRate: number; opMarginRate: number; }[] = await mockDashboardApi.getSelfSales({ companyUuid: MOCK_COMPANY_UUID })
    const competitor: { competitorQty: number; competitorAvgPrice: number; competitorAmount: number; selfQty: number | null; selfAmount: number | null; id: string; skuGroupKey: string; rank: number; rankPercentile: number; brand: string; category: string; code: string; productName: string; colorCode: string; selfAvgPrice: number | null; }[] = await mockDashboardApi.getCompetitorSales({ companyUuid: MOCK_COMPANY_UUID })

    expect(self.map((row: { qty: number; amount: number; opMarginAmount: number; id: string; skuGroupKey: string; rank: number; rankPercentile: number; brand: string; category: string; code: string; productName: string; colorCode: string; avgPrice: number; avgCost: number; marginRate: number; feeRate: number; opMarginRate: number; }) : number => row.qty)).toEqual([...self.map((row: { qty: number; amount: number; opMarginAmount: number; id: string; skuGroupKey: string; rank: number; rankPercentile: number; brand: string; category: string; code: string; productName: string; colorCode: string; avgPrice: number; avgCost: number; marginRate: number; feeRate: number; opMarginRate: number; }) : number => row.qty)].sort((a: number, b: number) : number => b - a))
    expect(competitor.map((row: { competitorQty: number; competitorAvgPrice: number; competitorAmount: number; selfQty: number | null; selfAmount: number | null; id: string; skuGroupKey: string; rank: number; rankPercentile: number; brand: string; category: string; code: string; productName: string; colorCode: string; selfAvgPrice: number | null; }) : number => row.competitorQty)).toEqual(
      [...competitor.map((row: { competitorQty: number; competitorAvgPrice: number; competitorAmount: number; selfQty: number | null; selfAmount: number | null; id: string; skuGroupKey: string; rank: number; rankPercentile: number; brand: string; category: string; code: string; productName: string; colorCode: string; selfAvgPrice: number | null; }) : number => row.competitorQty)].sort((a: number, b: number) : number => b - a),
    )
  })

  it('returns product code suggestions for analysis filters', async () : Promise<void> => {
    const meta: { brands: string[]; categories: string[]; codes: string[]; colorCodes: string[]; productNames: string[]; historicalMonths: string[]; } = await mockDashboardApi.getSalesFilterMeta({ companyUuid: MOCK_COMPANY_UUID })
    expect(meta.codes).toContain('TEST-SHOE')
    expect(meta.codes).toContain('B')
  })

  it('applies selected channel to secondary daily competitor trend', async () : Promise<void> => {
    const kream: SecondaryDailyTrendSource = await mockDashboardApi.getSecondaryDailyTrend({
      skuGroupKey: skuGroupKey('B'),
      startDate: '2025-01-01',
      endDate: '2026-05-28',
      forecastDays: 0,
      base: MOCK_BASE_SUBJECT,
      comparison: mockCompetitorTarget('kream'),
    })
    const musinsa: SecondaryDailyTrendSource = await mockDashboardApi.getSecondaryDailyTrend({
      skuGroupKey: skuGroupKey('B'),
      startDate: '2025-01-01',
      endDate: '2026-05-28',
      forecastDays: 0,
      base: MOCK_BASE_SUBJECT,
      comparison: mockCompetitorTarget('musinsa'),
    })

    const sumCompetitorSales: (source: SecondaryDailyTrendSource) => number = (source: SecondaryDailyTrendSource) : number =>
      Object.values(source.flowByDate).reduce((sum: number, row: SecondaryDailyTrendFlowCell) : number => sum + Math.max(0, row.comparison.sale), 0)

    expect(Object.keys(kream.flowByDate).length).toBeGreaterThan(0)
    expect(Object.keys(musinsa.flowByDate).length).toBe(Object.keys(kream.flowByDate).length)
    expect(sumCompetitorSales(musinsa)).toBeLessThan(sumCompetitorSales(kream))
  })

  it('rejects secondary daily trend subject role mismatches like the HTTP adapter', async () : Promise<void> => {
    await expect(mockDashboardApi.getSecondaryDailyTrend({
      skuGroupKey: skuGroupKey('B'),
      startDate: '2025-01-01',
      endDate: '2026-05-28',
      forecastDays: 0,
      base: { ...MOCK_BASE_SUBJECT, role: 'comparison' } as unknown as ProductComparisonBaseSubjectRef,
      comparison: mockCompetitorTarget('kream'),
    })).rejects.toThrow('expected base')

    await expect(mockDashboardApi.getSecondaryDailyTrend({
      skuGroupKey: skuGroupKey('B'),
      startDate: '2025-01-01',
      endDate: '2026-05-28',
      forecastDays: 0,
      base: MOCK_BASE_SUBJECT,
      comparison: { ...mockCompetitorTarget('kream'), role: 'base' } as unknown as ProductComparisonTarget,
    })).rejects.toThrow('expected comparison')
  })

  it('keeps daily trend actual rows through endDate and appends forecastDays after it', async () : Promise<void> => {
    const source: SecondaryDailyTrendSource = await mockDashboardApi.getSecondaryDailyTrend({
      skuGroupKey: skuGroupKey('B'),
      startDate: '2026-05-01',
      endDate: '2026-05-28',
      forecastDays: 3,
      base: MOCK_BASE_SUBJECT,
      comparison: mockCompetitorTarget('kream'),
    })

    expect(source.dateStart).toBe('2026-05-01')
    expect(source.forecastStartDate).toBe('2026-05-29')
    expect(source.flowByDate['2026-05-28']).toBeDefined()
    expect(Object.keys(source.flowByDate).filter((date: string) : boolean => date >= source.forecastStartDate)).toEqual(['2026-05-29', '2026-05-30', '2026-05-31'])
    expect(source.dateEnd).toBe('2026-05-31')
  })

  it('returns secondary daily trend source that rebuilds visible stock bars', async () : Promise<void> => {
    const source: SecondaryDailyTrendSource = await mockDashboardApi.getSecondaryDailyTrend({
      skuGroupKey: skuGroupKey('B'),
      startDate: '2026-04-01',
      endDate: '2026-05-28',
      forecastDays: 0,
      base: MOCK_BASE_SUBJECT,
      comparison: mockCompetitorTarget('kream'),
    })
    const points: SecondaryDailyTrendPoint[] = buildSecondaryDailyTrendPoints(source)

    expect(source.baseStockAtStart).not.toBeNull()
    expect(points.some((point: SecondaryDailyTrendPoint) : boolean => (point.stockBar ?? 0) > 0)).toBe(true)
  })

  it('applies selected channel to product monthly competitor trend', async () : Promise<void> => {
    const params: { startDate: string; endDate: string; forecastMonths: number; base: ProductComparisonBaseSubjectRef; } = {
      startDate: '2025-01-01',
      endDate: '2025-12-31',
      forecastMonths: 8,
      base: MOCK_BASE_SUBJECT,
    }
    const kream: ProductMonthlyTrend = await mockDashboardApi.getProductMonthlyTrend(skuGroupKey('B'), {
      ...params,
      comparison: mockCompetitorTarget('kream'),
    })
    const musinsa: ProductMonthlyTrend = await mockDashboardApi.getProductMonthlyTrend(skuGroupKey('B'), {
      ...params,
      comparison: mockCompetitorTarget('musinsa'),
    })

    const sumCompetitorSales: (rows: ProductMonthlyTrendPoint[]) => number = (rows: typeof kream.points) : number =>
      rows.reduce((sum: number, row: ProductMonthlyTrendPoint) : number => sum + Math.max(0, row.comparisonSales ?? 0), 0)

    expect(kream.points.length).toBeGreaterThan(0)
    expect(musinsa.points.length).toBe(kream.points.length)
    expect(musinsa.comparison.sourceId).toBe('musinsa')
    expect(sumCompetitorSales(musinsa.points)).toBeLessThan(sumCompetitorSales(kream.points))
  })

  it('keeps test top monthly and size sales quantities easy to verify', async () : Promise<void> => {
    const params: { startDate: string; endDate: string; forecastMonths: number; base: ProductComparisonBaseSubjectRef; } = {
      startDate: '2025-01-01',
      endDate: '2025-12-31',
      forecastMonths: 8,
      base: MOCK_BASE_SUBJECT,
    }
    const trend: ProductMonthlyTrend = await mockDashboardApi.getProductMonthlyTrend(skuGroupKey('TEST_TOP'), {
      ...params,
      comparison: mockCompetitorTarget('kream'),
    })
    const stockOrder: SecondaryStockOrderCalcResult = await mockDashboardApi.getSecondaryStockOrderCalc({
      skuGroupKey: skuGroupKey('TEST_TOP'),
      productIdentity: { productUuid: null, skuGroupKey: skuGroupKey('TEST_TOP'), brand: 'Test', code: 'TEST-TOP', colorCode: 'BLK' },
      comparison: mockCompetitorTarget('kream'),
      periodStart: '2025-01-01',
      periodEnd: '2025-12-31',
      calculationBaseDate: '2026-01-01',
      currentOrderInboundDueDate: '2026-05-01',
      nextOrderInboundDueDate: '2026-05-31',
      forecastPeriodEndMonth: '2026-05',
      orderCoverageDays: 30,
      selfWeightPct: 50,
      base: MOCK_BASE_SUBJECT,
    })

    const actualPoints: ProductMonthlyTrendPoint[] = trend.points.filter((point: ProductMonthlyTrendPoint) : boolean => !point.isForecast)
    expect(actualPoints.every((point: ProductMonthlyTrendPoint) : boolean => point.baseSales === 100)).toBe(true)
    expect(actualPoints.every((point: ProductMonthlyTrendPoint) : boolean => point.comparisonSales === 200)).toBe(true)
    expect(stockOrder.display.sizeRows.map((row: SecondaryStockOrderDisplaySizeRow) : number => row.currentStockQty)).toEqual([120, 120, 120, 120, 120])
    expect(stockOrder.display.sizeRows.map((row: SecondaryStockOrderDisplaySizeRow) : number => row.totalOrderBalance)).toEqual([40, 40, 40, 40, 40])
    expect(stockOrder.display.sizeRows.map((row: SecondaryStockOrderDisplaySizeRow) : number => row.expectedInboundOrderBalance)).toEqual([20, 20, 20, 20, 20])
  })

  it('returns secondary drawer AI comment for the requested open context', async () : Promise<void> => {
    const result: { prompt: string; answer: string; generatedAt: string; } = await mockDashboardApi.getSecondaryAiComment({
      skuGroupKey: skuGroupKey('B'),
      periodStart: '2025-01-01',
      periodEnd: '2025-12-31',
      forecastMonths: 8,
      base: MOCK_BASE_SUBJECT,
      comparison: mockCompetitorTarget('kream'),
      candidateItemUuid: 'candidate-item-test',
    })

    expect(result.prompt).toContain('2025-01-01~2025-12-31')
    expect(result.prompt).toContain('candidate-item-test')
    expect(result.answer).toContain('크림')
    expect(result.generatedAt).not.toBe('')
  })
})
