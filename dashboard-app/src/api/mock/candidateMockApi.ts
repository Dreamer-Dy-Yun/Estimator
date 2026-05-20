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
  CandidateStashExcelUploadResult,
  CandidateStashSummary,
  CreateCandidateStashPayload,
  UpdateCandidateItemPayload,
  UpdateCandidateItemResponse,
  UpdateCandidateStashPayload,
} from '../types'
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

export const candidateMockApi = {
  getCandidateStashes: async (ownerUserUuid?: string): Promise<CandidateStashSummary[]> => {
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
    params: CandidateOrderMetricStreamParams,
    listener: (event: CandidateOrderMetricEvent) => void,
    ownerUserUuid?: string,
  ): CandidateOrderMetricSubscription => subscribeMockCandidateOrderMetrics(params, listener, ownerUserUuid),
  startCandidateStashLlmCommentJob: async (
    stashUuid: string,
    ownerUserUuid?: string,
  ): Promise<CandidateStashLlmCommentJobStartResult> => startMockCandidateStashLlmCommentJob(stashUuid, ownerUserUuid),
  subscribeCandidateStashLlmCommentJob: (
    jobId: string,
    listener: (event: CandidateStashLlmCommentJobProgressEvent) => void,
    ownerUserUuid?: string,
  ): CandidateStashLlmCommentJobSubscription => subscribeMockCandidateStashLlmCommentJob(jobId, listener, ownerUserUuid),
  startCandidateDetailBulkConfirm: async (
    payload: CandidateDetailBulkConfirmStartPayload,
    ownerUserUuid?: string,
  ): Promise<CandidateDetailBulkConfirmStartResult> => startMockCandidateDetailBulkConfirm(payload, ownerUserUuid),
  subscribeCandidateDetailBulkConfirm: (
    jobId: string,
    listener: (event: CandidateDetailBulkConfirmProgressEvent) => void,
    ownerUserUuid?: string,
  ): CandidateDetailBulkConfirmSubscription => subscribeMockCandidateDetailBulkConfirm(jobId, listener, ownerUserUuid),
  getCandidateRecommendations: async (
    params: CandidateRecommendationParams,
    ownerUserUuid?: string,
  ): Promise<CandidateRecommendationResult> => {
    await sleep(70)
    if (!findCandidateStashForOwner(params.stashUuid, ownerUserUuid)) {
      throw new Error('후보군을 찾을 수 없습니다.')
    }
    return buildCandidateRecommendationResult(buildCandidateListParamsPeriod(params), params.limit, params.cursor)
  },
  getCandidateItemByUuid: async (itemUuid: string, ownerUserUuid?: string): Promise<CandidateItemDetail | null> => {
    await sleep(50)
    const row = readCandidateItemRecords().find((it) => it.uuid === itemUuid)
    if (!row) return null
    if (!findCandidateStashForOwner(row.stashUuid, ownerUserUuid)) return null
    return toCandidateItemDetail(row)
  },
  deleteCandidateItem: async (itemUuid: string, ownerUserUuid?: string): Promise<void> => {
    await sleep(60)
    deleteCandidateItemRecord(itemUuid, ownerUserUuid)
  },
  deleteCandidateItems: async (
    stashUuid: string,
    itemUuids: string[],
    ownerUserUuid?: string,
  ): Promise<void> => {
    await sleep(80)
    deleteCandidateItemRecords(stashUuid, itemUuids, ownerUserUuid)
  },
  deleteCandidateStash: async (stashUuid: string, ownerUserUuid?: string): Promise<void> => {
    await sleep(60)
    deleteCandidateStashRecord(stashUuid, ownerUserUuid)
  },
  createCandidateStash: async (
    payload: CreateCandidateStashPayload,
    ownerUserUuid?: string,
  ): Promise<CandidateStashSummary> => {
    await sleep(90)
    return createCandidateStashSummary(payload, ownerUserUuid)
  },
  updateCandidateStash: async (
    payload: UpdateCandidateStashPayload,
    ownerUserUuid?: string,
  ): Promise<CandidateStashSummary> => {
    await sleep(70)
    return updateCandidateStashSummary(payload, ownerUserUuid)
  },
  duplicateCandidateStash: async (sourceStashUuid: string, ownerUserUuid?: string): Promise<void> => {
    await sleep(90)
    duplicateCandidateStashRecord(sourceStashUuid, ownerUserUuid)
  },
  appendCandidateItem: async (payload: AppendCandidateItemPayload, ownerUserUuid?: string): Promise<void> => {
    await sleep(70)
    appendCandidateItemRecord(payload, ownerUserUuid)
  },
  appendCandidateItems: async (
    payload: AppendCandidateItemsPayload,
    ownerUserUuid?: string,
  ): Promise<AppendCandidateItemsResponse> => {
    await sleep(70)
    return appendCandidateItemsToStash(payload, ownerUserUuid)
  },
  updateCandidateItem: async (
    payload: UpdateCandidateItemPayload,
    ownerUserUuid?: string,
  ): Promise<UpdateCandidateItemResponse> => {
    await sleep(70)
    return updateCandidateItemRecord(payload, ownerUserUuid)
  },
  uploadCandidateStashExcel: async (
    file: File,
    ownerUserUuid?: string,
  ): Promise<CandidateStashExcelUploadResult> => {
    await sleep(140)
    return uploadCandidateStashExcelFile(file, ownerUserUuid)
  },
}
