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

const MOCK_COMPANY_UUID = MOCK_HANA_COMPANY_UUID

const defaultCandidateItemListParams = (stashUuid: string) => ({
  stashUuid,
  dataReferencePeriodStart: DEFAULT_CANDIDATE_STASH_CONTEXT.periodStart,
  dataReferencePeriodEnd: DEFAULT_CANDIDATE_STASH_CONTEXT.periodEnd,
  companyUuid: MOCK_COMPANY_UUID,
})

const waitForBulkConfirmEvent = (
  jobId: string,
  companyUuid?: string,
): Promise<CandidateDetailBulkConfirmProgressEvent> => new Promise((resolve) => {
  const subscriptionRef: { current?: { close: () => void } } = {}
  subscriptionRef.current = mockDashboardApi.subscribeCandidateDetailBulkConfirm(
    jobId,
    (event) => {
      subscriptionRef.current?.close()
      resolve(event)
    },
    companyUuid == null ? undefined : { companyUuid },
  )
})

const waitForLlmCommentJobEvent = (
  jobId: string,
  companyUuid?: string,
): Promise<CandidateStashLlmCommentJobProgressEvent> => new Promise((resolve) => {
  const subscriptionRef: { current?: { close: () => void } } = {}
  subscriptionRef.current = mockDashboardApi.subscribeCandidateStashLlmCommentJob(
    jobId,
    (event) => {
      subscriptionRef.current?.close()
      resolve(event)
    },
    companyUuid == null ? undefined : { companyUuid },
  )
})

const waitForLlmCommentJobCompletedEvent = (
  jobId: string,
  companyUuid: string,
): Promise<CandidateStashLlmCommentJobProgressEvent> => new Promise((resolve) => {
  const subscription = mockDashboardApi.subscribeCandidateStashLlmCommentJob(
    jobId,
    (event) => {
      if (event.status !== 'completed') return
      subscription.close()
      resolve(event)
    },
    { companyUuid },
  )
})

