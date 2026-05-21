import { describe, expect, it } from 'vitest'
import { mockDashboardApi } from './dashboardApi'
import { MOCK_HANA_COMPANY_UUID, MOCK_T1_COMPANY_UUID } from './mockCompanyScope'
import { skuGroupKeyByLegacyId } from './salesTables'

const skuGroupKey = (legacyId: string) => skuGroupKeyByLegacyId[legacyId] ?? legacyId
const MOCK_COMPANY_UUID = MOCK_HANA_COMPANY_UUID

describe('api/mock dashboardApi competitor channel behavior', () => {
  it('returns only kream/musinsa competitor channels', async () => {
    const channels = await mockDashboardApi.getSecondaryCompetitorChannels()
    expect(channels.map((c) => c.id)).toEqual(['kream', 'musinsa'])
    expect(channels.some((c) => c.id === 'naver')).toBe(false)
  })

  it('applies musinsa skew to competitor sales rows', async () => {
    const base = await mockDashboardApi.getCompetitorSales({
      competitorChannelId: 'kream',
      companyUuid: MOCK_COMPANY_UUID,
    })
    const musinsa = await mockDashboardApi.getCompetitorSales({
      competitorChannelId: 'musinsa',
      companyUuid: MOCK_COMPANY_UUID,
    })

    expect(base.length).toBeGreaterThan(0)
    expect(musinsa.length).toBe(base.length)

    const baseRow = base.find((row) => row.id === 'B')
    if (!baseRow) throw new Error('Expected mock competitor row B')
    const musinsaRow = musinsa.find((row) => row.id === baseRow.id)

    expect(musinsaRow).toBeDefined()
    if (!musinsaRow) throw new Error('Expected mock musinsa row B')

    expect(musinsaRow?.competitorAvgPrice).toBe(Math.max(0, Math.round(baseRow.competitorAvgPrice * 1.02)))
    expect(musinsaRow?.competitorQty).toBe(Math.max(0, Math.round(baseRow.competitorQty * 0.88)))
    expect(musinsaRow?.competitorAmount).toBe(
      Math.max(0, Math.round(musinsaRow.competitorQty * musinsaRow.competitorAvgPrice)),
    )
  })

  it('aggregates all competitor channels when no channel is selected', async () => {
    const all = await mockDashboardApi.getCompetitorSales({ companyUuid: MOCK_COMPANY_UUID })
    const kream = await mockDashboardApi.getCompetitorSales({
      competitorChannelId: 'kream',
      companyUuid: MOCK_COMPANY_UUID,
    })
    const musinsa = await mockDashboardApi.getCompetitorSales({
      competitorChannelId: 'musinsa',
      companyUuid: MOCK_COMPANY_UUID,
    })

    const allRow = all.find((row) => row.id === 'B')
    const kreamRow = kream.find((row) => row.id === allRow?.id)
    const musinsaRow = musinsa.find((row) => row.id === allRow?.id)

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

  it('rejects unknown competitor channel ids instead of substituting another channel', async () => {
    await expect(
      mockDashboardApi.getCompetitorSales({
        competitorChannelId: 'unknown-channel',
        companyUuid: MOCK_COMPANY_UUID,
      }),
    )
      .rejects.toThrow('Unknown mock competitor channel')
  })

  it('rejects removed competitor channel ids instead of treating them as default', async () => {
    await expect(
      mockDashboardApi.getCompetitorSales({
        competitorChannelId: 'naver',
        companyUuid: MOCK_COMPANY_UUID,
      }),
    )
      .rejects.toThrow('Unknown mock competitor channel')
  })

  it('filters self and competitor sales by product code query', async () => {
    const self = await mockDashboardApi.getSelfSales({
      codeQuery: 'test-shoe',
      companyUuid: MOCK_COMPANY_UUID,
    })
    const competitor = await mockDashboardApi.getCompetitorSales({
      codeQuery: 'test-shoe',
      companyUuid: MOCK_COMPANY_UUID,
    })

    expect(self.map((row) => row.code)).toEqual(['TEST-SHOE'])
    expect(competitor.map((row) => row.code)).toEqual(['TEST-SHOE'])
  })

  it('applies selected company scope to sales calculations instead of ignoring companyUuid', async () => {
    const hanaSelf = await mockDashboardApi.getSelfSales({ companyUuid: MOCK_HANA_COMPANY_UUID })
    const t1Self = await mockDashboardApi.getSelfSales({ companyUuid: MOCK_T1_COMPANY_UUID })
    const allSelf = await mockDashboardApi.getSelfSales()
    const sumQty = (rows: typeof hanaSelf) => rows.reduce((sum, row) => sum + row.qty, 0)

    expect(hanaSelf.length).toBeGreaterThan(0)
    expect(t1Self.length).toBe(hanaSelf.length)
    expect(sumQty(hanaSelf)).not.toBe(sumQty(t1Self))
    expect(sumQty(allSelf)).toBeGreaterThan(sumQty(hanaSelf))
    expect(sumQty(allSelf)).toBeGreaterThan(sumQty(t1Self))
  })

  it('returns analysis sales rows in default sales quantity descending order', async () => {
    const self = await mockDashboardApi.getSelfSales({ companyUuid: MOCK_COMPANY_UUID })
    const competitor = await mockDashboardApi.getCompetitorSales({ companyUuid: MOCK_COMPANY_UUID })

    expect(self.map((row) => row.qty)).toEqual([...self.map((row) => row.qty)].sort((a, b) => b - a))
    expect(competitor.map((row) => row.competitorQty)).toEqual(
      [...competitor.map((row) => row.competitorQty)].sort((a, b) => b - a),
    )
  })

  it('returns product code suggestions for analysis filters', async () => {
    const meta = await mockDashboardApi.getSalesFilterMeta({ companyUuid: MOCK_COMPANY_UUID })
    expect(meta.codes).toContain('TEST-SHOE')
    expect(meta.codes).toContain('B')
  })

  it('applies selected channel to secondary daily competitor trend', async () => {
    const kream = await mockDashboardApi.getSecondaryDailyTrend({
      skuGroupKey: skuGroupKey('B'),
      startMonth: '2025-01',
      leadTimeDays: 0,
      competitorChannelId: 'kream',
      companyUuid: MOCK_COMPANY_UUID,
    })
    const musinsa = await mockDashboardApi.getSecondaryDailyTrend({
      skuGroupKey: skuGroupKey('B'),
      startMonth: '2025-01',
      leadTimeDays: 0,
      competitorChannelId: 'musinsa',
      companyUuid: MOCK_COMPANY_UUID,
    })

    const sumCompetitorSales = (rows: typeof kream) =>
      rows.reduce((sum, row) => sum + Math.max(0, row.competitorSales ?? 0), 0)

    expect(kream.length).toBeGreaterThan(0)
    expect(musinsa.length).toBe(kream.length)
    expect(sumCompetitorSales(musinsa)).toBeLessThan(sumCompetitorSales(kream))
  })

  it('applies selected channel to product monthly competitor trend', async () => {
    const params = {
      startDate: '2025-01-01',
      endDate: '2025-12-31',
      forecastMonths: 8,
      companyUuid: MOCK_COMPANY_UUID,
    }
    const kream = await mockDashboardApi.getProductMonthlyTrend(skuGroupKey('B'), {
      ...params,
      competitorChannelId: 'kream',
    })
    const musinsa = await mockDashboardApi.getProductMonthlyTrend(skuGroupKey('B'), {
      ...params,
      competitorChannelId: 'musinsa',
    })

    const sumCompetitorSales = (rows: typeof kream.points) =>
      rows.reduce((sum, row) => sum + Math.max(0, row.competitorSales ?? 0), 0)

    expect(kream.points.length).toBeGreaterThan(0)
    expect(musinsa.points.length).toBe(kream.points.length)
    expect(musinsa.competitorChannelId).toBe('musinsa')
    expect(sumCompetitorSales(musinsa.points)).toBeLessThan(sumCompetitorSales(kream.points))
  })

  it('returns secondary drawer AI comment for the requested open context', async () => {
    const result = await mockDashboardApi.getSecondaryAiComment({
      skuGroupKey: skuGroupKey('B'),
      periodStart: '2025-01-01',
      periodEnd: '2025-12-31',
      forecastMonths: 8,
      competitorChannelId: 'kream',
      candidateItemUuid: 'candidate-item-test',
      companyUuid: MOCK_COMPANY_UUID,
    })

    expect(result.llmPrompt).toContain('2025-01-01~2025-12-31')
    expect(result.llmPrompt).toContain('candidate-item-test')
    expect(result.llmAnswer).toContain('크림')
    expect(result.generatedAt).not.toBe('')
  })
})
