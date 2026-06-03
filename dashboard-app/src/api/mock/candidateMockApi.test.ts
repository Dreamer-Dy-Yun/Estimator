import type { CandidateBadge, CandidateDetailBulkConfirmStartResult, CandidateItemDetail, CandidateItemListResult, CandidateItemSummary, CandidateOrderMetric, CandidateOrderMetricSubscription, CandidateRecommendationResult, CandidateReferenceItemSummary, CandidateStashExcelUploadResult, CandidateStashLlmCommentJobStartResult, CandidateStashSummary } from '..'
import type { CandidateJobProgressEventBase, CandidateJobSubscription } from '../types/candidate'
import type { CandidateItemRecord } from './records'
import { describe, expect, it } from 'vitest'
import { mockDashboardApi } from './dashboardApi'
import { ALL_COMPANY_UUID } from '../types'
import type {
  CandidateDetailBulkConfirmProgressEvent,
  CandidateDetailBulkConfirmStartPayload,
  CandidateOrderMetricStreamParams,
  CandidateStashLlmCommentJobProgressEvent,
  CandidateStashLlmCommentJobParams,
  CreateCandidateStashPayload,
} from '../types'
import { MOCK_ADMIN_USER_UUID, MOCK_USER_UUID } from './authApi'
import { DEFAULT_CANDIDATE_STASH_CONTEXT } from './records'
import { buildCandidateOrderMetric } from './candidateItemSummaryBuilder'
import {
  MOCK_HANA_COMPANY_UUID,
  MOCK_SINGLE_COMPANY_SCOPE_REQUIRED_MESSAGE,
  MOCK_T1_COMPANY_UUID,
} from './mockCompanyScope'
import { skuGroupKeyByLegacyId } from './salesTables'
import { readCandidateItemRecords } from './candidateMockStore'

const MOCK_COMPANY_UUID: '00000000-0000-4000-8000-000000000101' = MOCK_HANA_COMPANY_UUID

const defaultCandidateItemListParams: (stashUuid: string) => { stashUuid: string; dataReferencePeriodStart: '2025-01-01'; dataReferencePeriodEnd: '2025-12-31'; companyUuid: string; } = (stashUuid: string) : { stashUuid: string; dataReferencePeriodStart: '2025-01-01'; dataReferencePeriodEnd: '2025-12-31'; companyUuid: string; } => ({
  stashUuid,
  dataReferencePeriodStart: DEFAULT_CANDIDATE_STASH_CONTEXT.periodStart,
  dataReferencePeriodEnd: DEFAULT_CANDIDATE_STASH_CONTEXT.periodEnd,
  companyUuid: MOCK_COMPANY_UUID,
})

const waitForBulkConfirmEvent: (jobId: string, companyUuid?: string) => Promise<CandidateDetailBulkConfirmProgressEvent> = (
  jobId: string,
  companyUuid?: string,
): Promise<CandidateDetailBulkConfirmProgressEvent> => new Promise((resolve: (value: CandidateDetailBulkConfirmProgressEvent | PromiseLike<CandidateDetailBulkConfirmProgressEvent>) => void) : void => {
  const subscriptionRef: { current?: { close: () => void } } = {}
  subscriptionRef.current = mockDashboardApi.subscribeCandidateDetailBulkConfirm(
    jobId,
    (event: CandidateDetailBulkConfirmProgressEvent) : void => {
      subscriptionRef.current?.close()
      resolve(event)
    },
    companyUuid == null ? undefined : { companyUuid },
  )
})

const waitForBulkConfirmCompletedEvent: (jobId: string, companyUuid: string) => Promise<CandidateDetailBulkConfirmProgressEvent> = (
  jobId: string,
  companyUuid: string,
): Promise<CandidateDetailBulkConfirmProgressEvent> => new Promise((resolve: (value: CandidateDetailBulkConfirmProgressEvent | PromiseLike<CandidateDetailBulkConfirmProgressEvent>) => void) : void => {
  const subscription: CandidateJobSubscription = mockDashboardApi.subscribeCandidateDetailBulkConfirm(
    jobId,
    (event: CandidateDetailBulkConfirmProgressEvent) : void => {
      if (event.status !== 'completed') return
      subscription.close()
      resolve(event)
    },
    { companyUuid },
  )
})

