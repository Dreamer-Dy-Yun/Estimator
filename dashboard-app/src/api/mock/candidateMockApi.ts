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
  CandidateStashExcelUploadResult,
  CandidateStashLlmCommentJobProgressEvent,
  CandidateStashLlmCommentJobStartResult,
  CandidateStashLlmCommentJobSubscription,
  CandidateStashSummary,
  CompanyScopeParams,
  CreateCandidateStashPayload,
  UpdateCandidateItemPayload,
  UpdateCandidateItemResponse,
  UpdateCandidateStashPayload,
} from '../types'
import { normalizeCompanyScopeParams } from '../types'
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
import { subscribeMockCandidateOrderMetrics } from './candidateOrderMetricStream'
import { startMockCandidateDetailBulkConfirm, subscribeMockCandidateDetailBulkConfirm } from './candidateDetailBulkConfirmStream'
import { startMockCandidateStashLlmCommentJob, subscribeMockCandidateStashLlmCommentJob } from './candidateStashLlmCommentJobStream'
import { getMockMutationCompanyUuid } from './mockCompanyScope'
import { sleep } from './utils'

type MockOwnerOrCompanyScope = string | CompanyScopeParams | undefined

function ownerScope(first?: MockOwnerOrCompanyScope, second?: MockOwnerOrCompanyScope) {
  return {
    ownerUserUuid: typeof first === 'string' ? first : typeof second === 'string' ? second : undefined,
    params: typeof first === 'object' ? first : typeof second === 'object' ? second : undefined,
  }
}

const optionalCompanyUuid = (params?: CompanyScopeParams) => normalizeCompanyScopeParams(params)?.companyUuid
const requiredCompanyUuid = (params?: CompanyScopeParams | string) => getMockMutationCompanyUuid(params)

async function later<T>(ms: number, build: () => T): Promise<T> {
  await sleep(ms)
  return build()
}

function requireReadableStash(stashUuid: string, ownerUserUuid: string | undefined, companyUuid: string | undefined) {
  const stash = findCandidateStashForOwner(stashUuid, ownerUserUuid, companyUuid)
  if (!stash) throw new Error('후보군을 찾을 수 없습니다.')
  return stash
}

