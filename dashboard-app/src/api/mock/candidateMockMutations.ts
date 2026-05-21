import type {
  AppendCandidateItemPayload,
  AppendCandidateItemsPayload,
  AppendCandidateItemsResponse,
  CandidateStashExcelUploadResult,
  CandidateStashSummary,
  CreateCandidateStashPayload,
  UpdateCandidateItemPayload,
  UpdateCandidateItemResponse,
  UpdateCandidateStashPayload,
} from '../types'
import { MOCK_ADMIN_USER_UUID } from './authApi'
import { buildCandidateStashItems } from './candidateItemSummaryBuilder'
import { toCandidateItemDetail } from './candidateMockMappers'
import {
  createCandidateItemRecord,
  findCandidateStashForOwner,
  readCandidateItemRecords,
  readCandidateStashRecords,
  toCandidateStashSummary,
} from './candidateMockStore'
import { getMockMutationCompanyUuid } from './mockCompanyScope'
import { productPrimaryBySkuGroupKey } from './productCatalog'
import type { CandidateItemRecord, CandidateStashRecord } from './records'
import { makeUuid32 } from './utils'

function getCandidateStashForMutation(
  stashUuid: string,
  ownerUserUuid?: string,
  companyUuid?: string,
): CandidateStashRecord {
  const requiredCompanyUuid = getMockMutationCompanyUuid(companyUuid)
  const stash = findCandidateStashForOwner(stashUuid, ownerUserUuid, requiredCompanyUuid)
  if (!stash || stash.companyUuid !== requiredCompanyUuid) {
    throw new Error('후보군을 찾을 수 없습니다.')
  }
  return stash
}

function requireCandidateStashName(name: string): string {
  const trimmed = name.trim()
  if (!trimmed) throw new Error('후보군 이름을 입력하세요.')
  return trimmed
}

function assertCandidateStashPeriod(payload: CreateCandidateStashPayload): void {
  if (!payload.periodStart || !payload.periodEnd) {
    throw new Error('후보군 기간을 입력하세요.')
  }
  if (payload.periodStart > payload.periodEnd) {
    throw new Error('후보군 시작일은 종료일보다 늦을 수 없습니다.')
  }
  if (!Number.isFinite(payload.forecastMonths) || payload.forecastMonths <= 0) {
    throw new Error('예측 개월 수는 1 이상이어야 합니다.')
  }
}

function requireCandidateItemUuidSet(itemUuids: string[]): Set<string> {
  if (itemUuids.length === 0) throw new Error('삭제할 후보 아이템이 없습니다.')
  if (itemUuids.some((itemUuid) => !itemUuid.trim())) {
    throw new Error('삭제할 후보 아이템 ID가 비어 있습니다.')
  }
  return new Set(itemUuids)
}

function assertKnownProduct(skuGroupKey: string): void {
  if (!productPrimaryBySkuGroupKey[skuGroupKey]) {
    throw new Error(`상품을 찾을 수 없습니다: ${skuGroupKey}`)
  }
}

export function deleteCandidateItemRecord(itemUuid: string, ownerUserUuid?: string, companyUuid?: string): void {
  const requiredCompanyUuid = getMockMutationCompanyUuid(companyUuid)
  const records = readCandidateItemRecords()
  const index = records.findIndex((it) => it.uuid === itemUuid)
  const row = index >= 0 ? records[index] : undefined
  if (!row || !findCandidateStashForOwner(row.stashUuid, ownerUserUuid, requiredCompanyUuid)) {
    throw new Error('후보 아이템을 찾을 수 없습니다.')
  }
  records.splice(index, 1)
}

export function deleteCandidateItemRecords(
  stashUuid: string,
  itemUuids: string[],
  ownerUserUuid?: string,
  companyUuid?: string,
): void {
  getCandidateStashForMutation(stashUuid, ownerUserUuid, companyUuid)

  const uuidSet = requireCandidateItemUuidSet(itemUuids)
  const records = readCandidateItemRecords()
  for (const itemUuid of uuidSet) {
    const item = records.find((row) => row.uuid === itemUuid)
    if (!item || item.stashUuid !== stashUuid) {
      throw new Error('후보군에 포함되지 않은 후보 아이템이 있습니다.')
    }
  }

  for (let index = records.length - 1; index >= 0; index -= 1) {
    const item = records[index]
    if (item.stashUuid === stashUuid && uuidSet.has(item.uuid)) records.splice(index, 1)
  }
}

export function deleteCandidateStashRecord(stashUuid: string, ownerUserUuid?: string, companyUuid?: string): void {
  const target = getCandidateStashForMutation(stashUuid, ownerUserUuid, companyUuid)
  const stashes = readCandidateStashRecords()
  const stashIndex = stashes.findIndex((row) => row.uuid === target.uuid)
  if (stashIndex >= 0) stashes.splice(stashIndex, 1)

  const items = readCandidateItemRecords()
  for (let index = items.length - 1; index >= 0; index -= 1) {
    if (items[index].stashUuid === target.uuid) items.splice(index, 1)
  }
}