describe('api/mock candidate stash contract stubs', () => {
  it('filters candidate stashes by authenticated owner uuid', async () => {
    const all = await mockDashboardApi.getCandidateStashes()
    const adminOwned = await mockDashboardApi.getCandidateStashes(
      { companyUuid: MOCK_COMPANY_UUID },
      MOCK_ADMIN_USER_UUID,
    )
    const userOwned = await mockDashboardApi.getCandidateStashes(
      { companyUuid: MOCK_COMPANY_UUID },
      MOCK_USER_UUID,
    )

    expect(all.length).toBe(4)
    expect(adminOwned.length).toBe(2)
    expect(userOwned.length).toBe(0)
    const adminUuids = new Set(adminOwned.map((row) => row.uuid))
    expect(userOwned.every((row) => !adminUuids.has(row.uuid))).toBe(true)
    expect(adminOwned.length + userOwned.length).toBe(2)
  })

  it('scopes candidate stashes and item access by company uuid', async () => {
    const hanaStashes = await mockDashboardApi.getCandidateStashes(
      { companyUuid: MOCK_HANA_COMPANY_UUID },
      MOCK_ADMIN_USER_UUID,
    )
    const t1Stashes = await mockDashboardApi.getCandidateStashes(
      { companyUuid: MOCK_T1_COMPANY_UUID },
      MOCK_ADMIN_USER_UUID,
    )
    const target = hanaStashes.find((row) => row.itemCount > 0)
    const t1StashUuids = new Set(t1Stashes.map((row) => row.uuid))

    expect(hanaStashes.length).toBeGreaterThan(0)
    expect(target).toBeDefined()
    expect(hanaStashes.some((row) => t1StashUuids.has(row.uuid))).toBe(false)
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

  it('rejects candidate item access when stash belongs to another user', async () => {
    const adminOwned = await mockDashboardApi.getCandidateStashes(
      { companyUuid: MOCK_COMPANY_UUID },
      MOCK_ADMIN_USER_UUID,
    )
    const target = adminOwned.find((row) => row.itemCount > 0)
    expect(target).toBeDefined()

    const visible = await mockDashboardApi.getCandidateItemsByStash(
      defaultCandidateItemListParams(target!.uuid),
      MOCK_ADMIN_USER_UUID,
    )
    expect(visible.items.length).toBeGreaterThan(0)
    await expect(
      mockDashboardApi.getCandidateItemsByStash(defaultCandidateItemListParams(target!.uuid), MOCK_USER_UUID),
    ).rejects.toThrow('후보군을 찾을 수 없습니다.')
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
    const stashes = await mockDashboardApi.getCandidateStashes({ companyUuid: MOCK_COMPANY_UUID })
    const target = stashes.find((row) => row.itemCount > 0)
    expect(target).toBeDefined()

    const result = await mockDashboardApi.getCandidateRecommendations(defaultCandidateItemListParams(target!.uuid))
    const itemBadges = result.recommendations.flatMap((item) => item.insight.badges)
    const itemBadgeNames = itemBadges.map((badge) => badge.name)

    expect(itemBadges.every((badge) => Boolean(badge.name && badge.color && badge.tooltip))).toBe(true)
    expect(itemBadgeNames).not.toContain('자사 매출')
    expect(itemBadgeNames).not.toContain('경쟁사 매출')
    expect(itemBadgeNames).not.toContain('자사 이익')
  })

  it('returns candidate recommendations for a requested data reference period', async () => {
    const result = await mockDashboardApi.getCandidateRecommendations(
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
        companyUuid: MOCK_COMPANY_UUID,
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

  it('allows read APIs to use all-company scope while keeping company filtering optional', async () => {
    const implicitAll = await mockDashboardApi.getCandidateStashes()
    const explicitAll = await mockDashboardApi.getCandidateStashes({ companyUuid: ALL_COMPANY_UUID })
    const blankAll = await mockDashboardApi.getCandidateStashes({ companyUuid: '   ' })

    expect(explicitAll).toEqual(implicitAll)
    expect(blankAll).toEqual(implicitAll)
    expect(implicitAll.length).toBeGreaterThan(0)
  })

  it('rejects candidate mutations without an explicit single company uuid', async () => {
    const stashes = await mockDashboardApi.getCandidateStashes({ companyUuid: MOCK_COMPANY_UUID })
    const source = stashes.find((row) => row.itemCount > 0)
    expect(source).toBeDefined()

    const items = await mockDashboardApi.getCandidateItemsByStash(defaultCandidateItemListParams(source!.uuid))
    const item = items.items[0]
    expect(item).toBeDefined()
    const mutationError = MOCK_SINGLE_COMPANY_SCOPE_REQUIRED_MESSAGE

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
    await expect(
      mockDashboardApi.uploadCandidateStashExcel(new File(['x'], 'candidate.xlsx'), {
        companyUuid: ALL_COMPANY_UUID,
      }),
    ).rejects.toThrow(mutationError)
  })

  it('creates a mock candidate stash from a valid Excel upload with explicit mock warnings', async () => {
    const uploaded = await mockDashboardApi.uploadCandidateStashExcel(new File(['mock'], 'candidate-upload.xlsx'), {
      companyUuid: MOCK_COMPANY_UUID,
    })

    expect(uploaded.stashName).toBe('candidate-upload')
    expect(uploaded.itemCount).toBeGreaterThan(0)
    expect(uploaded.warnings.some((warning) => warning.includes('실제 엑셀 내용을 파싱하지 않고'))).toBe(true)

    const stashes = await mockDashboardApi.getCandidateStashes(
      { companyUuid: MOCK_COMPANY_UUID },
      MOCK_ADMIN_USER_UUID,
    )
    const created = stashes.find((row) => row.uuid === uploaded.stashUuid)
    expect(created).toBeDefined()
    expect(created?.itemCount).toBe(uploaded.itemCount)

    const items = await mockDashboardApi.getCandidateItemsByStash(
      defaultCandidateItemListParams(uploaded.stashUuid),
      MOCK_ADMIN_USER_UUID,
    )
    expect(items.candidateItems).toHaveLength(uploaded.itemCount)
    expect(items.items.every((item) => item.isDetailConfirmed === false)).toBe(true)

    await mockDashboardApi.deleteCandidateStash(uploaded.stashUuid, { companyUuid: MOCK_COMPANY_UUID })
  })

  it('keeps Excel upload as a single-company mutation', async () => {
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

  it('requires single company scope for bulk detail confirm start and subscribe', async () => {
    const stashes = await mockDashboardApi.getCandidateStashes({ companyUuid: MOCK_COMPANY_UUID })
    const source = stashes.find((row) => row.itemCount > 0)
    expect(source).toBeDefined()

    const items = await mockDashboardApi.getCandidateItemsByStash(defaultCandidateItemListParams(source!.uuid))
    const item = items.items[0]
    expect(item).toBeDefined()

    const validPayload = {
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

    const started = await mockDashboardApi.startCandidateDetailBulkConfirm(validPayload)

    expect(() =>
      mockDashboardApi.subscribeCandidateDetailBulkConfirm(
        started.jobId,
        () => undefined,
        undefined,
      ),
    ).toThrow(MOCK_SINGLE_COMPANY_SCOPE_REQUIRED_MESSAGE)
    expect(() =>
      mockDashboardApi.subscribeCandidateDetailBulkConfirm(
        started.jobId,
        () => undefined,
        { companyUuid: ALL_COMPANY_UUID },
      ),
    ).toThrow(MOCK_SINGLE_COMPANY_SCOPE_REQUIRED_MESSAGE)
    await expect(waitForBulkConfirmEvent(started.jobId, MOCK_T1_COMPANY_UUID)).resolves.toMatchObject({
      status: 'failed',
    })
  })

  it('rejects bulk detail confirm start when requested item uuid is outside the stash', async () => {
    const stashes = await mockDashboardApi.getCandidateStashes({ companyUuid: MOCK_COMPANY_UUID })
    const source = stashes.find((row) => row.itemCount > 0)
    const other = stashes.find((row) => row.uuid !== source?.uuid && row.itemCount > 0)
    expect(source).toBeDefined()
    expect(other).toBeDefined()

    const sourceItems = await mockDashboardApi.getCandidateItemsByStash(defaultCandidateItemListParams(source!.uuid))
    const otherItems = await mockDashboardApi.getCandidateItemsByStash(defaultCandidateItemListParams(other!.uuid))
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

  it('requires single company scope for LLM comment job start and subscribe', async () => {
    const stashes = await mockDashboardApi.getCandidateStashes({ companyUuid: MOCK_COMPANY_UUID })
    const source = stashes.find((row) => row.itemCount > 0)
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

    const started = await mockDashboardApi.startCandidateStashLlmCommentJob(source!.uuid, {
      companyUuid: MOCK_COMPANY_UUID,
    })

    expect(() =>
      mockDashboardApi.subscribeCandidateStashLlmCommentJob(
        started.jobId,
        () => undefined,
        undefined,
      ),
    ).toThrow(MOCK_SINGLE_COMPANY_SCOPE_REQUIRED_MESSAGE)
    expect(() =>
      mockDashboardApi.subscribeCandidateStashLlmCommentJob(
        started.jobId,
        () => undefined,
        { companyUuid: ALL_COMPANY_UUID },
      ),
    ).toThrow(MOCK_SINGLE_COMPANY_SCOPE_REQUIRED_MESSAGE)
    await expect(waitForLlmCommentJobEvent(started.jobId, MOCK_T1_COMPANY_UUID)).resolves.toMatchObject({
      status: 'failed',
    })
  })

  it('updates candidate item latest LLM comment state when mock LLM comment job completes', async () => {
    const stashes = await mockDashboardApi.getCandidateStashes({ companyUuid: MOCK_COMPANY_UUID })
    const source = stashes.find((row) => row.itemCount > 0)
    expect(source).toBeDefined()

    const before = await mockDashboardApi.getCandidateItemsByStash(defaultCandidateItemListParams(source!.uuid))
    const confirmedItem = before.items.find((row) => row.isDetailConfirmed)
    expect(confirmedItem).toBeDefined()
    const detail = await mockDashboardApi.getCandidateItemByUuid(confirmedItem!.uuid, {
      companyUuid: MOCK_COMPANY_UUID,
    })
    expect(detail?.details).toBeDefined()
    await mockDashboardApi.updateCandidateItem({
      itemUuid: confirmedItem!.uuid,
      companyUuid: MOCK_COMPANY_UUID,
      details: detail!.details,
      isLatestLlmComment: false,
    })

    const staleList = await mockDashboardApi.getCandidateItemsByStash(defaultCandidateItemListParams(source!.uuid))
    const staleItem = staleList.items.find((row) => row.uuid === confirmedItem!.uuid && !row.isLatestLlmComment)
    expect(staleItem).toBeDefined()

    const started = await mockDashboardApi.startCandidateStashLlmCommentJob(source!.uuid, {
      companyUuid: MOCK_COMPANY_UUID,
    })
    await expect(waitForLlmCommentJobCompletedEvent(started.jobId, MOCK_COMPANY_UUID)).resolves.toMatchObject({
      status: 'completed',
    })

    const after = await mockDashboardApi.getCandidateItemsByStash(defaultCandidateItemListParams(source!.uuid))
    expect(after.items.find((row) => row.uuid === staleItem!.uuid)?.isLatestLlmComment).toBe(true)
  })

  it('requires single company scope for order metric SSE subscribe', async () => {
    const stashes = await mockDashboardApi.getCandidateStashes({ companyUuid: MOCK_COMPANY_UUID })
    const source = stashes.find((row) => row.itemCount > 0)
    expect(source).toBeDefined()

    const items = await mockDashboardApi.getCandidateItemsByStash(defaultCandidateItemListParams(source!.uuid))
    const item = items.items[0]
    expect(item).toBeDefined()

    const validParams: CandidateOrderMetricStreamParams = {
      stashUuid: source!.uuid,
      companyUuid: MOCK_COMPANY_UUID,
      requestId: 'mock-order-metric-scope-test',
      dataReferencePeriodStart: DEFAULT_CANDIDATE_STASH_CONTEXT.periodStart,
      dataReferencePeriodEnd: DEFAULT_CANDIDATE_STASH_CONTEXT.periodEnd,
      candidateItemUuids: [item!.uuid],
    }

    expect(() =>
      mockDashboardApi.subscribeCandidateOrderMetrics(
        {
          ...validParams,
          companyUuid: undefined,
        } as unknown as CandidateOrderMetricStreamParams,
        () => undefined,
        MOCK_ADMIN_USER_UUID,
      ),
    ).toThrow(MOCK_SINGLE_COMPANY_SCOPE_REQUIRED_MESSAGE)
    expect(() =>
      mockDashboardApi.subscribeCandidateOrderMetrics(
        {
          ...validParams,
          companyUuid: ALL_COMPANY_UUID,
        },
        () => undefined,
        MOCK_ADMIN_USER_UUID,
      ),
    ).toThrow(MOCK_SINGLE_COMPANY_SCOPE_REQUIRED_MESSAGE)

    const subscription = mockDashboardApi.subscribeCandidateOrderMetrics(
      validParams,
      () => undefined,
      MOCK_ADMIN_USER_UUID,
    )
    subscription.close()
  })
  it('mutates candidate stash list through stash mutation API calls', async () => {
    const before = await mockDashboardApi.getCandidateStashes({ companyUuid: MOCK_COMPANY_UUID })

    const created = await mockDashboardApi.createCandidateStash({
      name: '프론트 임시 후보군',
      note: null,
      companyUuid: MOCK_COMPANY_UUID,
      ...DEFAULT_CANDIDATE_STASH_CONTEXT,
    })
    const afterCreate = await mockDashboardApi.getCandidateStashes({ companyUuid: MOCK_COMPANY_UUID })
    expect(afterCreate.some((row) => row.uuid === created.uuid)).toBe(true)

    const updated = await mockDashboardApi.updateCandidateStash({
      stashUuid: created.uuid,
      name: '프론트 수정',
      companyUuid: MOCK_COMPANY_UUID,
      note: '저장됨',
    })
    expect(updated.name).toBe('프론트 수정')
    expect(updated.note).toBe('저장됨')

    await mockDashboardApi.duplicateCandidateStash(created.uuid, { companyUuid: MOCK_COMPANY_UUID })
    const afterDuplicate = await mockDashboardApi.getCandidateStashes({ companyUuid: MOCK_COMPANY_UUID })
    const duplicated = afterDuplicate.find((row) => row.uuid !== created.uuid && row.name === '프론트 수정 복사본')
    expect(duplicated).toBeDefined()

    await mockDashboardApi.deleteCandidateStash(created.uuid, { companyUuid: MOCK_COMPANY_UUID })
    await mockDashboardApi.deleteCandidateStash(duplicated!.uuid, { companyUuid: MOCK_COMPANY_UUID })

    const after = await mockDashboardApi.getCandidateStashes({ companyUuid: MOCK_COMPANY_UUID })
    expect(after).toEqual(before)
    expect(after.some((row) => row.uuid === created.uuid)).toBe(false)
  })

  it('mutates candidate item list through item add/delete API calls', async () => {
    const stashes = await mockDashboardApi.getCandidateStashes({ companyUuid: MOCK_COMPANY_UUID })
    const source = stashes.find((row) => row.itemCount > 0)
    expect(source).toBeDefined()

    const before = await mockDashboardApi.getCandidateItemsByStash(defaultCandidateItemListParams(source!.uuid))
    const item = before.items[0]
    expect(item).toBeDefined()
    const detail = await mockDashboardApi.getCandidateItemByUuid(item!.uuid, { companyUuid: MOCK_COMPANY_UUID })
    expect(detail).toBeDefined()
    expect(detail!.details).toBeDefined()

    await mockDashboardApi.deleteCandidateItem(item!.uuid, { companyUuid: MOCK_COMPANY_UUID })
    const afterDelete = await mockDashboardApi.getCandidateItemsByStash(defaultCandidateItemListParams(source!.uuid))
    expect(afterDelete.items.some((row) => row.uuid === item!.uuid)).toBe(false)

    await mockDashboardApi.appendCandidateItem({
      stashUuid: source!.uuid,
      skuGroupKey: item!.skuGroupKey,
      companyUuid: MOCK_COMPANY_UUID,
      details: detail!.details!,
      isLatestLlmComment: false,
    })

    const after = await mockDashboardApi.getCandidateItemsByStash(defaultCandidateItemListParams(source!.uuid))
    expect(after.items).toHaveLength(before.items.length)
    expect(after.items.some((row) => row.skuUuid === item!.skuUuid)).toBe(true)
  })

  it('clears candidate detail confirmation when updating details to null', async () => {
    const stashes = await mockDashboardApi.getCandidateStashes({ companyUuid: MOCK_COMPANY_UUID })
    const source = stashes.find((row) => row.itemCount > 0)
    expect(source).toBeDefined()
    const before = await mockDashboardApi.getCandidateItemsByStash(defaultCandidateItemListParams(source!.uuid))
    const item = before.items.find((row) => row.isDetailConfirmed)
    expect(item).toBeDefined()
    const detail = await mockDashboardApi.getCandidateItemByUuid(item!.uuid, { companyUuid: MOCK_COMPANY_UUID })
    expect(detail?.details).toBeDefined()

    const cleared = await mockDashboardApi.updateCandidateItem({
      itemUuid: item!.uuid,
      companyUuid: MOCK_COMPANY_UUID,
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
      companyUuid: MOCK_COMPANY_UUID,
      details: detail!.details,
      isLatestLlmComment: detail!.isLatestLlmComment,
    })
    expect(restored.uuid).toBe(item!.uuid)
    expect(restored.details).toEqual(detail!.details)
    expect(restored.isDetailConfirmed).toBe(true)
  })

  it('hydrates seeded candidate drawer snapshots with mock AI comments', async () => {
    const stashes = await mockDashboardApi.getCandidateStashes({ companyUuid: MOCK_COMPANY_UUID })
    const target = stashes.find((row) => row.itemCount > 0)
    expect(target).toBeDefined()

    const list = await mockDashboardApi.getCandidateItemsByStash(defaultCandidateItemListParams(target!.uuid))
    const detail = await mockDashboardApi.getCandidateItemByUuid(list.items[0]!.uuid, {
      companyUuid: MOCK_COMPANY_UUID,
    })

    expect(detail?.details?.drawer2.llmPrompt.trim()).not.toBe('')
    expect(detail?.details?.drawer2.llmAnswer.trim()).not.toBe('')
  })
})