export const candidateMockApi = {
  getCandidateStashes: async (first?: MockOwnerOrCompanyScope, second?: MockOwnerOrCompanyScope): Promise<CandidateStashSummary[]> => {
    const { ownerUserUuid, params } = ownerScope(first, second)
    return later(60, () => {
      const itemStatsByStash = buildCandidateItemStatsByStash(readCandidateItemRecords())
      return filterCandidateStashesForOwner(readCandidateStashRecords(), ownerUserUuid, optionalCompanyUuid(params))
        .map((row) => {
          const stats = itemStatsByStash.get(row.uuid)
          const dbUpdatedAt = stats?.latestItemTs && stats.latestItemTs > (row.dbUpdatedAt ?? row.dbCreatedAt)
            ? stats.latestItemTs
            : row.dbUpdatedAt ?? row.dbCreatedAt
          return toCandidateStashSummary(row, stats?.count ?? 0, dbUpdatedAt)
        })
        .sort((a, b) => String(b.dbCreatedAt).localeCompare(String(a.dbCreatedAt)))
    })
  },

  getCandidateItemsByStash: async (params: CandidateItemListParams, ownerUserUuid?: string): Promise<CandidateItemListResult> => later(60, () => {
    const companyUuid = optionalCompanyUuid(params)
    requireReadableStash(params.stashUuid, ownerUserUuid, companyUuid)
    return buildCandidateItemListResult(
      readCandidateItemRecords().filter((row) => row.stashUuid === params.stashUuid),
      buildCandidateListParamsPeriod(params),
      false,
      companyUuid,
    )
  }),

  getCandidateRecommendations: async (params: CandidateRecommendationParams, ownerUserUuid?: string): Promise<CandidateRecommendationResult> => later(70, () => {
    const companyUuid = optionalCompanyUuid(params)
    requireReadableStash(params.stashUuid, ownerUserUuid, companyUuid)
    return buildCandidateRecommendationResult(buildCandidateListParamsPeriod(params), params.limit, params.cursor, companyUuid)
  }),

  getCandidateItemByUuid: async (itemUuid: string, first?: MockOwnerOrCompanyScope, second?: MockOwnerOrCompanyScope): Promise<CandidateItemDetail | null> => {
    const { ownerUserUuid, params } = ownerScope(first, second)
    return later(50, () => {
      const row = readCandidateItemRecords().find((item) => item.uuid === itemUuid)
      return row && findCandidateStashForOwner(row.stashUuid, ownerUserUuid, optionalCompanyUuid(params))
        ? toCandidateItemDetail(row)
        : null
    })
  },

  subscribeCandidateOrderMetrics: (
    params: CandidateOrderMetricStreamParams,
    listener: (event: CandidateOrderMetricEvent) => void,
    ownerUserUuid?: string,
  ): CandidateOrderMetricSubscription => subscribeMockCandidateOrderMetrics({ ...params, companyUuid: requiredCompanyUuid(params) }, listener, ownerUserUuid),

  startCandidateStashLlmCommentJob: async (stashUuid: string, first?: MockOwnerOrCompanyScope, second?: MockOwnerOrCompanyScope): Promise<CandidateStashLlmCommentJobStartResult> => {
    const { ownerUserUuid, params } = ownerScope(first, second)
    return startMockCandidateStashLlmCommentJob(stashUuid, ownerUserUuid, requiredCompanyUuid(params))
  },

  subscribeCandidateStashLlmCommentJob: (
    jobId: string,
    listener: (event: CandidateStashLlmCommentJobProgressEvent) => void,
    first?: MockOwnerOrCompanyScope,
    second?: MockOwnerOrCompanyScope,
  ): CandidateStashLlmCommentJobSubscription => {
    const { ownerUserUuid, params } = ownerScope(first, second)
    return subscribeMockCandidateStashLlmCommentJob(jobId, listener, ownerUserUuid, requiredCompanyUuid(params))
  },

  startCandidateDetailBulkConfirm: async (
    payload: CandidateDetailBulkConfirmStartPayload,
    ownerUserUuid?: string,
  ): Promise<CandidateDetailBulkConfirmStartResult> => startMockCandidateDetailBulkConfirm(payload, ownerUserUuid, requiredCompanyUuid(payload)),

  subscribeCandidateDetailBulkConfirm: (
    jobId: string,
    listener: (event: CandidateDetailBulkConfirmProgressEvent) => void,
    first?: MockOwnerOrCompanyScope,
    second?: MockOwnerOrCompanyScope,
  ): CandidateDetailBulkConfirmSubscription => {
    const { ownerUserUuid, params } = ownerScope(first, second)
    return subscribeMockCandidateDetailBulkConfirm(jobId, listener, ownerUserUuid, requiredCompanyUuid(params))
  },

  deleteCandidateItem: async (itemUuid: string, first?: MockOwnerOrCompanyScope, second?: MockOwnerOrCompanyScope): Promise<void> => {
    const { ownerUserUuid, params } = ownerScope(first, second)
    await later(60, () => deleteCandidateItemRecord(itemUuid, ownerUserUuid, requiredCompanyUuid(params)))
  },
  deleteCandidateItems: async (stashUuid: string, itemUuids: string[], first?: MockOwnerOrCompanyScope, second?: MockOwnerOrCompanyScope): Promise<void> => {
    const { ownerUserUuid, params } = ownerScope(first, second)
    await later(80, () => deleteCandidateItemRecords(stashUuid, itemUuids, ownerUserUuid, requiredCompanyUuid(params)))
  },
  deleteCandidateStash: async (stashUuid: string, first?: MockOwnerOrCompanyScope, second?: MockOwnerOrCompanyScope): Promise<void> => {
    const { ownerUserUuid, params } = ownerScope(first, second)
    await later(60, () => deleteCandidateStashRecord(stashUuid, ownerUserUuid, requiredCompanyUuid(params)))
  },
  createCandidateStash: async (payload: CreateCandidateStashPayload, ownerUserUuid?: string): Promise<CandidateStashSummary> => later(90, () => createCandidateStashSummary(payload, ownerUserUuid)),
  updateCandidateStash: async (payload: UpdateCandidateStashPayload, ownerUserUuid?: string): Promise<CandidateStashSummary> => later(70, () => updateCandidateStashSummary(payload, ownerUserUuid, requiredCompanyUuid(payload))),
  duplicateCandidateStash: async (sourceStashUuid: string, first?: MockOwnerOrCompanyScope, second?: MockOwnerOrCompanyScope): Promise<void> => {
    const { ownerUserUuid, params } = ownerScope(first, second)
    await later(90, () => duplicateCandidateStashRecord(sourceStashUuid, ownerUserUuid, requiredCompanyUuid(params)))
  },
  appendCandidateItem: async (payload: AppendCandidateItemPayload, ownerUserUuid?: string): Promise<void> => later(70, () => appendCandidateItemRecord(payload, ownerUserUuid, requiredCompanyUuid(payload))),
  appendCandidateItems: async (payload: AppendCandidateItemsPayload, ownerUserUuid?: string): Promise<AppendCandidateItemsResponse> => later(70, () => appendCandidateItemsToStash(payload, ownerUserUuid, requiredCompanyUuid(payload))),
  updateCandidateItem: async (payload: UpdateCandidateItemPayload, ownerUserUuid?: string): Promise<UpdateCandidateItemResponse> => later(70, () => updateCandidateItemRecord(payload, ownerUserUuid, requiredCompanyUuid(payload))),
  uploadCandidateStashExcel: async (file: File, first?: MockOwnerOrCompanyScope, second?: MockOwnerOrCompanyScope): Promise<CandidateStashExcelUploadResult> => {
    const { ownerUserUuid, params } = ownerScope(first, second)
    return later(140, () => uploadCandidateStashExcelFile(file, ownerUserUuid, requiredCompanyUuid(params)))
  },
}
