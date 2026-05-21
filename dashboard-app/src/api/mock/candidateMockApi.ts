import type {
  AppendCandidateItemPayload,
  AppendCandidateItemsPayload,
  AppendCandidateItemsResponse,
  CandidateDetailBulkConfirmProgressEvent,
  CandidateDetailBulkConfirmStartPayload,
  CandidateDetailBulkConfirmStartResult,
  CandidateDetailBulkConfirmSubscription,
  CandidateItemDetail,
  CandidateItemListParams,
  CandidateItemListResult,
  CandidateOrderMetricEvent,
  CandidateOrderMetricStreamParams,
  CandidateOrderMetricSubscription,
  CandidateRecommendationParams,
  CandidateRecommendationResult,
  CandidateStashLlmCommentJobProgressEvent,
  CandidateStashLlmCommentJobStartResult,
  CandidateStashLlmCommentJobSubscription,
  CompanyScopeParams,
  CandidateStashExcelUploadResult,
  CandidateStashSummary,
  CreateCandidateStashPayload,
  UpdateCandidateItemPayload,
  UpdateCandidateItemResponse,
  UpdateCandidateStashPayload,
} from '../types'
import { normalizeCompanyScopeParams } from '../types'
import { subscribeMockCandidateOrderMetrics } from './candidateOrderMetricStream'
import {
  startMockCandidateDetailBulkConfirm,
  subscribeMockCandidateDetailBulkConfirm,
} from './candidateDetailBulkConfirmStream'
import {
  startMockCandidateStashLlmCommentJob,
  subscribeMockCandidateStashLlmCommentJob,
} from './candidateStashLlmCommentJobStream'
import { buildCandidateItemStatsByStash, toCandidateItemDetail } from './candidateMockMappers'
import {
  buildCandidateItemListResult,
  buildCandidateListParamsPeriod,
  buildCandidateRecommendationResult,
  filterCandidateStashesForOwner,
  findCandidateStashForOwner,
  readCandidateItemRecords,
  readCandidateStashRecords,
  toCandidateStashSummary,
} from './candidateMockStore'
import {
  appendCandidateItemRecord,
  appendCandidateItemsToStash,
  createCandidateStashSummary,
  deleteCandidateItemRecord,
  deleteCandidateItemRecords,
  deleteCandidateStashRecord,
  duplicateCandidateStashRecord,
  updateCandidateItemRecord,
  updateCandidateStashSummary,
  uploadCandidateStashExcelFile,
} from './candidateMockMutations'
import { sleep } from './utils'

function acceptMockCompanyScope(params?: CompanyScopeParams) {
  void normalizeCompanyScopeParams(params)
}

type MockOwnerOrCompanyScope = string | CompanyScopeParams | undefined

function resolveMockOwnerAndCompanyScope(
  first?: MockOwnerOrCompanyScope,
  second?: MockOwnerOrCompanyScope,
) {
  if (typeof first === 'string') {
    return {
      ownerUserUuid: first,
      params: typeof second === 'object' ? second : undefined,
    }
  }
  return {
    ownerUserUuid: typeof second === 'string' ? second : undefined,
    params: typeof first === 'object' ? first : typeof second === 'object' ? second : undefined,
  }
}

