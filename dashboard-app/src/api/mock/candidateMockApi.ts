import type { CandidateItemRecord, CandidateStashRecord } from './records'
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

export type MockOwnerOrCompanyScope = string | CompanyScopeParams | undefined

function ownerScope(first?: MockOwnerOrCompanyScope, second?: MockOwnerOrCompanyScope) : { ownerUserUuid: string | undefined; params: CompanyScopeParams | undefined; } {
  return {
    ownerUserUuid: typeof first === 'string' ? first : typeof second === 'string' ? second : undefined,
    params: typeof first === 'object' ? first : typeof second === 'object' ? second : undefined,
  }
}

const optionalCompanyUuid: (params?: CompanyScopeParams) => string | undefined = (params?: CompanyScopeParams) : string | undefined => normalizeCompanyScopeParams(params)?.companyUuid
const requiredCompanyUuid: (params?: CompanyScopeParams | string) => string = (params?: CompanyScopeParams | string) : string => getMockMutationCompanyUuid(params)

async function later<T>(ms: number, build: () => T): Promise<T> {
  await sleep(ms)
  return build()
}

function requireReadableStash(stashUuid: string, ownerUserUuid: string | undefined, companyUuid: string | undefined) : CandidateStashRecord {
  const stash: CandidateStashRecord | null = findCandidateStashForOwner(stashUuid, ownerUserUuid, companyUuid)
  if (!stash) throw new Error('후보군을 찾을 수 없습니다.')
  return stash
}

