import type { CandidateItemDetail, CandidateItemListResult, CandidateItemSummary, CandidateStashSummary } from '..'
import { describe, expect, it } from 'vitest'
import { mockDashboardApi } from './dashboardApi'
import { DEFAULT_CANDIDATE_STASH_CONTEXT } from './records'
import { MOCK_COMPANY_UUID, defaultCandidateItemListParams } from './candidateMockApiTestHelpers'

describe('api/mock candidate mutation contract', () : void => {
  it('mutates candidate stash list through stash mutation API calls', async () : Promise<void> => {
    const before: CandidateStashSummary[] = await mockDashboardApi.getCandidateStashes({ companyUuid: MOCK_COMPANY_UUID })

    const created: CandidateStashSummary = await mockDashboardApi.createCandidateStash({
      name: '프론트 임시 후보군',
      note: null,
      companyUuid: MOCK_COMPANY_UUID,
      ...DEFAULT_CANDIDATE_STASH_CONTEXT,
    })
    const afterCreate: CandidateStashSummary[] = await mockDashboardApi.getCandidateStashes({ companyUuid: MOCK_COMPANY_UUID })
    expect(afterCreate.some((row: CandidateStashSummary) : boolean => row.uuid === created.uuid)).toBe(true)

    const updated: CandidateStashSummary = await mockDashboardApi.updateCandidateStash({
      stashUuid: created.uuid,
      name: '프론트 수정',
      companyUuid: MOCK_COMPANY_UUID,
      note: '저장됨',
    })
    expect(updated.name).toBe('프론트 수정')
    expect(updated.note).toBe('저장됨')

    await mockDashboardApi.duplicateCandidateStash(created.uuid, { companyUuid: MOCK_COMPANY_UUID })
    const afterDuplicate: CandidateStashSummary[] = await mockDashboardApi.getCandidateStashes({ companyUuid: MOCK_COMPANY_UUID })
    const duplicated: CandidateStashSummary | undefined = afterDuplicate.find((row: CandidateStashSummary) : boolean => row.uuid !== created.uuid && row.name === '프론트 수정 복사본')
    expect(duplicated).toBeDefined()

    await mockDashboardApi.deleteCandidateStash(created.uuid, { companyUuid: MOCK_COMPANY_UUID })
    await mockDashboardApi.deleteCandidateStash(duplicated!.uuid, { companyUuid: MOCK_COMPANY_UUID })

    const after: CandidateStashSummary[] = await mockDashboardApi.getCandidateStashes({ companyUuid: MOCK_COMPANY_UUID })
    expect(after).toEqual(before)
    expect(after.some((row: CandidateStashSummary) : boolean => row.uuid === created.uuid)).toBe(false)
  })

  it('mutates candidate item list through item add/delete API calls', async () : Promise<void> => {
    const stashes: CandidateStashSummary[] = await mockDashboardApi.getCandidateStashes({ companyUuid: MOCK_COMPANY_UUID })
    const source: CandidateStashSummary | undefined = stashes.find((row: CandidateStashSummary) : boolean => row.itemCount > 0)
    expect(source).toBeDefined()

    const before: CandidateItemListResult = await mockDashboardApi.getCandidateItemsByStash(defaultCandidateItemListParams(source!.uuid))
    const item: CandidateItemSummary = before.items[0]
    expect(item).toBeDefined()
    const detail: CandidateItemDetail | null = await mockDashboardApi.getCandidateItemByUuid(item!.uuid, { companyUuid: MOCK_COMPANY_UUID })
    expect(detail).toBeDefined()
    expect(detail!.confirmedOrderSnapshot).toBeDefined()

    await mockDashboardApi.deleteCandidateItem(item!.uuid, { companyUuid: MOCK_COMPANY_UUID })
    const afterDelete: CandidateItemListResult = await mockDashboardApi.getCandidateItemsByStash(defaultCandidateItemListParams(source!.uuid))
    expect(afterDelete.items.some((row: CandidateItemSummary) : boolean => row.uuid === item!.uuid)).toBe(false)

    await mockDashboardApi.appendCandidateItem({
      stashUuid: source!.uuid,
      skuGroupKey: item!.skuGroupKey,
      companyUuid: MOCK_COMPANY_UUID,
      confirmedOrderSnapshot: detail!.confirmedOrderSnapshot!,
      isLatestLlmComment: false,
    })

    const after: CandidateItemListResult = await mockDashboardApi.getCandidateItemsByStash(defaultCandidateItemListParams(source!.uuid))
    expect(after.items).toHaveLength(before.items.length)
    expect(after.items.some((row: CandidateItemSummary) : boolean => row.skuUuid === item!.skuUuid)).toBe(true)
  })

  it('clears candidate detail confirmation when updating confirmedOrderSnapshot to null', async () : Promise<void> => {
    const stashes: CandidateStashSummary[] = await mockDashboardApi.getCandidateStashes({ companyUuid: MOCK_COMPANY_UUID })
    const source: CandidateStashSummary | undefined = stashes.find((row: CandidateStashSummary) : boolean => row.itemCount > 0)
    expect(source).toBeDefined()
    const before: CandidateItemListResult = await mockDashboardApi.getCandidateItemsByStash(defaultCandidateItemListParams(source!.uuid))
    const item: CandidateItemSummary | undefined = before.items.find((row: CandidateItemSummary) : boolean => row.hasConfirmedOrderSnapshot)
    expect(item).toBeDefined()
    const detail: CandidateItemDetail | null = await mockDashboardApi.getCandidateItemByUuid(item!.uuid, { companyUuid: MOCK_COMPANY_UUID })
    expect(detail?.confirmedOrderSnapshot).toBeDefined()

    const cleared: CandidateItemDetail = await mockDashboardApi.updateCandidateItem({
      itemUuid: item!.uuid,
      companyUuid: MOCK_COMPANY_UUID,
      confirmedOrderSnapshot: null,
      isLatestLlmComment: false,
    })
    expect(cleared.uuid).toBe(item!.uuid)
    expect(cleared.confirmedOrderSnapshot).toBeNull()
    expect(cleared.hasConfirmedOrderSnapshot).toBe(false)
    expect(cleared.isLatestLlmComment).toBe(false)
    const afterClear: CandidateItemListResult = await mockDashboardApi.getCandidateItemsByStash(defaultCandidateItemListParams(source!.uuid))
    expect(afterClear.items.find((row: CandidateItemSummary) : boolean => row.uuid === item!.uuid)?.hasConfirmedOrderSnapshot).toBe(false)

    const restored: CandidateItemDetail = await mockDashboardApi.updateCandidateItem({
      itemUuid: item!.uuid,
      companyUuid: MOCK_COMPANY_UUID,
      confirmedOrderSnapshot: detail!.confirmedOrderSnapshot,
      isLatestLlmComment: detail!.isLatestLlmComment,
    })
    expect(restored.uuid).toBe(item!.uuid)
    expect(restored.confirmedOrderSnapshot).toEqual(detail!.confirmedOrderSnapshot)
    expect(restored.hasConfirmedOrderSnapshot).toBe(true)
  })

  it('hydrates seeded candidate drawer snapshots with mock AI comments', async () : Promise<void> => {
    const stashes: CandidateStashSummary[] = await mockDashboardApi.getCandidateStashes({ companyUuid: MOCK_COMPANY_UUID })
    const target: CandidateStashSummary | undefined = stashes.find((row: CandidateStashSummary) : boolean => row.itemCount > 0)
    expect(target).toBeDefined()

    const list: CandidateItemListResult = await mockDashboardApi.getCandidateItemsByStash(defaultCandidateItemListParams(target!.uuid))
    const detail: CandidateItemDetail | null = await mockDashboardApi.getCandidateItemByUuid(list.items[0]!.uuid, {
      companyUuid: MOCK_COMPANY_UUID,
    })

    expect(detail?.confirmedOrderSnapshot?.drawer2.aiComment.prompt.trim()).not.toBe('')
    expect(detail?.confirmedOrderSnapshot?.drawer2.aiComment.answer.trim()).not.toBe('')
  })
})
