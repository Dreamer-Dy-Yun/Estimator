import { describe, expect, it } from 'vitest'
import { mockDashboardApi } from './dashboardApi'
import { MOCK_ADMIN_USER_UUID, MOCK_USER_UUID } from './authApi'
import { DEFAULT_CANDIDATE_STASH_CONTEXT } from './records'
import { buildCandidateOrderMetric } from './candidateItemSummaryBuilder'
import { skuGroupKeyByLegacyId } from './salesTables'

const defaultCandidateItemListParams = (stashUuid: string) => ({
  stashUuid,
  dataReferencePeriodStart: DEFAULT_CANDIDATE_STASH_CONTEXT.periodStart,
  dataReferencePeriodEnd: DEFAULT_CANDIDATE_STASH_CONTEXT.periodEnd,
})

describe('api/mock candidate stash contract stubs', () => {
  it('filters candidate stashes by authenticated owner uuid', async () => {
    const all = await mockDashboardApi.getCandidateStashes()
    const adminOwned = await mockDashboardApi.getCandidateStashes(MOCK_ADMIN_USER_UUID)
    const userOwned = await mockDashboardApi.getCandidateStashes(MOCK_USER_UUID)

    expect(all.length).toBe(4)
    expect(adminOwned.length).toBe(4)
    expect(userOwned.length).toBe(0)
    const adminUuids = new Set(adminOwned.map((row) => row.uuid))
    expect(userOwned.every((row) => !adminUuids.has(row.uuid))).toBe(true)
    expect(adminOwned.length + userOwned.length).toBe(all.length)
  })

  it('hides candidate items when stash belongs to another user', async () => {
    const adminOwned = await mockDashboardApi.getCandidateStashes(MOCK_ADMIN_USER_UUID)
    const target = adminOwned.find((row) => row.itemCount > 0)
    expect(target).toBeDefined()

    const visible = await mockDashboardApi.getCandidateItemsByStash(
      defaultCandidateItemListParams(target!.uuid),
      MOCK_ADMIN_USER_UUID,
    )
    const hidden = await mockDashboardApi.getCandidateItemsByStash(
      defaultCandidateItemListParams(target!.uuid),
      MOCK_USER_UUID,
    )

    expect(visible.items.length).toBeGreaterThan(0)
    expect(hidden.items).toEqual([])
  })

  it('returns base candidate item rows with period sales totals but without eager badges', async () => {
    const result = await mockDashboardApi.getCandidateItemsByStash(
      defaultCandidateItemListParams('candidatestash00000000000000000001'),
      MOCK_ADMIN_USER_UUID,
    )

    expect(result.items.length).toBeGreaterThan(0)
    expect(result.items.every((item) => item.insightStatus === 'loading')).toBe(true)
    expect(result.items.every((item) => item.insight.badges.length === 0)).toBe(true)
    expect(result.items.some((item) => typeof item.insight.selfQty === 'number')).toBe(true)
    expect(result.items.some((item) => typeof item.insight.competitorQty === 'number')).toBe(true)
  })

  it('returns candidate item badges as DB-shaped name/color/tooltip arrays', async () => {
    const stashes = await mockDashboardApi.getCandidateStashes()
    const target = stashes.find((row) => row.itemCount > 0)
    expect(target).toBeDefined()

    const result = await mockDashboardApi.getCandidateRecommendations(defaultCandidateItemListParams(target!.uuid))
    const itemBadges = result.recommendations.flatMap((item) => item.insight.badges)
    const itemBadgeNames = itemBadges.map((badge) => badge.name)

    expect(itemBadges.every((badge) => Boolean(badge.name && badge.color && badge.tooltip))).toBe(true)
    expect(itemBadgeNames).not.toContain('크림 매출')
    expect(itemBadgeNames).not.toContain('자사 매출')
    expect(itemBadgeNames).not.toContain('자사 이율')
  })

  it('returns candidate recommendations for a requested data reference period', async () => {
    const result = await mockDashboardApi.getCandidateRecommendations(
      {
        stashUuid: 'candidatestash00000000000000000001',
        dataReferencePeriodStart: '2025-01-01',
        dataReferencePeriodEnd: '2025-12-31',
      },
      MOCK_ADMIN_USER_UUID,
    )

    expect(result.recommendations.length).toBeGreaterThan(0)
    expect(
      result.recommendations.every((item) => item.insight.rankTone === 'top' || item.insight.badges.length > 0),
    ).toBe(true)
    expect(result.recommendations.some((item) => item.insight.badges.length > 0)).toBe(true)
  })

  it('does not synthesize period sales totals when one side has no source data', async () => {
    const result = await mockDashboardApi.getCandidateRecommendations(
      {
        stashUuid: 'candidatestash00000000000000000001',
        dataReferencePeriodStart: '2025-01-01',
        dataReferencePeriodEnd: '2025-12-31',
        limit: 100,
      },
      MOCK_ADMIN_USER_UUID,
    )
    const competitorOnly = result.recommendations.find((item) => item.code === 'A')

    expect(competitorOnly).toBeDefined()
    expect(competitorOnly?.insight.competitorQty).toBeGreaterThan(0)
    expect(competitorOnly?.insight.selfQty).toBeNull()
  })

  it('keeps missing self period totals visible even when mock catalog generates order metrics', () => {
    const skuGroupKey = skuGroupKeyByLegacyId.A!
    const metric = buildCandidateOrderMetric(
      {
        uuid: 'candidateitem-test-competitor-only',
        stashUuid: 'candidatestash00000000000000000001',
        skuUuid: skuGroupKey,
        skuGroupKey,
        details: null,
        isLatestLlmComment: false,
        dbCreatedAt: '2026-04-20T09:00:00.000Z',
        dbUpdatedAt: '2026-04-20T09:00:00.000Z',
      },
      {
        start: '2025-01-01',
        end: '2025-12-31',
      },
    )

    expect(metric.qty).toBeGreaterThan(0)
    expect(metric.expectedOrderAmount).toBeGreaterThan(0)
    expect(metric.orderExport.avgPrice).toBeGreaterThan(0)
    expect(metric.orderExport.avgCost).toBeGreaterThan(0)
    expect(metric.orderExport.feeRatePct).toBeGreaterThan(0)
    expect(metric.orderExport.selfQty).toBeNull()
    expect(metric.orderExport.competitorQty).toBeGreaterThan(0)
  })

  it('paginates candidate recommendations without changing badge-bearing row shape', async () => {
    const first = await mockDashboardApi.getCandidateRecommendations(
      {
        ...defaultCandidateItemListParams('candidatestash00000000000000000001'),
        limit: 1,
      },
      MOCK_ADMIN_USER_UUID,
    )
    expect(first.recommendations).toHaveLength(1)
    expect(first.recommendations[0]?.insight.badges.length).toBeGreaterThan(0)
    expect(first.nextCursor).not.toBeNull()

    const second = await mockDashboardApi.getCandidateRecommendations(
      {
        ...defaultCandidateItemListParams('candidatestash00000000000000000001'),
        limit: 1,
        cursor: first.nextCursor ?? undefined,
      },
      MOCK_ADMIN_USER_UUID,
    )
    expect(second.recommendations).toHaveLength(1)
    expect(second.recommendations[0]?.skuGroupKey).not.toBe(first.recommendations[0]?.skuGroupKey)
  })

  it('seeds mixed test top and test shoe products in the default candidate stash', async () => {
    const result = await mockDashboardApi.getCandidateItemsByStash(
      defaultCandidateItemListParams('candidatestash00000000000000000001'),
      MOCK_ADMIN_USER_UUID,
    )
    const names = result.items.map((item) => item.productName)

    expect(names).toContain('테스트 상의')
    expect(names).toContain('테스트 신발')
    expect(names.some((name) => name !== '테스트 상의' && name !== '테스트 신발')).toBe(true)
  })

  it('keeps candidate stash list read-only after mutation API calls', async () => {
    const before = await mockDashboardApi.getCandidateStashes()
    const source = before.find((row) => row.itemCount > 0)
    expect(source).toBeDefined()

    const created = await mockDashboardApi.createCandidateStash({
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

  it('mutates candidate item list through item add/delete API calls', async () => {
    const stashes = await mockDashboardApi.getCandidateStashes()
    const source = stashes.find((row) => row.itemCount > 0)
    expect(source).toBeDefined()

    const before = await mockDashboardApi.getCandidateItemsByStash(defaultCandidateItemListParams(source!.uuid))
    const item = before.items[0]
    expect(item).toBeDefined()
    const detail = await mockDashboardApi.getCandidateItemByUuid(item!.uuid)
    expect(detail).toBeDefined()
    expect(detail!.details).toBeDefined()

    await mockDashboardApi.deleteCandidateItem(item!.uuid)
    const afterDelete = await mockDashboardApi.getCandidateItemsByStash(defaultCandidateItemListParams(source!.uuid))
    expect(afterDelete.items.some((row) => row.uuid === item!.uuid)).toBe(false)

    await mockDashboardApi.appendCandidateItem({
      stashUuid: source!.uuid,
      skuGroupKey: item!.skuGroupKey,
      details: detail!.details!,
      isLatestLlmComment: false,
    })

    const after = await mockDashboardApi.getCandidateItemsByStash(defaultCandidateItemListParams(source!.uuid))
    expect(after.items).toHaveLength(before.items.length)
    expect(after.items.some((row) => row.skuUuid === item!.skuUuid)).toBe(true)
  })

  it('clears candidate detail confirmation when updating details to null', async () => {
    const stashes = await mockDashboardApi.getCandidateStashes()
    const source = stashes.find((row) => row.itemCount > 0)
    expect(source).toBeDefined()
    const before = await mockDashboardApi.getCandidateItemsByStash(defaultCandidateItemListParams(source!.uuid))
    const item = before.items.find((row) => row.isDetailConfirmed)
    expect(item).toBeDefined()
    const detail = await mockDashboardApi.getCandidateItemByUuid(item!.uuid)
    expect(detail?.details).toBeDefined()

    const cleared = await mockDashboardApi.updateCandidateItem({
      itemUuid: item!.uuid,
      details: null,
      isLatestLlmComment: false,
    })
    expect(cleared.uuid).toBe(item!.uuid)
    expect(cleared.details).toBeNull()
    expect(cleared.isDetailConfirmed).toBe(false)
    expect(cleared.isLatestLlmComment).toBe(false)
    const afterClear = await mockDashboardApi.getCandidateItemsByStash(defaultCandidateItemListParams(source!.uuid))
    expect(afterClear.items.find((row) => row.uuid === item!.uuid)?.isDetailConfirmed).toBe(false)

    const restored = await mockDashboardApi.updateCandidateItem({
      itemUuid: item!.uuid,
      details: detail!.details,
      isLatestLlmComment: detail!.isLatestLlmComment,
    })
    expect(restored.uuid).toBe(item!.uuid)
    expect(restored.details).toEqual(detail!.details)
    expect(restored.isDetailConfirmed).toBe(true)
  })

  it('hydrates seeded candidate drawer snapshots with mock AI comments', async () => {
    const stashes = await mockDashboardApi.getCandidateStashes()
    const target = stashes.find((row) => row.itemCount > 0)
    expect(target).toBeDefined()

    const list = await mockDashboardApi.getCandidateItemsByStash(defaultCandidateItemListParams(target!.uuid))
    const detail = await mockDashboardApi.getCandidateItemByUuid(list.items[0]!.uuid)

    expect(detail?.details?.drawer2.llmPrompt.trim()).not.toBe('')
    expect(detail?.details?.drawer2.llmAnswer.trim()).not.toBe('')
  })
})