export const candidateMockApi: { getCandidateStashes: (first?: MockOwnerOrCompanyScope, second?: MockOwnerOrCompanyScope) => Promise<CandidateStashSummary[]>; getCandidateItemsByStash: (params: CandidateItemListParams, ownerUserUuid?: string) => Promise<CandidateItemListResult>; getCandidateRecommendations: (params: CandidateRecommendationParams, ownerUserUuid?: string) => Promise<CandidateRecommendationResult>; getCandidateItemByUuid: (itemUuid: string, first?: MockOwnerOrCompanyScope, second?: MockOwnerOrCompanyScope) => Promise<CandidateItemDetail | null>; subscribeCandidateOrderMetrics: (params: CandidateOrderMetricStreamParams, listener: (event: CandidateOrderMetricEvent) => void, ownerUserUuid?: string) => CandidateOrderMetricSubscription; startCandidateStashLlmCommentJob: (stashUuid: string, first?: MockOwnerOrCompanyScope, second?: MockOwnerOrCompanyScope) => Promise<CandidateStashLlmCommentJobStartResult>; subscribeCandidateStashLlmCommentJob: (jobId: string, listener: (event: CandidateStashLlmCommentJobProgressEvent) => void, first?: MockOwnerOrCompanyScope, second?: MockOwnerOrCompanyScope) => CandidateStashLlmCommentJobSubscription; startCandidateDetailBulkConfirm: (payload: CandidateDetailBulkConfirmStartPayload, ownerUserUuid?: string) => Promise<CandidateDetailBulkConfirmStartResult>; subscribeCandidateDetailBulkConfirm: (jobId: string, listener: (event: CandidateDetailBulkConfirmProgressEvent) => void, first?: MockOwnerOrCompanyScope, second?: MockOwnerOrCompanyScope) => CandidateDetailBulkConfirmSubscription; deleteCandidateItem: (itemUuid: string, first?: MockOwnerOrCompanyScope, second?: MockOwnerOrCompanyScope) => Promise<void>; deleteCandidateItems: (stashUuid: string, itemUuids: string[], first?: MockOwnerOrCompanyScope, second?: MockOwnerOrCompanyScope) => Promise<void>; deleteCandidateStash: (stashUuid: string, first?: MockOwnerOrCompanyScope, second?: MockOwnerOrCompanyScope) => Promise<void>; createCandidateStash: (payload: CreateCandidateStashPayload, ownerUserUuid?: string) => Promise<CandidateStashSummary>; updateCandidateStash: (payload: UpdateCandidateStashPayload, ownerUserUuid?: string) => Promise<CandidateStashSummary>; duplicateCandidateStash: (sourceStashUuid: string, first?: MockOwnerOrCompanyScope, second?: MockOwnerOrCompanyScope) => Promise<void>; appendCandidateItem: (payload: AppendCandidateItemPayload, ownerUserUuid?: string) => Promise<void>; appendCandidateItems: (payload: AppendCandidateItemsPayload, ownerUserUuid?: string) => Promise<AppendCandidateItemsResponse>; updateCandidateItem: (payload: UpdateCandidateItemPayload, ownerUserUuid?: string) => Promise<UpdateCandidateItemResponse>; uploadCandidateStashExcel: (file: File, first?: MockOwnerOrCompanyScope, second?: MockOwnerOrCompanyScope) => Promise<CandidateStashExcelUploadResult>; } = {
  getCandidateStashes: async (first?: MockOwnerOrCompanyScope, second?: MockOwnerOrCompanyScope): Promise<CandidateStashSummary[]> => {
    const { ownerUserUuid, params }: { ownerUserUuid: string | undefined; params: CompanyScopeParams | undefined; } = ownerScope(first, second)
    return later(60, () : CandidateStashSummary[] => {
      const itemStatsByStash: Map<string, { count: number; latestItemTs: string; }> = buildCandidateItemStatsByStash(readCandidateItemRecords())
      return filterCandidateStashesForOwner(readCandidateStashRecords(), ownerUserUuid, optionalCompanyUuid(params))
        .map((row: CandidateStashRecord) : CandidateStashSummary => {
          const stats: { count: number; latestItemTs: string; } | undefined = itemStatsByStash.get(row.uuid)
          const dbUpdatedAt: string = stats?.latestItemTs && stats.latestItemTs > (row.dbUpdatedAt ?? row.dbCreatedAt)
            ? stats.latestItemTs
            : row.dbUpdatedAt ?? row.dbCreatedAt
          return toCandidateStashSummary(row, stats?.count ?? 0, dbUpdatedAt)
        })
        .sort((a: CandidateStashSummary, b: CandidateStashSummary) : number => String(b.dbCreatedAt).localeCompare(String(a.dbCreatedAt)))
    })
  },

  getCandidateItemsByStash: async (params: CandidateItemListParams, ownerUserUuid?: string): Promise<CandidateItemListResult> => later(60, () : CandidateItemListResult => {
    const companyUuid: string | undefined = optionalCompanyUuid(params)
    requireReadableStash(params.stashUuid, ownerUserUuid, companyUuid)
    return buildCandidateItemListResult(
      readCandidateItemRecords().filter((row: CandidateItemRecord) : boolean => row.stashUuid === params.stashUuid),
      buildCandidateListParamsPeriod(params),
      false,
      companyUuid,
    )
  }),

  getCandidateRecommendations: async (params: CandidateRecommendationParams, ownerUserUuid?: string): Promise<CandidateRecommendationResult> => later(70, () : CandidateRecommendationResult => {
    const companyUuid: string | undefined = optionalCompanyUuid(params)
    requireReadableStash(params.stashUuid, ownerUserUuid, companyUuid)
    return buildCandidateRecommendationResult(buildCandidateListParamsPeriod(params), params.limit, params.cursor, companyUuid)
  }),

  getCandidateItemByUuid: async (itemUuid: string, first?: MockOwnerOrCompanyScope, second?: MockOwnerOrCompanyScope): Promise<CandidateItemDetail | null> => {
    const { ownerUserUuid, params }: { ownerUserUuid: string | undefined; params: CompanyScopeParams | undefined; } = ownerScope(first, second)
    return later(50, () : CandidateItemDetail | null => {
      const row: CandidateItemRecord | undefined = readCandidateItemRecords().find((item: CandidateItemRecord) : boolean => item.uuid === itemUuid)
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
    const { ownerUserUuid, params }: { ownerUserUuid: string | undefined; params: CompanyScopeParams | undefined; } = ownerScope(first, second)
    return startMockCandidateStashLlmCommentJob(stashUuid, ownerUserUuid, requiredCompanyUuid(params))
  },

  subscribeCandidateStashLlmCommentJob: (
    jobId: string,
    listener: (event: CandidateStashLlmCommentJobProgressEvent) => void,
    first?: MockOwnerOrCompanyScope,
    second?: MockOwnerOrCompanyScope,
  ): CandidateStashLlmCommentJobSubscription => {
    const { ownerUserUuid, params }: { ownerUserUuid: string | undefined; params: CompanyScopeParams | undefined; } = ownerScope(first, second)
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
    const { ownerUserUuid, params }: { ownerUserUuid: string | undefined; params: CompanyScopeParams | undefined; } = ownerScope(first, second)
    return subscribeMockCandidateDetailBulkConfirm(jobId, listener, ownerUserUuid, requiredCompanyUuid(params))
  },

  deleteCandidateItem: async (itemUuid: string, first?: MockOwnerOrCompanyScope, second?: MockOwnerOrCompanyScope): Promise<void> => {
    const { ownerUserUuid, params }: { ownerUserUuid: string | undefined; params: CompanyScopeParams | undefined; } = ownerScope(first, second)
    await later(60, () : void => deleteCandidateItemRecord(itemUuid, ownerUserUuid, requiredCompanyUuid(params)))
  },
  deleteCandidateItems: async (stashUuid: string, itemUuids: string[], first?: MockOwnerOrCompanyScope, second?: MockOwnerOrCompanyScope): Promise<void> => {
    const { ownerUserUuid, params }: { ownerUserUuid: string | undefined; params: CompanyScopeParams | undefined; } = ownerScope(first, second)
    await later(80, () : void => deleteCandidateItemRecords(stashUuid, itemUuids, ownerUserUuid, requiredCompanyUuid(params)))
  },
  deleteCandidateStash: async (stashUuid: string, first?: MockOwnerOrCompanyScope, second?: MockOwnerOrCompanyScope): Promise<void> => {
    const { ownerUserUuid, params }: { ownerUserUuid: string | undefined; params: CompanyScopeParams | undefined; } = ownerScope(first, second)
    await later(60, () : void => deleteCandidateStashRecord(stashUuid, ownerUserUuid, requiredCompanyUuid(params)))
  },
  createCandidateStash: async (payload: CreateCandidateStashPayload, ownerUserUuid?: string): Promise<CandidateStashSummary> => later(90, () : CandidateStashSummary => createCandidateStashSummary(payload, ownerUserUuid)),
  updateCandidateStash: async (payload: UpdateCandidateStashPayload, ownerUserUuid?: string): Promise<CandidateStashSummary> => later(70, () : CandidateStashSummary => updateCandidateStashSummary(payload, ownerUserUuid, requiredCompanyUuid(payload))),
  duplicateCandidateStash: async (sourceStashUuid: string, first?: MockOwnerOrCompanyScope, second?: MockOwnerOrCompanyScope): Promise<void> => {
    const { ownerUserUuid, params }: { ownerUserUuid: string | undefined; params: CompanyScopeParams | undefined; } = ownerScope(first, second)
    await later(90, () : void => duplicateCandidateStashRecord(sourceStashUuid, ownerUserUuid, requiredCompanyUuid(params)))
  },
  appendCandidateItem: async (payload: AppendCandidateItemPayload, ownerUserUuid?: string): Promise<void> => later(70, () : void => appendCandidateItemRecord(payload, ownerUserUuid, requiredCompanyUuid(payload))),
  appendCandidateItems: async (payload: AppendCandidateItemsPayload, ownerUserUuid?: string): Promise<AppendCandidateItemsResponse> => later(70, () : AppendCandidateItemsResponse => appendCandidateItemsToStash(payload, ownerUserUuid, requiredCompanyUuid(payload))),
  updateCandidateItem: async (payload: UpdateCandidateItemPayload, ownerUserUuid?: string): Promise<UpdateCandidateItemResponse> => later(70, () : CandidateItemDetail => updateCandidateItemRecord(payload, ownerUserUuid, requiredCompanyUuid(payload))),
  uploadCandidateStashExcel: async (file: File, first?: MockOwnerOrCompanyScope, second?: MockOwnerOrCompanyScope): Promise<CandidateStashExcelUploadResult> => {
    const { ownerUserUuid, params }: { ownerUserUuid: string | undefined; params: CompanyScopeParams | undefined; } = ownerScope(first, second)
    return later(140, () : CandidateStashExcelUploadResult => uploadCandidateStashExcelFile(file, ownerUserUuid, requiredCompanyUuid(params)))
  },
}
