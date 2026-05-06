import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mockDashboardApi } from './dashboardApi'
import { CANDIDATE_ITEM_STORAGE_KEY, CANDIDATE_STASH_STORAGE_KEY } from './constants'
import { buildMockOrderSnapshotForCandidate } from './orderSnapshotForCandidate'
import type { CandidateItemRecord, CandidateStashRecord } from './records'

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
    const result = await mockDashboardApi.getCandidateItemsByStash(target!.uuid)

    expect(after.some((row) => row.uuid === target!.uuid)).toBe(false)
    expect(result.items).toEqual([])
  })

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

  it('backfills empty mock AI comments before hydrating candidate drawer snapshots', async () => {
    const now = '2026-05-06T09:00:00.000Z'
    const details = buildMockOrderSnapshotForCandidate('B')
    const staleDetails = {
      ...details,
      drawer2: {
        ...details.drawer2,
        llmPrompt: '',
        llmAnswer: '',
      },
    }
    const stash: CandidateStashRecord = {
      uuid: 'stash-ai-comment-test',
      name: 'AI 코멘트 테스트',
      note: null,
      productId: 'B',
      dbCreatedAt: now,
      dbUpdatedAt: now,
    }
    const item: CandidateItemRecord = {
      uuid: 'item-ai-comment-test',
      stashUuid: stash.uuid,
      skuUuid: 'B',
      details: staleDetails,
      isLatestLlmComment: true,
      dbCreatedAt: now,
      dbUpdatedAt: now,
    }
    localStorage.setItem(CANDIDATE_STASH_STORAGE_KEY, JSON.stringify([stash]))
    localStorage.setItem(CANDIDATE_ITEM_STORAGE_KEY, JSON.stringify([item]))

    const hydrated = await mockDashboardApi.getCandidateItemByUuid(item.uuid)
    const stored = JSON.parse(localStorage.getItem(CANDIDATE_ITEM_STORAGE_KEY) ?? '[]') as CandidateItemRecord[]

    expect(hydrated?.details.drawer2.llmPrompt.trim()).not.toBe('')
    expect(hydrated?.details.drawer2.llmAnswer.trim()).not.toBe('')
    expect(stored[0]?.details.drawer2.llmAnswer.trim()).toBe(hydrated?.details.drawer2.llmAnswer.trim())
  })
})
