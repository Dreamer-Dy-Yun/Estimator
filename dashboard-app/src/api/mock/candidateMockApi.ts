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
import { MOCK_ADMIN_USER_UUID } from './authApi'
import { subscribeMockCandidateOrderMetrics } from './candidateOrderMetricStream'
import {
  startMockCandidateDetailBulkConfirm,
  subscribeMockCandidateDetailBulkConfirm,
} from './candidateDetailBulkConfirmStream'
import {
  startMockCandidateStashLlmCommentJob,
  subscribeMockCandidateStashLlmCommentJob,
} from './candidateStashLlmCommentJobStream'
import {
  buildCandidateItemListResult,
  buildCandidateListParamsPeriod,
  buildCandidateRecommendationResult,
  createCandidateItemRecord,
  filterCandidateStashesForOwner,
  findCandidateStashForOwner,
  readCandidateItemRecords,
  readCandidateItemsForStash,
  readCandidateStashRecords,
  toCandidateStashSummary,
} from './candidateMockStore'
import { buildCandidateStashItems } from './candidateItemSummaryBuilder'
import { type CandidateStashRecord } from './records'
import { productPrimaryBySkuGroupKey } from './productCatalog'
import { makeUuid32, sleep } from './utils'

function toCandidateItemDetail(row: ReturnType<typeof readCandidateItemRecords>[number]): CandidateItemDetail {
  return {
    uuid: row.uuid,
    stashUuid: row.stashUuid,
    skuUuid: row.skuUuid,
    skuGroupKey: row.skuGroupKey,
    details: row.details,
    isDetailConfirmed: row.details != null,
    isLatestLlmComment: row.isLatestLlmComment,
    dbCreatedAt: row.dbCreatedAt,
    dbUpdatedAt: row.dbUpdatedAt ?? row.dbCreatedAt,
  }
}

