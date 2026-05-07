import { describe, expect, it } from 'vitest'
import { mockDashboardApi } from './dashboardApi'
import { DEFAULT_CANDIDATE_STASH_CONTEXT } from './records'

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

    expect(musinsaRow?.competitorAvgPrice).toBe(Math.max(1, Math.round((baseRow?.competitorAvgPrice ?? 0) * 1.02)))
    expect(musinsaRow?.competitorQty).toBe(Math.max(1, Math.round((baseRow?.competitorQty ?? 0) * 0.88)))
    expect(musinsaRow?.competitorAmount).toBe(
      Math.max(1, Math.round((musinsaRow?.competitorQty ?? 0) * (musinsaRow?.competitorAvgPrice ?? 0))),
    )
  })

  it('falls back to default skew for unknown channel id', async () => {
    const base = await mockDashboardApi.getCompetitorSales()
    const unknown = await mockDashboardApi.getCompetitorSales({ competitorChannelId: 'unknown-channel' })
    expect(unknown).toEqual(base)
  })

  it('treats removed naver channel id as fallback(default skew)', async () => {
    const base = await mockDashboardApi.getCompetitorSales()
    const naver = await mockDashboardApi.getCompetitorSales({ competitorChannelId: 'naver' })
    expect(naver).toEqual(base)
  })

  it('applies selected channel to secondary daily competitor trend', async () => {
    const kream = await mockDashboardApi.getSecondaryDailyTrend({
      productId: 'B',
      startMonth: '2025-01',
      leadTimeDays: 0,
      competitorChannelId: 'kream',
    })
    const musinsa = await mockDashboardApi.getSecondaryDailyTrend({
      productId: 'B',
      startMonth: '2025-01',
      leadTimeDays: 0,
      competitorChannelId: 'musinsa',
    })

    const sumCompetitorSales = (rows: typeof kream) =>
      rows.reduce((sum, row) => sum + Math.max(0, row.competitorSales ?? 0), 0)

    expect(kream.length).toBeGreaterThan(0)
    expect(musinsa.length).toBe(kream.length)
    expect(sumCompetitorSales(musinsa)).toBeLessThan(sumCompetitorSales(kream))
  })
})

describe('api/mock dashboardApi candidate stash contract stubs', () => {
  it('returns candidate item badge names with shared badge definitions', async () => {
    const stashes = await mockDashboardApi.getCandidateStashes()
    const target = stashes.find((row) => row.itemCount > 0)
    expect(target).toBeDefined()

    const result = await mockDashboardApi.getCandidateItemsByStash(target!.uuid)
    const definitionNames = Object.keys(result.badgeDefinitions).sort()
    const itemBadgeNames = result.items.flatMap((item) => item.insight.badgeNames)

    expect(definitionNames).toEqual(['자사이익', '자사판매', '크림판매'])
    expect(itemBadgeNames.every((name) => name in result.badgeDefinitions)).toBe(true)
    expect(itemBadgeNames).not.toContain('크림 매출')
    expect(itemBadgeNames).not.toContain('자사 매출')
    expect(itemBadgeNames).not.toContain('자사 이율')
  })

  it('keeps candidate stash list read-only after mutation API calls', async () => {
    const before = await mockDashboardApi.getCandidateStashes()
    const source = before.find((row) => row.itemCount > 0)
    expect(source).toBeDefined()

    const created = await mockDashboardApi.createCandidateStash({
      productId: 'B',
      name: '프론트 임시 후보군',
      note: null,
      ...DEFAULT_CANDIDATE_STASH_CONTEXT,
    })
    await mockDashboardApi.updateCandidateStash({
      stashUuid: source!.uuid,
      name: '프론트 수정',
      note: '저장되면 안 됨',
    })
    await mockDashboardApi.duplicateCandidateStash(source!.uuid)
    await mockDashboardApi.deleteCandidateStash(source!.uuid)

    const after = await mockDashboardApi.getCandidateStashes()
    expect(after).toEqual(before)
    expect(after.some((row) => row.uuid === created.uuid)).toBe(false)
  })

  it('keeps candidate item list read-only after item mutation API calls', async () => {
    const stashes = await mockDashboardApi.getCandidateStashes()
    const source = stashes.find((row) => row.itemCount > 0)
    expect(source).toBeDefined()

    const before = await mockDashboardApi.getCandidateItemsByStash(source!.uuid)
    const item = before.items[0]
    expect(item).toBeDefined()
    const detail = await mockDashboardApi.getCandidateItemByUuid(item!.uuid)
    expect(detail).toBeDefined()

    await mockDashboardApi.deleteCandidateItem(item!.uuid)
    await mockDashboardApi.appendCandidateItem({
      stashUuid: source!.uuid,
      productId: item!.productId,
      details: detail!.details,
      isLatestLlmComment: false,
    })
    await mockDashboardApi.updateCandidateItem({
      itemUuid: item!.uuid,
      details: detail!.details,
      isLatestLlmComment: false,
    })

    const after = await mockDashboardApi.getCandidateItemsByStash(source!.uuid)
    expect(after).toEqual(before)
  })

  it('hydrates seeded candidate drawer snapshots with mock AI comments', async () => {
    const stashes = await mockDashboardApi.getCandidateStashes()
    const target = stashes.find((row) => row.itemCount > 0)
    expect(target).toBeDefined()

    const list = await mockDashboardApi.getCandidateItemsByStash(target!.uuid)
    const detail = await mockDashboardApi.getCandidateItemByUuid(list.items[0]!.uuid)

    expect(detail?.details.drawer2.llmPrompt.trim()).not.toBe('')
    expect(detail?.details.drawer2.llmAnswer.trim()).not.toBe('')
  })
})
