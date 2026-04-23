import { describe, expect, it } from 'vitest'
import { mockDashboardApi } from './dashboardApi'

describe('api/mock dashboardApi competitor channel behavior', () => {
  it('returns only kream/musinsa competitor channels', async () => {
    const channels = await mockDashboardApi.getSecondaryCompetitorChannels()
    expect(channels.map((c) => c.id)).toEqual(['kream', 'musinsa'])
    expect(channels.some((c) => c.id === 'naver')).toBe(false)
  })

  it('applies musinsa skew to competitor sales rows', async () => {
    const base = await mockDashboardApi.getCompetitorSales()
    const musinsa = await mockDashboardApi.getCompetitorSales({ competitorChannelId: 'musinsa' })

    expect(base.length).toBeGreaterThan(0)
    expect(musinsa.length).toBe(base.length)

    const baseRow = base.find((row) => row.id === 'B') ?? base[0]
    const musinsaRow = musinsa.find((row) => row.id === baseRow?.id)

    expect(baseRow).toBeDefined()
    expect(musinsaRow).toBeDefined()

    // musinsa: priceSkew 1.02, qtySkew 0.88
    expect(musinsaRow?.competitorAvgPrice).toBe(Math.max(1, Math.round((baseRow?.competitorAvgPrice ?? 0) * 1.02)))
    expect(musinsaRow?.competitorQty).toBe(Math.max(1, Math.round((baseRow?.competitorQty ?? 0) * 0.88)))
    expect(musinsaRow?.competitorAmount).toBe(
      Math.max(1, Math.round((musinsaRow?.competitorQty ?? 0) * (musinsaRow?.competitorAvgPrice ?? 0))),
    )
  })

  it('falls back to default skew for unknown channel id', async () => {
    const base = await mockDashboardApi.getCompetitorSales()
    const unknown = await mockDashboardApi.getCompetitorSales({ competitorChannelId: 'unknown-channel' })
    const byId = (rows: Awaited<ReturnType<typeof mockDashboardApi.getCompetitorSales>>) =>
      Object.fromEntries(rows.map((row) => [row.id, row]))
    const baseById = byId(base)
    const unknownById = byId(unknown)
    expect(Object.keys(unknownById)).toEqual(Object.keys(baseById))
    for (const id of Object.keys(baseById)) {
      expect(unknownById[id]?.competitorAvgPrice).toBe(baseById[id]?.competitorAvgPrice)
      expect(unknownById[id]?.competitorQty).toBe(baseById[id]?.competitorQty)
      expect(unknownById[id]?.competitorAmount).toBe(baseById[id]?.competitorAmount)
    }
  })

  it('treats removed naver channel id as fallback(default skew)', async () => {
    const base = await mockDashboardApi.getCompetitorSales()
    const naver = await mockDashboardApi.getCompetitorSales({ competitorChannelId: 'naver' })
    expect(naver).toEqual(base)
  })
})