export const candidateMockApi = {
  getCandidateStashes: async (
    first?: MockOwnerOrCompanyScope,
    second?: MockOwnerOrCompanyScope,
  ): Promise<CandidateStashSummary[]> => {
    const { ownerUserUuid, params } = resolveMockOwnerAndCompanyScope(first, second)
    acceptMockCompanyScope(params)
    await sleep(60)
    const stashes = readCandidateStashRecords()
    const items = readCandidateItemRecords()
    const owned = filterCandidateStashesForOwner(stashes, ownerUserUuid)
    const itemStatsByStash = buildCandidateItemStatsByStash(items)
    return owned
      .map((row) => {
        const itemStats = itemStatsByStash.get(row.uuid)
        const latestItemTs = itemStats?.latestItemTs ?? ''
        const recordUpdatedAt = row.dbUpdatedAt ?? row.dbCreatedAt
        const dbUpdatedAt = latestItemTs && latestItemTs > recordUpdatedAt ? latestItemTs : recordUpdatedAt
        return toCandidateStashSummary(row, itemStats?.count ?? 0, dbUpdatedAt)
      })
      .sort((a, b) => String(b.dbCreatedAt).localeCompare(String(a.dbCreatedAt)))
  },
  getCandidateItemsByStash: async (
    params: CandidateItemListParams,
    ownerUserUuid?: string,
  ): Promise<CandidateItemListResult> => {
    acceptMockCompanyScope(params)
    await sleep(60)
    if (!findCandidateStashForOwner(params.stashUuid, ownerUserUuid)) {
      throw new Error('후보군을 찾을 수 없습니다.')
    }
    return buildCandidateItemListResult(
      readCandidateItemRecords().filter((row) => row.stashUuid === params.stashUuid),
      buildCandidateListParamsPeriod(params),
      false,
    )
  },
  subscribeCandidateOrderMetrics: (
    params: CandidateOrderMetricStreamParams & CompanyScopeParams,
    listener: (event: CandidateOrderMetricEvent) => void,
    ownerUserUuid?: string,
  ): CandidateOrderMetricSubscription => {
    acceptMockCompanyScope(params)
    return subscribeMockCandidateOrderMetrics(params, listener, ownerUserUuid)
  },
  startCandidateStashLlmCommentJob: async (
    stashUuid: string,
    first?: MockOwnerOrCompanyScope,
    second?: MockOwnerOrCompanyScope,
  ): Promise<CandidateStashLlmCommentJobStartResult> => {
    const { ownerUserUuid, params } = resolveMockOwnerAndCompanyScope(first, second)
    acceptMockCompanyScope(params)
    return startMockCandidateStashLlmCommentJob(stashUuid, ownerUserUuid)
  },
  subscribeCandidateStashLlmCommentJob: (
    jobId: string,
    listener: (event: CandidateStashLlmCommentJobProgressEvent) => void,
    first?: MockOwnerOrCompanyScope,
    second?: MockOwnerOrCompanyScope,
  ): CandidateStashLlmCommentJobSubscription => {
    const { ownerUserUuid, params } = resolveMockOwnerAndCompanyScope(first, second)
    acceptMockCompanyScope(params)
    return subscribeMockCandidateStashLlmCommentJob(jobId, listener, ownerUserUuid)
  },
  startCandidateDetailBulkConfirm: async (
    payload: CandidateDetailBulkConfirmStartPayload,
    ownerUserUuid?: string,
  ): Promise<CandidateDetailBulkConfirmStartResult> => {
    acceptMockCompanyScope(payload)
    return startMockCandidateDetailBulkConfirm(payload, ownerUserUuid)
  },
  subscribeCandidateDetailBulkConfirm: (
    jobId: string,
    listener: (event: CandidateDetailBulkConfirmProgressEvent) => void,
    first?: MockOwnerOrCompanyScope,
    second?: MockOwnerOrCompanyScope,
  ): CandidateDetailBulkConfirmSubscription => {
    const { ownerUserUuid, params } = resolveMockOwnerAndCompanyScope(first, second)
    acceptMockCompanyScope(params)
    return subscribeMockCandidateDetailBulkConfirm(jobId, listener, ownerUserUuid)
  },
  getCandidateRecommendations: async (
    params: CandidateRecommendationParams,
    ownerUserUuid?: string,
  ): Promise<CandidateRecommendationResult> => {
    acceptMockCompanyScope(params)
    await sleep(70)
    if (!findCandidateStashForOwner(params.stashUuid, ownerUserUuid)) {
      throw new Error('후보군을 찾을 수 없습니다.')
    }
    return buildCandidateRecommendationResult(buildCandidateListParamsPeriod(params), params.limit, params.cursor)
  },
  getCandidateItemByUuid: async (
    itemUuid: string,
    first?: MockOwnerOrCompanyScope,
    second?: MockOwnerOrCompanyScope,
  ): Promise<CandidateItemDetail | null> => {
    const { ownerUserUuid, params } = resolveMockOwnerAndCompanyScope(first, second)
    acceptMockCompanyScope(params)
    await sleep(50)
    const row = readCandidateItemRecords().find((it) => it.uuid === itemUuid)
    if (!row) return null
    if (!findCandidateStashForOwner(row.stashUuid, ownerUserUuid)) return null
    return toCandidateItemDetail(row)
  },
  deleteCandidateItem: async (
    itemUuid: string,
    first?: MockOwnerOrCompanyScope,
    second?: MockOwnerOrCompanyScope,
  ): Promise<void> => {
    const { ownerUserUuid, params } = resolveMockOwnerAndCompanyScope(first, second)
    acceptMockCompanyScope(params)
    await sleep(60)
    deleteCandidateItemRecord(itemUuid, ownerUserUuid)
  },
  deleteCandidateItems: async (
    stashUuid: string,
    itemUuids: string[],
    first?: MockOwnerOrCompanyScope,
    second?: MockOwnerOrCompanyScope,
  ): Promise<void> => {
    const { ownerUserUuid, params } = resolveMockOwnerAndCompanyScope(first, second)
    acceptMockCompanyScope(params)
    await sleep(80)
    deleteCandidateItemRecords(stashUuid, itemUuids, ownerUserUuid)
  },
  deleteCandidateStash: async (
    stashUuid: string,
    first?: MockOwnerOrCompanyScope,
    second?: MockOwnerOrCompanyScope,
  ): Promise<void> => {
    const { ownerUserUuid, params } = resolveMockOwnerAndCompanyScope(first, second)
    acceptMockCompanyScope(params)
    await sleep(60)
    deleteCandidateStashRecord(stashUuid, ownerUserUuid)
  },
  createCandidateStash: async (
    payload: CreateCandidateStashPayload,
    ownerUserUuid?: string,
  ): Promise<CandidateStashSummary> => {
    acceptMockCompanyScope(payload)
    await sleep(90)
    return createCandidateStashSummary(payload, ownerUserUuid)
  },
  updateCandidateStash: async (
    payload: UpdateCandidateStashPayload,
    ownerUserUuid?: string,
  ): Promise<CandidateStashSummary> => {
    acceptMockCompanyScope(payload)
    await sleep(70)
    return updateCandidateStashSummary(payload, ownerUserUuid)
  },
  duplicateCandidateStash: async (
    sourceStashUuid: string,
    first?: MockOwnerOrCompanyScope,
    second?: MockOwnerOrCompanyScope,
  ): Promise<void> => {
    const { ownerUserUuid, params } = resolveMockOwnerAndCompanyScope(first, second)
    acceptMockCompanyScope(params)
    await sleep(90)
    duplicateCandidateStashRecord(sourceStashUuid, ownerUserUuid)
  },
  appendCandidateItem: async (payload: AppendCandidateItemPayload, ownerUserUuid?: string): Promise<void> => {
    acceptMockCompanyScope(payload)
    await sleep(70)
    appendCandidateItemRecord(payload, ownerUserUuid)
  },
  appendCandidateItems: async (
    payload: AppendCandidateItemsPayload,
    ownerUserUuid?: string,
  ): Promise<AppendCandidateItemsResponse> => {
    acceptMockCompanyScope(payload)
    await sleep(70)
    return appendCandidateItemsToStash(payload, ownerUserUuid)
  },
  updateCandidateItem: async (
    payload: UpdateCandidateItemPayload,
    ownerUserUuid?: string,
  ): Promise<UpdateCandidateItemResponse> => {
    acceptMockCompanyScope(payload)
    await sleep(70)
    return updateCandidateItemRecord(payload, ownerUserUuid)
  },
  uploadCandidateStashExcel: async (
    file: File,
    first?: MockOwnerOrCompanyScope,
    second?: MockOwnerOrCompanyScope,
  ): Promise<CandidateStashExcelUploadResult> => {
    const { ownerUserUuid, params } = resolveMockOwnerAndCompanyScope(first, second)
    acceptMockCompanyScope(params)
    await sleep(140)
    return uploadCandidateStashExcelFile(file, ownerUserUuid)
  },
}