const waitForLlmCommentJobEvent: (jobId: string, companyUuid?: string) => Promise<CandidateStashLlmCommentJobProgressEvent> = (
  jobId: string,
  companyUuid?: string,
): Promise<CandidateStashLlmCommentJobProgressEvent> => new Promise((resolve: (value: CandidateJobProgressEventBase | PromiseLike<CandidateJobProgressEventBase>) => void) : void => {
  const subscriptionRef: { current?: { close: () => void } } = {}
  subscriptionRef.current = mockDashboardApi.subscribeCandidateStashLlmCommentJob(
    jobId,
    (event: CandidateJobProgressEventBase) : void => {
      subscriptionRef.current?.close()
      resolve(event)
    },
    companyUuid == null ? undefined : { companyUuid },
  )
})

const waitForLlmCommentJobCompletedEvent: (jobId: string, companyUuid: string) => Promise<CandidateStashLlmCommentJobProgressEvent> = (
  jobId: string,
  companyUuid: string,
): Promise<CandidateStashLlmCommentJobProgressEvent> => new Promise((resolve: (value: CandidateJobProgressEventBase | PromiseLike<CandidateJobProgressEventBase>) => void) : void => {
  const subscription: CandidateJobSubscription = mockDashboardApi.subscribeCandidateStashLlmCommentJob(
    jobId,
    (event: CandidateJobProgressEventBase) : void => {
      if (event.status !== 'completed') return
      subscription.close()
      resolve(event)
    },
    { companyUuid },
  )
})

