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
import { getMockMutationCompanyUuid } from './mockCompanyScope'
import { sleep } from './utils'

function acceptMockCompanyScope(params?: CompanyScopeParams) {
  return normalizeCompanyScopeParams(params)?.companyUuid
}

function requireMockMutationCompanyScope(params?: CompanyScopeParams) {
  return getMockMutationCompanyUuid(params)
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
    const companyUuid = acceptMockCompanyScope(params)
    await sleep(60)
    const stashes = readCandidateStashRecords()
    const items = readCandidateItemRecords()
    const owned = filterCandidateStashesForOwner(stashes, ownerUserUuid, companyUuid)
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
    const companyUuid = acceptMockCompanyScope(params)
    await sleep(60)
    if (!findCandidateStashForOwner(params.stashUuid, ownerUserUuid, companyUuid)) {
      throw new Error('후보군을 찾을 수 없습니다.')
    }
    return buildCandidateItemListResult(
      readCandidateItemRecords().filter((row) => row.stashUuid === params.stashUuid),
      buildCandidateListParamsPeriod(params),
      false,
      companyUuid,
    )
  },
  subscribeCandidateOrderMetrics: (
    params: CandidateOrderMetricStreamParams,
    listener: (event: CandidateOrderMetricEvent) => void,
    ownerUserUuid?: string,
  ): CandidateOrderMetricSubscription => {
    const companyUuid = requireMockMutationCompanyScope(params)
    return subscribeMockCandidateOrderMetrics({ ...params, companyUuid }, listener, ownerUserUuid)
  },
  startCandidateStashLlmCommentJob: async (
    stashUuid: string,
    first?: MockOwnerOrCompanyScope,
    second?: MockOwnerOrCompanyScope,
  ): Promise<CandidateStashLlmCommentJobStartResult> => {
    const { ownerUserUuid, params } = resolveMockOwnerAndCompanyScope(first, second)
    const companyUuid = requireMockMutationCompanyScope(params)
    return startMockCandidateStashLlmCommentJob(stashUuid, ownerUserUuid, companyUuid)
  },
  subscribeCandidateStashLlmCommentJob: (
    jobId: string,
    listener: (event: CandidateStashLlmCommentJobProgressEvent) => void,
    first?: MockOwnerOrCompanyScope,
    second?: MockOwnerOrCompanyScope,
  ): CandidateStashLlmCommentJobSubscription => {
    const { ownerUserUuid, params } = resolveMockOwnerAndCompanyScope(first, second)
    const companyUuid = requireMockMutationCompanyScope(params)
    return subscribeMockCandidateStashLlmCommentJob(jobId, listener, ownerUserUuid, companyUuid)
  },
  startCandidateDetailBulkConfirm: async (
    payload: CandidateDetailBulkConfirmStartPayload,
    ownerUserUuid?: string,
  ): Promise<CandidateDetailBulkConfirmStartResult> => {
    const companyUuid = requireMockMutationCompanyScope(payload)
    return startMockCandidateDetailBulkConfirm(payload, ownerUserUuid, companyUuid)
  },
  subscribeCandidateDetailBulkConfirm: (
    jobId: string,
    listener: (event: CandidateDetailBulkConfirmProgressEvent) => void,
    first?: MockOwnerOrCompanyScope,
    second?: MockOwnerOrCompanyScope,
  ): CandidateDetailBulkConfirmSubscription => {
    const { ownerUserUuid, params } = resolveMockOwnerAndCompanyScope(first, second)
    const companyUuid = requireMockMutationCompanyScope(params)
    return subscribeMockCandidateDetailBulkConfirm(jobId, listener, ownerUserUuid, companyUuid)
  },
  getCandidateRecommendations: async (
    params: CandidateRecommendationParams,
    ownerUserUuid?: string,
  ): Promise<CandidateRecommendationResult> => {
    const companyUuid = acceptMockCompanyScope(params)
    await sleep(70)
    if (!findCandidateStashForOwner(params.stashUuid, ownerUserUuid, companyUuid)) {
      throw new Error('후보군을 찾을 수 없습니다.')
    }
    return buildCandidateRecommendationResult(
      buildCandidateListParamsPeriod(params),
      params.limit,
      params.cursor,
      companyUuid,
    )
  },
  getCandidateItemByUuid: async (
    itemUuid: string,
    first?: MockOwnerOrCompanyScope,
    second?: MockOwnerOrCompanyScope,
  ): Promise<CandidateItemDetail | null> => {
    const { ownerUserUuid, params } = resolveMockOwnerAndCompanyScope(first, second)
    const companyUuid = acceptMockCompanyScope(params)
    await sleep(50)
    const row = readCandidateItemRecords().find((it) => it.uuid === itemUuid)
    if (!row) return null
    if (!findCandidateStashForOwner(row.stashUuid, ownerUserUuid, companyUuid)) return null
    return toCandidateItemDetail(row)
  },
  deleteCandidateItem: async (
    itemUuid: string,
    first?: MockOwnerOrCompanyScope,
    second?: MockOwnerOrCompanyScope,
  ): Promise<void> => {
    const { ownerUserUuid, params } = resolveMockOwnerAndCompanyScope(first, second)
    const companyUuid = acceptMockCompanyScope(params)
    await sleep(60)
    deleteCandidateItemRecord(itemUuid, ownerUserUuid, companyUuid)
  },
  deleteCandidateItems: async (
    stashUuid: string,
    itemUuids: string[],
    first?: MockOwnerOrCompanyScope,
    second?: MockOwnerOrCompanyScope,
  ): Promise<void> => {
    const { ownerUserUuid, params } = resolveMockOwnerAndCompanyScope(first, second)
    const companyUuid = acceptMockCompanyScope(params)
    await sleep(80)
    deleteCandidateItemRecords(stashUuid, itemUuids, ownerUserUuid, companyUuid)
  },
  deleteCandidateStash: async (
    stashUuid: string,
    first?: MockOwnerOrCompanyScope,
    second?: MockOwnerOrCompanyScope,
  ): Promise<void> => {
    const { ownerUserUuid, params } = resolveMockOwnerAndCompanyScope(first, second)
    const companyUuid = acceptMockCompanyScope(params)
    await sleep(60)
    deleteCandidateStashRecord(stashUuid, ownerUserUuid, companyUuid)
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
    const companyUuid = acceptMockCompanyScope(payload)
    await sleep(70)
    return updateCandidateStashSummary(payload, ownerUserUuid, companyUuid)
  },
  duplicateCandidateStash: async (
    sourceStashUuid: string,
    first?: MockOwnerOrCompanyScope,
    second?: MockOwnerOrCompanyScope,
  ): Promise<void> => {
    const { ownerUserUuid, params } = resolveMockOwnerAndCompanyScope(first, second)
    const companyUuid = acceptMockCompanyScope(params)
    await sleep(90)
    duplicateCandidateStashRecord(sourceStashUuid, ownerUserUuid, companyUuid)
  },
  appendCandidateItem: async (payload: AppendCandidateItemPayload, ownerUserUuid?: string): Promise<void> => {
    const companyUuid = acceptMockCompanyScope(payload)
    await sleep(70)
    appendCandidateItemRecord(payload, ownerUserUuid, companyUuid)
  },
  appendCandidateItems: async (
    payload: AppendCandidateItemsPayload,
    ownerUserUuid?: string,
  ): Promise<AppendCandidateItemsResponse> => {
    const companyUuid = acceptMockCompanyScope(payload)
    await sleep(70)
    return appendCandidateItemsToStash(payload, ownerUserUuid, companyUuid)
  },
  updateCandidateItem: async (
    payload: UpdateCandidateItemPayload,
    ownerUserUuid?: string,
  ): Promise<UpdateCandidateItemResponse> => {
    const companyUuid = acceptMockCompanyScope(payload)
    await sleep(70)
    return updateCandidateItemRecord(payload, ownerUserUuid, companyUuid)
  },
  uploadCandidateStashExcel: async (
    file: File,
    first?: MockOwnerOrCompanyScope,
    second?: MockOwnerOrCompanyScope,
  ): Promise<CandidateStashExcelUploadResult> => {
    const { ownerUserUuid, params } = resolveMockOwnerAndCompanyScope(first, second)
    const companyUuid = acceptMockCompanyScope(params)
    await sleep(140)
    return uploadCandidateStashExcelFile(file, ownerUserUuid, companyUuid)
  },
}
