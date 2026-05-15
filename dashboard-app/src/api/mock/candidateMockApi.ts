import type {
  AppendCandidateItemPayload,
  AppendCandidateItemsPayload,
  CandidateItemDetail,
  CandidateItemListParams,
  CandidateItemListResult,
  CandidateOrderMetricEvent,
  CandidateOrderMetricStreamParams,
  CandidateOrderMetricSubscription,
  CandidateRecommendationParams,
  CandidateRecommendationResult,
  CandidateStashAnalysisProgressEvent,
  CandidateStashAnalysisStartResult,
  CandidateStashAnalysisSubscription,
  CandidateStashExcelUploadResult,
  CandidateStashSummary,
  CreateCandidateStashPayload,
  UpdateCandidateItemPayload,
  UpdateCandidateStashPayload,
} from '../types'
import { MOCK_ADMIN_USER_UUID } from './authApi'
import {
  buildCandidateItemSummaries,
  buildCandidateOrderMetric,
  buildCandidateReferenceItems,
  buildCandidateStashItems,
  type CandidateDataReferencePeriod,
} from './candidateItemSummaryBuilder'
import { seededCandidateItems, seededCandidateStashes } from './candidateSeeds'
import { type CandidateItemRecord, type CandidateStashRecord } from './records'
import { productPrimaryBySkuGroupKey } from './productCatalog'
import { allKnownSkuGroupKeys } from './salesTables'
import { makeUuid32, sleep } from './utils'

interface CandidateStashAnalysisJob {
  stashUuid: string
  ownerUserUuid?: string
  itemUuids: string[]
}

const candidateStashAnalysisJobs = new Map<string, CandidateStashAnalysisJob>()

function readCandidateStashRecords(): CandidateStashRecord[] {
  return seededCandidateStashes
}

function readCandidateItemRecords(): CandidateItemRecord[] {
  return seededCandidateItems
}

function filterCandidateStashesForOwner(
  rows: CandidateStashRecord[],
  ownerUserUuid?: string,
): CandidateStashRecord[] {
  if (!ownerUserUuid) return rows
  return rows.filter((row) => row.userUuid === ownerUserUuid)
}

function findCandidateStashForOwner(stashUuid: string, ownerUserUuid?: string): CandidateStashRecord | null {
  const stash = readCandidateStashRecords().find((row) => row.uuid === stashUuid) ?? null
  if (!stash) return null
  if (ownerUserUuid && stash.userUuid !== ownerUserUuid) return null
  return stash
}

function readCandidateItemsForStash(stashUuid: string, ownerUserUuid?: string): CandidateItemRecord[] {
  if (!findCandidateStashForOwner(stashUuid, ownerUserUuid)) return []
  return readCandidateItemRecords().filter((row) => row.stashUuid === stashUuid)
}

function toCandidateStashSummary(
  row: CandidateStashRecord,
  itemCount: number,
  dbUpdatedAt = row.dbUpdatedAt ?? row.dbCreatedAt,
): CandidateStashSummary {
  return {
    uuid: row.uuid,
    name: row.name,
    note: row.note ?? null,
    periodStart: row.periodStart,
    periodEnd: row.periodEnd,
    forecastMonths: row.forecastMonths,
    itemCount,
    dbCreatedAt: row.dbCreatedAt,
    dbUpdatedAt,
  }
}

function buildCandidateListParamsPeriod({
  dataReferencePeriodStart,
  dataReferencePeriodEnd,
}: CandidateItemListParams | CandidateRecommendationParams): CandidateDataReferencePeriod {
  return {
    start: dataReferencePeriodStart,
    end: dataReferencePeriodEnd,
  }
}

function buildCandidateItemListResult(
  records: CandidateItemRecord[],
  period: CandidateDataReferencePeriod,
  includeOrderMetrics = false,
): CandidateItemListResult {
  return {
    referenceItems: buildCandidateReferenceItems(allKnownSkuGroupKeys, period),
    candidateItems: buildCandidateStashItems(records),
    items: buildCandidateItemSummaries(records, period, { includeOrderMetrics }),
  }
}