describe('api/mock candidate stash contract stubs', () : void => {
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

  it('returns base candidate item rows with period sales totals but without eager badges', async () : Promise<void> => {
    const result: CandidateItemListResult = await mockDashboardApi.getCandidateItemsByStash(
      defaultCandidateItemListParams('candidatestash00000000000000000001'),
      MOCK_ADMIN_USER_UUID,
    )

    expect(result.items.length).toBeGreaterThan(0)
    expect(result.items.every((item: CandidateItemSummary) : boolean => item.insightStatus === 'loading')).toBe(true)
    expect(result.items.every((item: CandidateItemSummary) : boolean => item.insight.badges.length === 0)).toBe(true)
    expect(result.items.some((item: CandidateItemSummary) : boolean => typeof item.insight.selfQty === 'number')).toBe(true)
    expect(result.items.some((item: CandidateItemSummary) : boolean => typeof item.insight.competitorQty === 'number')).toBe(true)
  })

  it('returns candidate item badges as DB-shaped name/color/tooltip arrays', async () : Promise<void> => {
    const stashes: CandidateStashSummary[] = await mockDashboardApi.getCandidateStashes({ companyUuid: MOCK_COMPANY_UUID })
    const target: CandidateStashSummary | undefined = stashes.find((row: CandidateStashSummary) : boolean => row.itemCount > 0)
    expect(target).toBeDefined()

    const result: CandidateRecommendationResult = await mockDashboardApi.getCandidateRecommendations(defaultCandidateItemListParams(target!.uuid))
    const itemBadges: CandidateBadge[] = result.recommendations.flatMap((item: CandidateReferenceItemSummary) : CandidateBadge[] => item.insight.badges)
    const itemBadgeNames: string[] = itemBadges.map((badge: CandidateBadge) : string => badge.name)

    expect(itemBadges.every((badge: CandidateBadge) : boolean => Boolean(badge.name && badge.color && badge.tooltip))).toBe(true)
    expect(itemBadgeNames).not.toContain('자사 매출')
    expect(itemBadgeNames).not.toContain('경쟁사 매출')
    expect(itemBadgeNames).not.toContain('자사 이익')
  })

  it('returns candidate recommendations for a requested data reference period', async () : Promise<void> => {
    const result: CandidateRecommendationResult = await mockDashboardApi.getCandidateRecommendations(
      {
        stashUuid: 'candidatestash00000000000000000001',
        dataReferencePeriodStart: '2025-01-01',
        dataReferencePeriodEnd: '2025-12-31',
        companyUuid: MOCK_COMPANY_UUID,
      },
      MOCK_ADMIN_USER_UUID,
    )

    expect(result.recommendations.length).toBeGreaterThan(0)
    expect(
      result.recommendations.every((item: CandidateReferenceItemSummary) : boolean => item.insight.rankTone === 'top' || item.insight.badges.length > 0),
    ).toBe(true)
    expect(result.recommendations.some((item: CandidateReferenceItemSummary) : boolean => item.insight.badges.length > 0)).toBe(true)
  })

  it('does not synthesize period sales totals when one side has no source data', async () : Promise<void> => {
    const result: CandidateRecommendationResult = await mockDashboardApi.getCandidateRecommendations(
      {
        stashUuid: 'candidatestash00000000000000000001',
        dataReferencePeriodStart: '2025-01-01',
        dataReferencePeriodEnd: '2025-12-31',
        limit: 100,
        companyUuid: MOCK_COMPANY_UUID,
      },
      MOCK_ADMIN_USER_UUID,
    )
    const competitorOnly: CandidateReferenceItemSummary | undefined = result.recommendations.find((item: CandidateReferenceItemSummary) : boolean => item.code === 'A')

    expect(competitorOnly).toBeDefined()
    expect(competitorOnly?.insight.competitorQty).toBeGreaterThan(0)
    expect(competitorOnly?.insight.selfQty).toBeNull()
  })

  it('keeps missing self period totals visible even when mock catalog generates order metrics', () : void => {
    const skuGroupKey: string = skuGroupKeyByLegacyId.A!
    const metric: CandidateOrderMetric = buildCandidateOrderMetric(
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

  it('paginates candidate recommendations without changing badge-bearing row shape', async () : Promise<void> => {
    const first: CandidateRecommendationResult = await mockDashboardApi.getCandidateRecommendations(
      {
        ...defaultCandidateItemListParams('candidatestash00000000000000000001'),
        limit: 1,
      },
      MOCK_ADMIN_USER_UUID,
    )
    expect(first.recommendations).toHaveLength(1)
    expect(first.recommendations[0]?.insight.badges.length).toBeGreaterThan(0)
    expect(first.nextCursor).not.toBeNull()

    const second: CandidateRecommendationResult = await mockDashboardApi.getCandidateRecommendations(
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

  it('seeds mixed test top and test shoe products in the default candidate stash', async () : Promise<void> => {
    const result: CandidateItemListResult = await mockDashboardApi.getCandidateItemsByStash(
      defaultCandidateItemListParams('candidatestash00000000000000000001'),
      MOCK_ADMIN_USER_UUID,
    )
    const names: string[] = result.items.map((item: CandidateItemSummary) : string => item.productName)
    expect(names).toContain('테스트 상의')
    expect(names).toContain('테스트 신발')
    expect(names.some((name: string) : boolean => name !== '테스트 상의' && name !== '테스트 신발')).toBe(true)
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
        details: null!,
        isLatestLlmComment: false,
      }),
    ).rejects.toThrow(mutationError)
    await expect(
      mockDashboardApi.updateCandidateItem({
        itemUuid: item!.uuid,
        companyUuid: ' ',
        details: null,
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

  it('creates a mock candidate stash from a valid Excel upload with explicit mock warnings', async () : Promise<void> => {
    const uploaded: CandidateStashExcelUploadResult = await mockDashboardApi.uploadCandidateStashExcel(new File(['mock'], 'candidate-upload.xlsx'), {
      companyUuid: MOCK_COMPANY_UUID,
    })

    expect(uploaded.stashName).toBe('candidate-upload')
    expect(uploaded.itemCount).toBeGreaterThan(0)
    expect(uploaded.warnings.some((warning: string) : boolean => warning.includes('실제 엑셀 내용을 파싱하지 않고'))).toBe(true)

    const stashes: CandidateStashSummary[] = await mockDashboardApi.getCandidateStashes(
      { companyUuid: MOCK_COMPANY_UUID },
      MOCK_ADMIN_USER_UUID,
    )
    const created: CandidateStashSummary | undefined = stashes.find((row: CandidateStashSummary) : boolean => row.uuid === uploaded.stashUuid)
    expect(created).toBeDefined()
    expect(created?.itemCount).toBe(uploaded.itemCount)

    const items: CandidateItemListResult = await mockDashboardApi.getCandidateItemsByStash(
      defaultCandidateItemListParams(uploaded.stashUuid),
      MOCK_ADMIN_USER_UUID,
    )
    expect(items.candidateItems).toHaveLength(uploaded.itemCount)
    expect(items.items.every((item: CandidateItemSummary) : boolean => item.isDetailConfirmed === false)).toBe(true)

    await mockDashboardApi.deleteCandidateStash(uploaded.stashUuid, { companyUuid: MOCK_COMPANY_UUID })
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

  it('requires single company scope for bulk detail confirm start and subscribe', async () : Promise<void> => {
    const stashes: CandidateStashSummary[] = await mockDashboardApi.getCandidateStashes({ companyUuid: MOCK_COMPANY_UUID })
    const source: CandidateStashSummary | undefined = stashes.find((row: CandidateStashSummary) : boolean => row.itemCount > 0)
    expect(source).toBeDefined()

    const items: CandidateItemListResult = await mockDashboardApi.getCandidateItemsByStash(defaultCandidateItemListParams(source!.uuid))
    const item: CandidateItemSummary = items.items[0]
    expect(item).toBeDefined()

    const validPayload: { stashUuid: string; itemUuids: string[]; dataReferencePeriodStart: '2025-01-01'; dataReferencePeriodEnd: '2025-12-31'; companyUuid: string; } = {
      stashUuid: source!.uuid,
      itemUuids: [item!.uuid],
      dataReferencePeriodStart: DEFAULT_CANDIDATE_STASH_CONTEXT.periodStart,
      dataReferencePeriodEnd: DEFAULT_CANDIDATE_STASH_CONTEXT.periodEnd,
      companyUuid: MOCK_COMPANY_UUID,
    }

    await expect(
      mockDashboardApi.startCandidateDetailBulkConfirm({
        stashUuid: validPayload.stashUuid,
        itemUuids: validPayload.itemUuids,
        dataReferencePeriodStart: validPayload.dataReferencePeriodStart,
        dataReferencePeriodEnd: validPayload.dataReferencePeriodEnd,
      } as unknown as CandidateDetailBulkConfirmStartPayload),
    ).rejects.toThrow(MOCK_SINGLE_COMPANY_SCOPE_REQUIRED_MESSAGE)
    await expect(
      mockDashboardApi.startCandidateDetailBulkConfirm({
        ...validPayload,
        companyUuid: ALL_COMPANY_UUID,
      }),
    ).rejects.toThrow(MOCK_SINGLE_COMPANY_SCOPE_REQUIRED_MESSAGE)
    await expect(
      mockDashboardApi.startCandidateDetailBulkConfirm({
        ...validPayload,
        companyUuid: MOCK_T1_COMPANY_UUID,
      }),
    ).rejects.toThrow('후보군을 찾을 수 없습니다.')

    const started: CandidateDetailBulkConfirmStartResult = await mockDashboardApi.startCandidateDetailBulkConfirm(validPayload)

    expect(() : CandidateJobSubscription =>
      mockDashboardApi.subscribeCandidateDetailBulkConfirm(
        started.jobId,
        () : undefined => undefined,
        undefined,
      ),
    ).toThrow(MOCK_SINGLE_COMPANY_SCOPE_REQUIRED_MESSAGE)
    expect(() : CandidateJobSubscription =>
      mockDashboardApi.subscribeCandidateDetailBulkConfirm(
        started.jobId,
        () : undefined => undefined,
        { companyUuid: ALL_COMPANY_UUID },
      ),
    ).toThrow(MOCK_SINGLE_COMPANY_SCOPE_REQUIRED_MESSAGE)
    await expect(waitForBulkConfirmEvent(started.jobId, MOCK_T1_COMPANY_UUID)).resolves.toMatchObject({
      status: 'failed',
    })
  })

  it('rejects bulk detail confirm start when requested item uuid is outside the stash', async () : Promise<void> => {
    const stashes: CandidateStashSummary[] = await mockDashboardApi.getCandidateStashes({ companyUuid: MOCK_COMPANY_UUID })
    const source: CandidateStashSummary | undefined = stashes.find((row: CandidateStashSummary) : boolean => row.itemCount > 0)
    const other: CandidateStashSummary | undefined = stashes.find((row: CandidateStashSummary) : boolean => row.uuid !== source?.uuid && row.itemCount > 0)
    expect(source).toBeDefined()
    expect(other).toBeDefined()

    const sourceItems: CandidateItemListResult = await mockDashboardApi.getCandidateItemsByStash(defaultCandidateItemListParams(source!.uuid))
    const otherItems: CandidateItemListResult = await mockDashboardApi.getCandidateItemsByStash(defaultCandidateItemListParams(other!.uuid))
    expect(sourceItems.items[0]).toBeDefined()
    expect(otherItems.items[0]).toBeDefined()

    await expect(
      mockDashboardApi.startCandidateDetailBulkConfirm({
        stashUuid: source!.uuid,
        itemUuids: [sourceItems.items[0]!.uuid, otherItems.items[0]!.uuid],
        dataReferencePeriodStart: DEFAULT_CANDIDATE_STASH_CONTEXT.periodStart,
        dataReferencePeriodEnd: DEFAULT_CANDIDATE_STASH_CONTEXT.periodEnd,
        companyUuid: MOCK_COMPANY_UUID,
      }),
    ).rejects.toThrow('후보군에 포함되지 않은 후보 아이템이 있습니다.')
  })

  it('defers SSE job mutations and refreshes latest LLM comment state in order', async () : Promise<void> => {
    const stashes: CandidateStashSummary[] = await mockDashboardApi.getCandidateStashes({ companyUuid: MOCK_COMPANY_UUID })
    const source: CandidateStashSummary | undefined = stashes.find((row: CandidateStashSummary) : boolean => row.itemCount > 0)
    expect(source).toBeDefined()

    const before: CandidateItemListResult = await mockDashboardApi.getCandidateItemsByStash(defaultCandidateItemListParams(source!.uuid))
    const confirmedItem: CandidateItemSummary | undefined = before.items.find((row: CandidateItemSummary) : boolean => row.isDetailConfirmed)
    expect(confirmedItem).toBeDefined()
    const detail: CandidateItemDetail | null = await mockDashboardApi.getCandidateItemByUuid(confirmedItem!.uuid, {
      companyUuid: MOCK_COMPANY_UUID,
    })
    expect(detail?.details).toBeDefined()
    await mockDashboardApi.updateCandidateItem({
      itemUuid: confirmedItem!.uuid,
      companyUuid: MOCK_COMPANY_UUID,
      details: detail!.details,
      isLatestLlmComment: true,
    })
    expect(
      readCandidateItemRecords().find((row: CandidateItemRecord) : boolean => row.uuid === confirmedItem!.uuid)?.isLatestLlmComment,
    ).toBe(true)

    const bulkStarted: CandidateDetailBulkConfirmStartResult = await mockDashboardApi.startCandidateDetailBulkConfirm({
      stashUuid: source!.uuid,
      itemUuids: [confirmedItem!.uuid],
      dataReferencePeriodStart: DEFAULT_CANDIDATE_STASH_CONTEXT.periodStart,
      dataReferencePeriodEnd: DEFAULT_CANDIDATE_STASH_CONTEXT.periodEnd,
      companyUuid: MOCK_COMPANY_UUID,
    })
    const bulkCompleted: Promise<CandidateDetailBulkConfirmProgressEvent> = waitForBulkConfirmCompletedEvent(bulkStarted.jobId, MOCK_COMPANY_UUID)
    expect(
      readCandidateItemRecords().find((row: CandidateItemRecord) : boolean => row.uuid === confirmedItem!.uuid)?.isLatestLlmComment,
    ).toBe(true)

    await expect(bulkCompleted).resolves.toMatchObject({ status: 'completed' })
    expect(
      readCandidateItemRecords().find((row: CandidateItemRecord) : boolean => row.uuid === confirmedItem!.uuid)?.isLatestLlmComment,
    ).toBe(false)

    const llmStarted: CandidateStashLlmCommentJobStartResult = await mockDashboardApi.startCandidateStashLlmCommentJob(source!.uuid, {
      companyUuid: MOCK_COMPANY_UUID,
    })
    const llmCompleted: Promise<CandidateJobProgressEventBase> = waitForLlmCommentJobCompletedEvent(llmStarted.jobId, MOCK_COMPANY_UUID)
    expect(
      readCandidateItemRecords().find((row: CandidateItemRecord) : boolean => row.uuid === confirmedItem!.uuid)?.isLatestLlmComment,
    ).toBe(false)

    await expect(llmCompleted).resolves.toMatchObject({ status: 'completed' })
    expect(
      readCandidateItemRecords().find((row: CandidateItemRecord) : boolean => row.uuid === confirmedItem!.uuid)?.isLatestLlmComment,
    ).toBe(true)
  })

  it('requires single company scope for LLM comment job start and subscribe', async () : Promise<void> => {
    const stashes: CandidateStashSummary[] = await mockDashboardApi.getCandidateStashes({ companyUuid: MOCK_COMPANY_UUID })
    const source: CandidateStashSummary | undefined = stashes.find((row: CandidateStashSummary) : boolean => row.itemCount > 0)
    expect(source).toBeDefined()

    await expect(
      mockDashboardApi.startCandidateStashLlmCommentJob(
        source!.uuid,
        undefined as unknown as CandidateStashLlmCommentJobParams,
      ),
    ).rejects.toThrow(MOCK_SINGLE_COMPANY_SCOPE_REQUIRED_MESSAGE)
    await expect(
      mockDashboardApi.startCandidateStashLlmCommentJob(source!.uuid, { companyUuid: ALL_COMPANY_UUID }),
    ).rejects.toThrow(MOCK_SINGLE_COMPANY_SCOPE_REQUIRED_MESSAGE)
    await expect(
      mockDashboardApi.startCandidateStashLlmCommentJob(source!.uuid, { companyUuid: MOCK_T1_COMPANY_UUID }),
    ).rejects.toThrow('후보군을 찾을 수 없습니다.')

    const started: CandidateStashLlmCommentJobStartResult = await mockDashboardApi.startCandidateStashLlmCommentJob(source!.uuid, {
      companyUuid: MOCK_COMPANY_UUID,
    })

    expect(() : CandidateJobSubscription =>
      mockDashboardApi.subscribeCandidateStashLlmCommentJob(
        started.jobId,
        () : undefined => undefined,
        undefined,
      ),
    ).toThrow(MOCK_SINGLE_COMPANY_SCOPE_REQUIRED_MESSAGE)
    expect(() : CandidateJobSubscription =>
      mockDashboardApi.subscribeCandidateStashLlmCommentJob(
        started.jobId,
        () : undefined => undefined,
        { companyUuid: ALL_COMPANY_UUID },
      ),
    ).toThrow(MOCK_SINGLE_COMPANY_SCOPE_REQUIRED_MESSAGE)
    await expect(waitForLlmCommentJobEvent(started.jobId, MOCK_T1_COMPANY_UUID)).resolves.toMatchObject({
      status: 'failed',
    })
  })

  it('updates candidate item latest LLM comment state when mock LLM comment job completes', async () : Promise<void> => {
    const stashes: CandidateStashSummary[] = await mockDashboardApi.getCandidateStashes({ companyUuid: MOCK_COMPANY_UUID })
    const source: CandidateStashSummary | undefined = stashes.find((row: CandidateStashSummary) : boolean => row.itemCount > 0)
    expect(source).toBeDefined()

    const before: CandidateItemListResult = await mockDashboardApi.getCandidateItemsByStash(defaultCandidateItemListParams(source!.uuid))
    const confirmedItem: CandidateItemSummary | undefined = before.items.find((row: CandidateItemSummary) : boolean => row.isDetailConfirmed)
    expect(confirmedItem).toBeDefined()
    const detail: CandidateItemDetail | null = await mockDashboardApi.getCandidateItemByUuid(confirmedItem!.uuid, {
      companyUuid: MOCK_COMPANY_UUID,
    })
    expect(detail?.details).toBeDefined()
    await mockDashboardApi.updateCandidateItem({
      itemUuid: confirmedItem!.uuid,
      companyUuid: MOCK_COMPANY_UUID,
      details: detail!.details,
      isLatestLlmComment: false,
    })

    const staleList: CandidateItemListResult = await mockDashboardApi.getCandidateItemsByStash(defaultCandidateItemListParams(source!.uuid))
    const staleItem: CandidateItemSummary | undefined = staleList.items.find((row: CandidateItemSummary) : boolean => row.uuid === confirmedItem!.uuid && !row.isLatestLlmComment)
    expect(staleItem).toBeDefined()

    const started: CandidateStashLlmCommentJobStartResult = await mockDashboardApi.startCandidateStashLlmCommentJob(source!.uuid, {
      companyUuid: MOCK_COMPANY_UUID,
    })
    await expect(waitForLlmCommentJobCompletedEvent(started.jobId, MOCK_COMPANY_UUID)).resolves.toMatchObject({
      status: 'completed',
    })

    const after: CandidateItemListResult = await mockDashboardApi.getCandidateItemsByStash(defaultCandidateItemListParams(source!.uuid))
    expect(after.items.find((row: CandidateItemSummary) : boolean => row.uuid === staleItem!.uuid)?.isLatestLlmComment).toBe(true)
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
    expect(detail!.details).toBeDefined()

    await mockDashboardApi.deleteCandidateItem(item!.uuid, { companyUuid: MOCK_COMPANY_UUID })
    const afterDelete: CandidateItemListResult = await mockDashboardApi.getCandidateItemsByStash(defaultCandidateItemListParams(source!.uuid))
    expect(afterDelete.items.some((row: CandidateItemSummary) : boolean => row.uuid === item!.uuid)).toBe(false)

    await mockDashboardApi.appendCandidateItem({
      stashUuid: source!.uuid,
      skuGroupKey: item!.skuGroupKey,
      companyUuid: MOCK_COMPANY_UUID,
      details: detail!.details!,
      isLatestLlmComment: false,
    })

    const after: CandidateItemListResult = await mockDashboardApi.getCandidateItemsByStash(defaultCandidateItemListParams(source!.uuid))
    expect(after.items).toHaveLength(before.items.length)
    expect(after.items.some((row: CandidateItemSummary) : boolean => row.skuUuid === item!.skuUuid)).toBe(true)
  })

  it('clears candidate detail confirmation when updating details to null', async () : Promise<void> => {
    const stashes: CandidateStashSummary[] = await mockDashboardApi.getCandidateStashes({ companyUuid: MOCK_COMPANY_UUID })
    const source: CandidateStashSummary | undefined = stashes.find((row: CandidateStashSummary) : boolean => row.itemCount > 0)
    expect(source).toBeDefined()
    const before: CandidateItemListResult = await mockDashboardApi.getCandidateItemsByStash(defaultCandidateItemListParams(source!.uuid))
    const item: CandidateItemSummary | undefined = before.items.find((row: CandidateItemSummary) : boolean => row.isDetailConfirmed)
    expect(item).toBeDefined()
    const detail: CandidateItemDetail | null = await mockDashboardApi.getCandidateItemByUuid(item!.uuid, { companyUuid: MOCK_COMPANY_UUID })
    expect(detail?.details).toBeDefined()

    const cleared: CandidateItemDetail = await mockDashboardApi.updateCandidateItem({
      itemUuid: item!.uuid,
      companyUuid: MOCK_COMPANY_UUID,
      details: null,
      isLatestLlmComment: false,
    })
    expect(cleared.uuid).toBe(item!.uuid)
    expect(cleared.details).toBeNull()
    expect(cleared.isDetailConfirmed).toBe(false)
    expect(cleared.isLatestLlmComment).toBe(false)
    const afterClear: CandidateItemListResult = await mockDashboardApi.getCandidateItemsByStash(defaultCandidateItemListParams(source!.uuid))
    expect(afterClear.items.find((row: CandidateItemSummary) : boolean => row.uuid === item!.uuid)?.isDetailConfirmed).toBe(false)

    const restored: CandidateItemDetail = await mockDashboardApi.updateCandidateItem({
      itemUuid: item!.uuid,
      companyUuid: MOCK_COMPANY_UUID,
      details: detail!.details,
      isLatestLlmComment: detail!.isLatestLlmComment,
    })
    expect(restored.uuid).toBe(item!.uuid)
    expect(restored.details).toEqual(detail!.details)
    expect(restored.isDetailConfirmed).toBe(true)
  })

  it('hydrates seeded candidate drawer snapshots with mock AI comments', async () : Promise<void> => {
    const stashes: CandidateStashSummary[] = await mockDashboardApi.getCandidateStashes({ companyUuid: MOCK_COMPANY_UUID })
    const target: CandidateStashSummary | undefined = stashes.find((row: CandidateStashSummary) : boolean => row.itemCount > 0)
    expect(target).toBeDefined()

    const list: CandidateItemListResult = await mockDashboardApi.getCandidateItemsByStash(defaultCandidateItemListParams(target!.uuid))
    const detail: CandidateItemDetail | null = await mockDashboardApi.getCandidateItemByUuid(list.items[0]!.uuid, {
      companyUuid: MOCK_COMPANY_UUID,
    })

    expect(detail?.details?.drawer2.aiComment.prompt.trim()).not.toBe('')
    expect(detail?.details?.drawer2.aiComment.answer.trim()).not.toBe('')
  })
})
