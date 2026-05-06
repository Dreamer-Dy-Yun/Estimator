import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mockDashboardApi } from './dashboardApi'

function createMemoryStorage(): Storage {
  const store = new Map<string, string>()
  return {
    get length() {
      return store.size
    },
    clear: () => store.clear(),
    getItem: (key: string) => store.get(key) ?? null,
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    removeItem: (key: string) => {
      store.delete(key)
    },
    setItem: (key: string, value: string) => {
      store.set(key, String(value))
    },
  }
}

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

describe('api/mock dashboardApi candidate stash mutations', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', createMemoryStorage())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('updates candidate stash metadata in storage', async () => {
    const created = await mockDashboardApi.createCandidateStash({
      productId: 'B',
      name: '수정 전',
      note: 'old',
    })

    const updated = await mockDashboardApi.updateCandidateStash({
      stashUuid: created.uuid,
      name: '수정 후',
      note: 'new',
    })
    const list = await mockDashboardApi.getCandidateStashes()

    expect(updated.name).toBe('수정 후')
    expect(updated.note).toBe('new')
    expect(list.find((row) => row.uuid === created.uuid)?.name).toBe('수정 후')
  })

  it('duplicates candidate stash with its inner items', async () => {
    const before = await mockDashboardApi.getCandidateStashes()
    const source = before.find((row) => row.itemCount > 0)
    expect(source).toBeDefined()

    await mockDashboardApi.duplicateCandidateStash(source!.uuid)
    const after = await mockDashboardApi.getCandidateStashes()
    const copied = after.find((row) => row.name === `${source!.name} 복사본`)

    expect(after).toHaveLength(before.length + 1)
    expect(copied?.itemCount).toBe(source!.itemCount)
  })

  it('deletes candidate stash and cascades its inner items', async () => {
    const before = await mockDashboardApi.getCandidateStashes()
    const target = before.find((row) => row.itemCount > 0)
    expect(target).toBeDefined()

    await mockDashboardApi.deleteCandidateStash(target!.uuid)
    const after = await mockDashboardApi.getCandidateStashes()
    const items = await mockDashboardApi.getCandidateItemsByStash(target!.uuid)

    expect(after.some((row) => row.uuid === target!.uuid)).toBe(false)
    expect(items).toEqual([])
  })
})
