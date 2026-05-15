import type {
  AppendCandidateItemPayload,
  AppendCandidateItemsPayload,
  CandidateItemDetail,
  CandidateItemListParams,
  CandidateItemListResult,
  CandidateRecommendationParams,
  CandidateRecommendationResult,
  CandidateStashExcelUploadResult,
  CandidateStashSummary,
  CreateCandidateStashPayload,
  UpdateCandidateItemPayload,
  UpdateCandidateStashPayload,
} from '../types'
import { MOCK_ADMIN_USER_UUID } from './authApi'
import { buildCandidateItemSummaries, type CandidateDataReferencePeriod } from './candidateItemSummaryBuilder'
import { seededCandidateItems, seededCandidateStashes } from './candidateSeeds'
import { type CandidateItemRecord, type CandidateStashRecord } from './records'
import { productPrimaryBySkuGroupKey } from './productCatalog'
import { makeUuid32, sleep } from './utils'

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
    return {
      items: buildCandidateItemSummaries(
        readCandidateItemsForStash(params.stashUuid, ownerUserUuid),
        buildCandidateListParamsPeriod(params),
      ),
    }
  },
  getCandidateRecommendations: async (
    params: CandidateRecommendationParams,
    ownerUserUuid?: string,
  ): Promise<CandidateRecommendationResult> => {
    await sleep(70)
    const items = buildCandidateItemSummaries(
      readCandidateItemsForStash(params.stashUuid, ownerUserUuid),
      buildCandidateListParamsPeriod(params),
    )
    const recommendedItems = items.filter(
      (item) => item.insight.rankTone === 'top' || item.insight.badges.length > 0,
    )
    return { items: recommendedItems.length ? recommendedItems : items }
  },
  getCandidateItemByUuid: async (itemUuid: string, ownerUserUuid?: string): Promise<CandidateItemDetail | null> => {
    await sleep(50)
    const row = readCandidateItemRecords().find((it) => it.uuid === itemUuid)
    if (!row) return null
    if (!findCandidateStashForOwner(row.stashUuid, ownerUserUuid)) return null
    return {
      uuid: row.uuid,
      stashUuid: row.stashUuid,
      skuGroupKey: row.skuGroupKey,
      details: row.details,
      isLatestLlmComment: row.isLatestLlmComment,
      dbCreatedAt: row.dbCreatedAt,
      dbUpdatedAt: row.dbUpdatedAt ?? row.dbCreatedAt,
    }
  },
  deleteCandidateItem: async (itemUuid: string, ownerUserUuid?: string): Promise<void> => {
    await sleep(60)
    const row = readCandidateItemRecords().find((it) => it.uuid === itemUuid)
    if (row && !findCandidateStashForOwner(row.stashUuid, ownerUserUuid)) {
      throw new Error('후보 아이템을 찾을 수 없습니다.')
    }
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
    void payload
  },
  appendCandidateItems: async (payload: AppendCandidateItemsPayload, ownerUserUuid?: string): Promise<void> => {
    await sleep(70)
    if (!findCandidateStashForOwner(payload.stashUuid, ownerUserUuid)) {
      throw new Error('후보군을 찾을 수 없습니다.')
    }
    const unknownProduct = payload.skuGroupKeys.find((skuGroupKey) => !productPrimaryBySkuGroupKey[skuGroupKey])
    if (unknownProduct) throw new Error(`상품을 찾을 수 없습니다: ${unknownProduct}`)
  },
  updateCandidateItem: async (payload: UpdateCandidateItemPayload, ownerUserUuid?: string): Promise<void> => {
    await sleep(70)
    const item = readCandidateItemRecords().find((row) => row.uuid === payload.itemUuid)
    if (item && !findCandidateStashForOwner(item.stashUuid, ownerUserUuid)) {
      throw new Error('후보 아이템을 찾을 수 없습니다.')
    }
    void payload
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