export function createCandidateStashSummary(
  payload: CreateCandidateStashPayload,
  ownerUserUuid = MOCK_ADMIN_USER_UUID,
): CandidateStashSummary {
  const now = new Date().toISOString()
  const name = requireCandidateStashName(payload.name)
  assertCandidateStashPeriod(payload)

  const stash: CandidateStashRecord = {
    uuid: makeUuid32(),
    name,
    note: payload.note?.trim() || null,
    userUuid: ownerUserUuid,
    companyUuid: getMockMutationCompanyUuid(payload),
    periodStart: payload.periodStart,
    periodEnd: payload.periodEnd,
    forecastMonths: payload.forecastMonths,
    dbCreatedAt: now,
    dbUpdatedAt: now,
  }
  readCandidateStashRecords().push(stash)
  return toCandidateStashSummary(stash, 0)
}

export function updateCandidateStashSummary(
  payload: UpdateCandidateStashPayload,
  ownerUserUuid?: string,
  companyUuid?: string,
): CandidateStashSummary {
  const items = readCandidateItemRecords()
  const target = getCandidateStashForMutation(payload.stashUuid, ownerUserUuid, companyUuid)
  const name = requireCandidateStashName(payload.name)

  const now = new Date().toISOString()
  target.name = name
  target.note = payload.note?.trim() || null
  target.dbUpdatedAt = now

  let itemCount = 0
  for (const item of items) {
    if (item.stashUuid === target.uuid) itemCount += 1
  }
  return toCandidateStashSummary(target, itemCount)
}

export function duplicateCandidateStashRecord(
  sourceStashUuid: string,
  ownerUserUuid?: string,
  companyUuid?: string,
): void {
  const source = getCandidateStashForMutation(sourceStashUuid, ownerUserUuid, companyUuid)
  const now = new Date().toISOString()
  const duplicatedStashUuid = makeUuid32()
  readCandidateStashRecords().push({
    ...source,
    uuid: duplicatedStashUuid,
    name: `${source.name} 복사본`,
    dbCreatedAt: now,
    dbUpdatedAt: now,
  })

  const records = readCandidateItemRecords()
  const sourceItems = records.filter((row) => row.stashUuid === source.uuid)
  for (const item of sourceItems) {
    records.push(
      createCandidateItemRecord(duplicatedStashUuid, item.skuGroupKey, now, {
        details: item.details,
        isLatestLlmComment: item.isLatestLlmComment,
      }),
    )
  }
}

export function appendCandidateItemRecord(
  payload: AppendCandidateItemPayload,
  ownerUserUuid?: string,
  companyUuid?: string,
): void {
  getCandidateStashForMutation(payload.stashUuid, ownerUserUuid, companyUuid)
  assertKnownProduct(payload.skuGroupKey)

  const now = new Date().toISOString()
  const records = readCandidateItemRecords()
  if (records.some((row) => row.stashUuid === payload.stashUuid && row.skuGroupKey === payload.skuGroupKey)) {
    throw new Error('이미 후보군에 포함된 상품입니다.')
  }
  records.push({
    ...createCandidateItemRecord(payload.stashUuid, payload.skuGroupKey, now, {
      details: payload.details,
      isLatestLlmComment: payload.isLatestLlmComment,
    }),
  })
}

export function appendCandidateItemsToStash(
  payload: AppendCandidateItemsPayload,
  ownerUserUuid?: string,
  companyUuid?: string,
): AppendCandidateItemsResponse {
  getCandidateStashForMutation(payload.stashUuid, ownerUserUuid, companyUuid)
  if (payload.skuGroupKeys.length === 0) throw new Error('추가할 상품이 없습니다.')
  if (payload.skuGroupKeys.some((skuGroupKey) => !skuGroupKey.trim())) {
    throw new Error('추가할 상품 키가 비어 있습니다.')
  }

  const unknownProduct = payload.skuGroupKeys.find((skuGroupKey) => !productPrimaryBySkuGroupKey[skuGroupKey])
  if (unknownProduct) throw new Error(`상품을 찾을 수 없습니다: ${unknownProduct}`)

  const records = readCandidateItemRecords()
  const existingSkuSet = new Set<string>()
  for (const row of records) {
    if (row.stashUuid === payload.stashUuid) existingSkuSet.add(row.skuUuid)
  }

  const now = new Date().toISOString()
  const createdItems: CandidateItemRecord[] = []
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
}

export function updateCandidateItemRecord(
  payload: UpdateCandidateItemPayload,
  ownerUserUuid?: string,
  companyUuid?: string,
): UpdateCandidateItemResponse {
  const requiredCompanyUuid = getMockMutationCompanyUuid(companyUuid)
  const item = readCandidateItemRecords().find((row) => row.uuid === payload.itemUuid)
  if (!item || !findCandidateStashForOwner(item.stashUuid, ownerUserUuid, requiredCompanyUuid)) {
    throw new Error('후보 아이템을 찾을 수 없습니다.')
  }

  const now = new Date().toISOString()
  item.details = payload.details
  item.isLatestLlmComment = payload.isLatestLlmComment
  item.dbUpdatedAt = now
  return toCandidateItemDetail(item)
}

export function uploadCandidateStashExcelFile(
  file: File,
  ownerUserUuid?: string,
  companyUuid?: string,
): CandidateStashExcelUploadResult {
  void ownerUserUuid
  getMockMutationCompanyUuid(companyUuid)

  const fileName = file.name.trim()
  const isExcel = /\.(xlsx|xls)$/i.test(fileName)
  if (!fileName || !isExcel) throw new Error('엑셀 파일(.xlsx, .xls)만 업로드할 수 있습니다.')
  if (file.size <= 0) throw new Error('빈 엑셀 파일은 업로드할 수 없습니다.')

  throw new Error('Mock API는 엑셀 파일 파싱과 후보군 저장을 구현하지 않습니다.')
}
