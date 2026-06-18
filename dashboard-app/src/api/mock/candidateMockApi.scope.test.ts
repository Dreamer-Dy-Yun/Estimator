import type { CandidateItemListResult, CandidateItemSummary, CandidateOrderMetricSubscription, CandidateStashSummary } from '..'
import type { CandidateOrderMetricStreamParams, CreateCandidateStashPayload } from '../types'
import type { ProductComparisonComparisonSubjectRef } from '../types/drawer'
import { describe, expect, it } from 'vitest'
import { ALL_COMPANY_UUID } from '../types'
import { MOCK_ADMIN_USER_UUID, MOCK_USER_UUID } from './authApi'
import { mockDashboardApi } from './dashboardApi'
import { MOCK_HANA_COMPANY_UUID, MOCK_SINGLE_COMPANY_SCOPE_REQUIRED_MESSAGE, MOCK_T1_COMPANY_UUID } from './mockCompanyScope'
import { DEFAULT_CANDIDATE_STASH_CONTEXT } from './records'
import { MOCK_COMPANY_UUID, defaultCandidateItemListParams } from './candidateMockApiTestHelpers'

describe('api/mock candidate stash scope contract', () : void => {
  const comparison: ProductComparisonComparisonSubjectRef = {
    role: 'comparison',
    kind: 'competitor-channel',
    sourceId: 'kream',
  }

  it('filters candidate stashes by authenticated owner uuid', async () : Promise<void> => {
    const all: CandidateStashSummary[] = await mockDashboardApi.getCandidateStashes()
    const adminOwned: CandidateStashSummary[] = await mockDashboardApi.getCandidateStashes(
      { companyUuid: MOCK_COMPANY_UUID },
      MOCK_ADMIN_USER_UUID,
    )
    const userOwned: CandidateStashSummary[] = await mockDashboardApi.getCandidateStashes(
      { companyUuid: MOCK_COMPANY_UUID },
      MOCK_USER_UUID,
    )

    expect(all.length).toBe(4)
    expect(adminOwned.length).toBe(2)
    expect(userOwned.length).toBe(0)
    const adminUuids: Set<string> = new Set(adminOwned.map((row: CandidateStashSummary) : string => row.uuid))
    expect(userOwned.every((row: CandidateStashSummary) : boolean => !adminUuids.has(row.uuid))).toBe(true)
    expect(adminOwned.length + userOwned.length).toBe(2)
  })

  it('scopes candidate stashes and item access by company uuid', async () : Promise<void> => {
    const hanaStashes: CandidateStashSummary[] = await mockDashboardApi.getCandidateStashes(
      { companyUuid: MOCK_HANA_COMPANY_UUID },
      MOCK_ADMIN_USER_UUID,
    )
    const t1Stashes: CandidateStashSummary[] = await mockDashboardApi.getCandidateStashes(
      { companyUuid: MOCK_T1_COMPANY_UUID },
      MOCK_ADMIN_USER_UUID,
    )
    const target: CandidateStashSummary | undefined = hanaStashes.find((row: CandidateStashSummary) : boolean => row.itemCount > 0)
    const t1StashUuids: Set<string> = new Set(t1Stashes.map((row: CandidateStashSummary) : string => row.uuid))

    expect(hanaStashes.length).toBeGreaterThan(0)
    expect(target).toBeDefined()
    expect(hanaStashes.some((row: CandidateStashSummary) : boolean => t1StashUuids.has(row.uuid))).toBe(false)
    await expect(
      mockDashboardApi.getCandidateItemsByStash(
        {
          ...defaultCandidateItemListParams(target!.uuid),
          companyUuid: MOCK_T1_COMPANY_UUID,
        },
        MOCK_ADMIN_USER_UUID,
      ),
    ).rejects.toThrow('후보군을 찾을 수 없습니다.')
  })

  it('rejects candidate item access when stash belongs to another user', async () : Promise<void> => {
    const adminOwned: CandidateStashSummary[] = await mockDashboardApi.getCandidateStashes(
      { companyUuid: MOCK_COMPANY_UUID },
      MOCK_ADMIN_USER_UUID,
    )
    const target: CandidateStashSummary | undefined = adminOwned.find((row: CandidateStashSummary) : boolean => row.itemCount > 0)
    expect(target).toBeDefined()

    const visible: CandidateItemListResult = await mockDashboardApi.getCandidateItemsByStash(
      defaultCandidateItemListParams(target!.uuid),
      MOCK_ADMIN_USER_UUID,
    )
    expect(visible.items.length).toBeGreaterThan(0)
    await expect(
      mockDashboardApi.getCandidateItemsByStash(defaultCandidateItemListParams(target!.uuid), MOCK_USER_UUID),
    ).rejects.toThrow('후보군을 찾을 수 없습니다.')
  })

  it('allows read APIs to use all-company scope while keeping company filtering optional', async () : Promise<void> => {
    const implicitAll: CandidateStashSummary[] = await mockDashboardApi.getCandidateStashes()
    const explicitAll: CandidateStashSummary[] = await mockDashboardApi.getCandidateStashes({ companyUuid: ALL_COMPANY_UUID })
    const blankAll: CandidateStashSummary[] = await mockDashboardApi.getCandidateStashes({ companyUuid: '   ' })

    expect(explicitAll).toEqual(implicitAll)
    expect(blankAll).toEqual(implicitAll)
    expect(implicitAll.length).toBeGreaterThan(0)
  })

  it('rejects candidate mutations without an explicit single company uuid', async () : Promise<void> => {
    const stashes: CandidateStashSummary[] = await mockDashboardApi.getCandidateStashes({ companyUuid: MOCK_COMPANY_UUID })
    const source: CandidateStashSummary | undefined = stashes.find((row: CandidateStashSummary) : boolean => row.itemCount > 0)
    expect(source).toBeDefined()

    const items: CandidateItemListResult = await mockDashboardApi.getCandidateItemsByStash(defaultCandidateItemListParams(source!.uuid))
    const item: CandidateItemSummary = items.items[0]
    expect(item).toBeDefined()
    const mutationError: 'Mock mutation requires an explicit single companyUuid.' = MOCK_SINGLE_COMPANY_SCOPE_REQUIRED_MESSAGE

    await expect(
      mockDashboardApi.createCandidateStash({
        name: '전체 scope 후보군',
        note: null,
        ...DEFAULT_CANDIDATE_STASH_CONTEXT,
      } as unknown as CreateCandidateStashPayload),
    ).rejects.toThrow(mutationError)
    await expect(
      mockDashboardApi.updateCandidateStash({
        stashUuid: source!.uuid,
        name: '전체 scope 수정',
        companyUuid: ALL_COMPANY_UUID,
        note: null,
      }),
    ).rejects.toThrow(mutationError)
    await expect(mockDashboardApi.duplicateCandidateStash(source!.uuid, { companyUuid: ' ' })).rejects.toThrow(
      mutationError,
    )
    await expect(mockDashboardApi.deleteCandidateStash(source!.uuid, { companyUuid: ALL_COMPANY_UUID })).rejects.toThrow(
      mutationError,
    )
    await expect(
      mockDashboardApi.appendCandidateItem({
        stashUuid: source!.uuid,
        skuGroupKey: item!.skuGroupKey,
        companyUuid: ALL_COMPANY_UUID,
        confirmedOrderSnapshot: null!,
        isLatestLlmComment: false,
      }),
    ).rejects.toThrow(mutationError)
    await expect(
      mockDashboardApi.updateCandidateItem({
        itemUuid: item!.uuid,
        companyUuid: ' ',
        confirmedOrderSnapshot: null,
        isLatestLlmComment: false,
      }),
    ).rejects.toThrow(mutationError)
    await expect(mockDashboardApi.deleteCandidateItem(item!.uuid, { companyUuid: ALL_COMPANY_UUID })).rejects.toThrow(
      mutationError,
    )
    await expect(mockDashboardApi.deleteCandidateItems(source!.uuid, [item!.uuid])).rejects.toThrow(mutationError)
    await expect(
      mockDashboardApi.appendCandidateItems({
        stashUuid: source!.uuid,
        skuGroupKeys: [item!.skuGroupKey],
        companyUuid: ' ',
      }),
    ).rejects.toThrow(mutationError)
    await expect(
      mockDashboardApi.uploadCandidateStashExcel(new File(['x'], 'candidate.xlsx'), {
        companyUuid: ALL_COMPANY_UUID,
      }),
    ).rejects.toThrow(mutationError)
  })

  it('keeps Excel upload as a single-company mutation', async () : Promise<void> => {
    await expect(
      mockDashboardApi.uploadCandidateStashExcel(new File(['mock'], 'candidate-upload.xlsx')),
    ).rejects.toThrow(MOCK_SINGLE_COMPANY_SCOPE_REQUIRED_MESSAGE)
    await expect(
      mockDashboardApi.uploadCandidateStashExcel(new File(['mock'], 'candidate-upload.xlsx'), {
        companyUuid: ' ',
      }),
    ).rejects.toThrow(MOCK_SINGLE_COMPANY_SCOPE_REQUIRED_MESSAGE)
    await expect(
      mockDashboardApi.uploadCandidateStashExcel(new File(['mock'], 'candidate-upload.xlsx'), {
        companyUuid: ALL_COMPANY_UUID,
      }),
    ).rejects.toThrow(MOCK_SINGLE_COMPANY_SCOPE_REQUIRED_MESSAGE)
  })

  it('requires single company scope for order metric SSE subscribe', async () : Promise<void> => {
    const stashes: CandidateStashSummary[] = await mockDashboardApi.getCandidateStashes({ companyUuid: MOCK_COMPANY_UUID })
    const source: CandidateStashSummary | undefined = stashes.find((row: CandidateStashSummary) : boolean => row.itemCount > 0)
    expect(source).toBeDefined()

    const items: CandidateItemListResult = await mockDashboardApi.getCandidateItemsByStash(defaultCandidateItemListParams(source!.uuid))
    const item: CandidateItemSummary = items.items[0]
    expect(item).toBeDefined()

    const validParams: CandidateOrderMetricStreamParams = {
      stashUuid: source!.uuid,
      companyUuid: MOCK_COMPANY_UUID,
      requestId: 'mock-order-metric-scope-test',
      dataReferencePeriodStart: DEFAULT_CANDIDATE_STASH_CONTEXT.periodStart,
      dataReferencePeriodEnd: DEFAULT_CANDIDATE_STASH_CONTEXT.periodEnd,
      candidateItemUuids: [item!.uuid],
      comparison,
    }

    expect(() : CandidateOrderMetricSubscription =>
      mockDashboardApi.subscribeCandidateOrderMetrics(
        {
          ...validParams,
          companyUuid: undefined,
        } as unknown as CandidateOrderMetricStreamParams,
        () : undefined => undefined,
        MOCK_ADMIN_USER_UUID,
      ),
    ).toThrow(MOCK_SINGLE_COMPANY_SCOPE_REQUIRED_MESSAGE)
    expect(() : CandidateOrderMetricSubscription =>
      mockDashboardApi.subscribeCandidateOrderMetrics(
        {
          ...validParams,
          companyUuid: ALL_COMPANY_UUID,
        },
        () : undefined => undefined,
        MOCK_ADMIN_USER_UUID,
      ),
    ).toThrow(MOCK_SINGLE_COMPANY_SCOPE_REQUIRED_MESSAGE)

    const subscription: CandidateOrderMetricSubscription = mockDashboardApi.subscribeCandidateOrderMetrics(
      validParams,
      () : undefined => undefined,
      MOCK_ADMIN_USER_UUID,
    )
    subscription.close()
  })
})