export const candidateMockApi = {
  getCandidateStashes: async (ownerUserUuid?: string): Promise<CandidateStashSummary[]> => {
    await sleep(60)
    const stashes = readCandidateStashRecords()
    const items = readCandidateItemRecords()
    const owned = filterCandidateStashesForOwner(stashes, ownerUserUuid)
    return owned
      .map((row) => {
        const linkedItems = items.filter((it) => it.stashUuid === row.uuid)
        const latestItemTs = linkedItems.reduce<string>(
          (latest, it) => (String(it.dbCreatedAt) > latest ? String(it.dbCreatedAt) : latest),
          '',
        )
        const recordUpdatedAt = row.dbUpdatedAt ?? row.dbCreatedAt
        const dbUpdatedAt = latestItemTs && latestItemTs > recordUpdatedAt ? latestItemTs : recordUpdatedAt
        return toCandidateStashSummary(row, linkedItems.length, dbUpdatedAt)
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
  ): CandidateOrderMetricSubscription => {
    const records = readCandidateItemsForStash(params.stashUuid, ownerUserUuid)
      .filter((row) => params.candidateItemUuids.includes(row.uuid))
    const period = buildCandidateListParamsPeriod(params)
    const timers = records.map((row, index) => globalThis.setTimeout(() => {
      listener({
        type: 'item',
        requestId: params.requestId,
        itemUuid: row.uuid,
        skuUuid: row.skuUuid,
        metric: buildCandidateOrderMetric(row, period),
      })
      if (index === records.length - 1) {
        listener({
          type: 'completed',
          requestId: params.requestId,
          processedCount: records.length,
          failedCount: 0,
        })
      }
    }, 80 + index * 45))
    if (records.length === 0) {
      const timer = globalThis.setTimeout(() => {
        listener({
          type: 'completed',
          requestId: params.requestId,
          processedCount: 0,
          failedCount: 0,
        })
      }, 0)
      timers.push(timer)
    }
    return {
      close: () => {
        timers.forEach((timer) => globalThis.clearTimeout(timer))
      },
    }
  },
  startCandidateStashAnalysis: async (
    stashUuid: string,
    ownerUserUuid?: string,
  ): Promise<CandidateStashAnalysisStartResult> => {
    await sleep(60)
    if (!findCandidateStashForOwner(stashUuid, ownerUserUuid)) {
      throw new Error('후보군을 찾을 수 없습니다.')
    }
    const itemUuids = readCandidateItemsForStash(stashUuid, ownerUserUuid)
      .filter((row) => row.details != null)
      .map((row) => row.uuid)
    const jobId = `mock-analysis-${makeUuid32()}`
    candidateStashAnalysisJobs.set(jobId, { stashUuid, ownerUserUuid, itemUuids })
    return {
      jobId,
      stashUuid,
      itemCount: itemUuids.length,
    }
  },
  subscribeCandidateStashAnalysis: (
    jobId: string,
    listener: (event: CandidateStashAnalysisProgressEvent) => void,
    ownerUserUuid?: string,
  ): CandidateStashAnalysisSubscription => {
    const job = candidateStashAnalysisJobs.get(jobId)
    const canReadJob = job && (!ownerUserUuid || job.ownerUserUuid === ownerUserUuid)
    const stashUuid = job?.stashUuid ?? ''
    const itemUuids = canReadJob ? job.itemUuids : []
    const totalItems = itemUuids.length
    const timers: ReturnType<typeof globalThis.setTimeout>[] = []

    const emit = (event: CandidateStashAnalysisProgressEvent, delay: number) => {
      timers.push(globalThis.setTimeout(() => listener(event), delay))
    }

    if (!canReadJob) {
      emit({
        jobId,
        stashUuid,
        status: 'failed',
        totalItems: 0,
        completedItems: 0,
        message: '후보군 분석 작업을 찾을 수 없습니다.',
        error: '후보군 분석 작업을 찾을 수 없습니다.',
      }, 0)
      return {
        close: () => timers.forEach((timer) => globalThis.clearTimeout(timer)),
      }
    }

    emit({
      jobId,
      stashUuid,
      status: totalItems > 0 ? 'running' : 'completed',
      totalItems,
      completedItems: 0,
      message: totalItems > 0 ? '후보군 AI 분석을 시작했습니다.' : '분석 가능한 확정 스냅샷이 없습니다.',
    }, 0)

    itemUuids.forEach((itemUuid, index) => {
      const item = readCandidateItemRecords().find((row) => row.uuid === itemUuid)
      const product = item ? productPrimaryBySkuGroupKey[item.skuGroupKey] : null
      emit({
        jobId,
        stashUuid,
        status: 'running',
        totalItems,
        completedItems: index + 1,
        currentItemUuid: itemUuid,
        currentProductName: product?.productName,
        message: `${product?.productName ?? itemUuid} 분석을 완료했습니다.`,
      }, 80 + index * 80)
    })

    if (totalItems > 0) {
      emit({
        jobId,
        stashUuid,
        status: 'completed',
        totalItems,
        completedItems: totalItems,
        message: '후보군 AI 분석을 완료했습니다.',
      }, 120 + totalItems * 80)
    }

    return {
      close: () => timers.forEach((timer) => globalThis.clearTimeout(timer)),
    }
  },
  getCandidateRecommendations: async (
    params: CandidateRecommendationParams,
    ownerUserUuid?: string,
  ): Promise<CandidateRecommendationResult> => {
    await sleep(70)
    const records = readCandidateItemsForStash(params.stashUuid, ownerUserUuid)
    return buildCandidateItemListResult(records, buildCandidateListParamsPeriod(params), false)
  },
  getCandidateItemByUuid: async (itemUuid: string, ownerUserUuid?: string): Promise<CandidateItemDetail | null> => {
    await sleep(50)
    const row = readCandidateItemRecords().find((it) => it.uuid === itemUuid)
    if (!row) return null
    if (!findCandidateStashForOwner(row.stashUuid, ownerUserUuid)) return null
    return {
      uuid: row.uuid,
      stashUuid: row.stashUuid,
      skuUuid: row.skuUuid,
      skuGroupKey: row.skuGroupKey,
      details: row.details,
      isLatestLlmComment: row.isLatestLlmComment,
      dbCreatedAt: row.dbCreatedAt,
      dbUpdatedAt: row.dbUpdatedAt ?? row.dbCreatedAt,
    }
  },
  deleteCandidateItem: async (itemUuid: string, ownerUserUuid?: string): Promise<void> => {
    await sleep(60)
    const records = readCandidateItemRecords()
    const row = records.find((it) => it.uuid === itemUuid)
    if (row && !findCandidateStashForOwner(row.stashUuid, ownerUserUuid)) {
      throw new Error('후보 아이템을 찾을 수 없습니다.')
    }
    const index = records.findIndex((it) => it.uuid === itemUuid)
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
    const linkedItems = items.filter((it) => it.stashUuid === target.uuid)
    return toCandidateStashSummary(updated, linkedItems.length)
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
      uuid: makeUuid32(),
      stashUuid: payload.stashUuid,
      skuUuid: payload.skuGroupKey,
      skuGroupKey: payload.skuGroupKey,
      details: payload.details,
      isLatestLlmComment: payload.isLatestLlmComment,
      dbCreatedAt: now,
      dbUpdatedAt: now,
    })
  },
  appendCandidateItems: async (payload: AppendCandidateItemsPayload, ownerUserUuid?: string): Promise<void> => {
    await sleep(70)
    if (!findCandidateStashForOwner(payload.stashUuid, ownerUserUuid)) {
      throw new Error('후보군을 찾을 수 없습니다.')
    }
    const unknownProduct = payload.skuGroupKeys.find((skuGroupKey) => !productPrimaryBySkuGroupKey[skuGroupKey])
    if (unknownProduct) throw new Error(`상품을 찾을 수 없습니다: ${unknownProduct}`)
    const records = readCandidateItemRecords()
    const existingSkuSet = new Set(
      records
        .filter((row) => row.stashUuid === payload.stashUuid)
        .map((row) => row.skuUuid),
    )
    const now = new Date().toISOString()
    for (const skuGroupKey of [...new Set(payload.skuGroupKeys)]) {
      if (existingSkuSet.has(skuGroupKey)) continue
      records.push({
        uuid: makeUuid32(),
        stashUuid: payload.stashUuid,
        skuUuid: skuGroupKey,
        skuGroupKey,
        details: null,
        isLatestLlmComment: false,
        dbCreatedAt: now,
        dbUpdatedAt: now,
      })
      existingSkuSet.add(skuGroupKey)
    }
  },
  updateCandidateItem: async (payload: UpdateCandidateItemPayload, ownerUserUuid?: string): Promise<void> => {
    await sleep(70)
    const item = readCandidateItemRecords().find((row) => row.uuid === payload.itemUuid)
    if (!item || !findCandidateStashForOwner(item.stashUuid, ownerUserUuid)) {
      throw new Error('후보 아이템을 찾을 수 없습니다.')
    }
    const now = new Date().toISOString()
    item.details = payload.details
    item.isLatestLlmComment = payload.isLatestLlmComment
    item.dbUpdatedAt = now
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