function buildCandidateItemStatsByStash(items: ReturnType<typeof readCandidateItemRecords>) {
  const stats = new Map<string, { count: number; latestItemTs: string }>()
  for (const item of items) {
    const current = stats.get(item.stashUuid)
    const dbCreatedAt = String(item.dbCreatedAt)
    if (!current) {
      stats.set(item.stashUuid, { count: 1, latestItemTs: dbCreatedAt })
      continue
    }
    current.count += 1
    if (dbCreatedAt > current.latestItemTs) current.latestItemTs = dbCreatedAt
  }
  return stats
}

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
    return buildCandidateItemListResult(
      readCandidateItemsForStash(params.stashUuid, ownerUserUuid),
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
      return { recommendations: [], nextCursor: null }
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
    const records = readCandidateItemRecords()
    const index = records.findIndex((it) => it.uuid === itemUuid)
    const row = index >= 0 ? records[index] : undefined
    if (row && !findCandidateStashForOwner(row.stashUuid, ownerUserUuid)) {
      throw new Error('후보 아이템을 찾을 수 없습니다.')
    }
    if (index >= 0) records.splice(index, 1)
  },
  deleteCandidateItems: async (
    stashUuid: string,
    itemUuids: string[],
    ownerUserUuid?: string,
  ): Promise<void> => {
    await sleep(80)
    if (!findCandidateStashForOwner(stashUuid, ownerUserUuid)) {
      throw new Error('후보군을 찾을 수 없습니다.')
    }
    const uuidSet = new Set(itemUuids)
    const invalidItem = readCandidateItemRecords().find(
      (item) => uuidSet.has(item.uuid) && item.stashUuid !== stashUuid,
    )
    if (invalidItem) throw new Error('후보군에 포함되지 않은 아이템이 있습니다.')
    const records = readCandidateItemRecords()
    for (let index = records.length - 1; index >= 0; index -= 1) {
      const item = records[index]
      if (item.stashUuid === stashUuid && uuidSet.has(item.uuid)) records.splice(index, 1)
    }
  },
  deleteCandidateStash: async (stashUuid: string, ownerUserUuid?: string): Promise<void> => {
    await sleep(60)
    if (!findCandidateStashForOwner(stashUuid, ownerUserUuid)) {
      throw new Error('후보군을 찾을 수 없습니다.')
    }
  },
  createCandidateStash: async (
    payload: CreateCandidateStashPayload,
    ownerUserUuid = MOCK_ADMIN_USER_UUID,
  ): Promise<CandidateStashSummary> => {
    await sleep(90)
    const now = new Date().toISOString()
    const stash: CandidateStashRecord = {
      uuid: makeUuid32(),
      name: payload.name.trim() || `오더 후보군 ${now.slice(0, 10)}`,
      note: payload.note?.trim() || null,
      userUuid: ownerUserUuid,
      periodStart: payload.periodStart,
      periodEnd: payload.periodEnd,
      forecastMonths: payload.forecastMonths,
      dbCreatedAt: now,
      dbUpdatedAt: now,
    }
    return toCandidateStashSummary(stash, 0)
  },
  updateCandidateStash: async (
    payload: UpdateCandidateStashPayload,
    ownerUserUuid?: string,
  ): Promise<CandidateStashSummary> => {
    await sleep(70)
    const stashes = readCandidateStashRecords()
    const items = readCandidateItemRecords()
    const target = stashes.find((s) => s.uuid === payload.stashUuid)
    if (!target || !findCandidateStashForOwner(target.uuid, ownerUserUuid)) {
      throw new Error('후보군을 찾을 수 없습니다.')
    }
    const now = new Date().toISOString()
    const updated: CandidateStashRecord = {
      ...target,
      name: payload.name.trim() || target.name,
      note: payload.note?.trim() || null,
      dbUpdatedAt: now,
    }
    let itemCount = 0
    for (const item of items) {
      if (item.stashUuid === target.uuid) itemCount += 1
    }
    return toCandidateStashSummary(updated, itemCount)
  },
  duplicateCandidateStash: async (sourceStashUuid: string, ownerUserUuid?: string): Promise<void> => {
    await sleep(90)
    const stashes = readCandidateStashRecords()
    const source = stashes.find((row) => row.uuid === sourceStashUuid)
    if (!source || !findCandidateStashForOwner(source.uuid, ownerUserUuid)) {
      throw new Error('복제할 후보군을 찾을 수 없습니다.')
    }
  },
  appendCandidateItem: async (payload: AppendCandidateItemPayload, ownerUserUuid?: string): Promise<void> => {
    await sleep(70)
    if (!findCandidateStashForOwner(payload.stashUuid, ownerUserUuid)) {
      throw new Error('후보군을 찾을 수 없습니다.')
    }
    if (!productPrimaryBySkuGroupKey[payload.skuGroupKey]) {
      throw new Error(`상품을 찾을 수 없습니다: ${payload.skuGroupKey}`)
    }
    const now = new Date().toISOString()
    readCandidateItemRecords().push({
      ...createCandidateItemRecord(payload.stashUuid, payload.skuGroupKey, now, {
        details: payload.details,
        isLatestLlmComment: payload.isLatestLlmComment,
      }),
    })
  },
  appendCandidateItems: async (
    payload: AppendCandidateItemsPayload,
    ownerUserUuid?: string,
  ): Promise<AppendCandidateItemsResponse> => {
    await sleep(70)
    if (!findCandidateStashForOwner(payload.stashUuid, ownerUserUuid)) {
      throw new Error('후보군을 찾을 수 없습니다.')
    }
    const unknownProduct = payload.skuGroupKeys.find((skuGroupKey) => !productPrimaryBySkuGroupKey[skuGroupKey])
    if (unknownProduct) throw new Error(`상품을 찾을 수 없습니다: ${unknownProduct}`)
    const records = readCandidateItemRecords()
    const existingSkuSet = new Set<string>()
    for (const row of records) {
      if (row.stashUuid === payload.stashUuid) existingSkuSet.add(row.skuUuid)
    }
    const now = new Date().toISOString()
    const createdItems = []
    for (const skuGroupKey of [...new Set(payload.skuGroupKeys)]) {
      if (existingSkuSet.has(skuGroupKey)) continue
      const created = createCandidateItemRecord(payload.stashUuid, skuGroupKey, now)
      records.push(created)
      createdItems.push(created)
      existingSkuSet.add(skuGroupKey)
    }
    return {
      candidateItems: buildCandidateStashItems(createdItems),
    }
  },
  updateCandidateItem: async (
    payload: UpdateCandidateItemPayload,
    ownerUserUuid?: string,
  ): Promise<UpdateCandidateItemResponse> => {
    await sleep(70)
    const item = readCandidateItemRecords().find((row) => row.uuid === payload.itemUuid)
    if (!item || !findCandidateStashForOwner(item.stashUuid, ownerUserUuid)) {
      throw new Error('후보 아이템을 찾을 수 없습니다.')
    }
    const now = new Date().toISOString()
    item.details = payload.details
    item.isLatestLlmComment = payload.isLatestLlmComment
    item.dbUpdatedAt = now
    return toCandidateItemDetail(item)
  },
  uploadCandidateStashExcel: async (
    file: File,
    ownerUserUuid?: string,
  ): Promise<CandidateStashExcelUploadResult> => {
    await sleep(140)
    void ownerUserUuid

    const fileName = file.name.trim()
    const isExcel = /\.(xlsx|xls)$/i.test(fileName)
    if (!fileName || !isExcel) throw new Error('엑셀 파일(.xlsx, .xls)만 업로드할 수 있습니다.')
    if (file.size <= 0) throw new Error('빈 엑셀 파일은 업로드할 수 없습니다.')

    return {
      stashUuid: makeUuid32(),
      stashName: `엑셀 업로드 후보군 ${fileName}`,
      itemCount: 0,
      warnings: [
        '목 API는 파일 검증과 성공 응답만 모사하며 프론트 저장소에 후보군을 만들지 않습니다.',
        '실제 백엔드는 필수 컬럼 검증 후 DB에 후보군과 후보 아이템을 저장해야 합니다.',
      ],
    }
  },
}
