import type { CandidateDetailBulkConfirmStartResult, CandidateItemDetail, CandidateItemListResult, CandidateItemSummary, CandidateStashLlmCommentJobStartResult, CandidateStashSummary } from '..'
import type { CandidateDetailBulkConfirmProgressEvent, CandidateDetailBulkConfirmStartPayload, CandidateStashLlmCommentJobParams } from '../types'
import type { CandidateJobProgressEventBase, CandidateJobSubscription } from '../types/candidate'
import type { CandidateItemRecord } from './records'
import { describe, expect, it } from 'vitest'
import { ALL_COMPANY_UUID } from '../types'
import { mockDashboardApi } from './dashboardApi'
import { MOCK_SINGLE_COMPANY_SCOPE_REQUIRED_MESSAGE, MOCK_T1_COMPANY_UUID } from './mockCompanyScope'
import { DEFAULT_CANDIDATE_STASH_CONTEXT } from './records'
import { readCandidateItemRecords } from './candidateMockStore'
import { MOCK_COMPANY_UUID, defaultCandidateItemListParams, waitForBulkConfirmCompletedEvent, waitForBulkConfirmEvent, waitForLlmCommentJobCompletedEvent, waitForLlmCommentJobEvent } from './candidateMockApiTestHelpers'

describe('api/mock candidate job contract', () : void => {
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
})
