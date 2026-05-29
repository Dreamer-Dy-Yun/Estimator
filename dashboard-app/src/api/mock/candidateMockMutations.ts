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
import { parseOrderSnapshot } from '../../snapshot/parseOrderSnapshot'
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
import { DEFAULT_CANDIDATE_STASH_CONTEXT, type CandidateItemRecord, type CandidateStashRecord } from './records'
import { makeUuid32 } from './utils'

const MOCK_EXCEL_UPLOAD_ITEM_LIMIT = 3

function requireCandidateStashForMutation(stashUuid: string, ownerUserUuid?: string, companyUuid?: string): CandidateStashRecord {
  const requiredCompanyUuid = getMockMutationCompanyUuid(companyUuid)
  const stash = findCandidateStashForOwner(stashUuid, ownerUserUuid, requiredCompanyUuid)
  if (!stash || stash.companyUuid !== requiredCompanyUuid) throw new Error('후보군을 찾을 수 없습니다.')
  return stash
}

function requireStashName(name: string): string {
  const trimmed = name.trim()
  if (!trimmed) throw new Error('후보군 이름을 입력하세요.')
  return trimmed
}

function assertCreatePayload(payload: CreateCandidateStashPayload): void {
  if (!payload.periodStart || !payload.periodEnd) throw new Error('후보군 기간을 입력하세요.')
  if (payload.periodStart > payload.periodEnd) throw new Error('후보군 시작일은 종료일보다 늦을 수 없습니다.')
  if (!Number.isFinite(payload.forecastMonths) || payload.forecastMonths <= 0) throw new Error('예측 개월 수는 1 이상이어야 합니다.')
}

function requireSkuGroupKeys(skuGroupKeys: string[]): string[] {
  const unique = [...new Set(skuGroupKeys)]
  if (unique.length === 0) throw new Error('추가할 상품이 없습니다.')
  if (unique.some((skuGroupKey) => !skuGroupKey.trim())) throw new Error('추가할 상품 키가 비어 있습니다.')
  const unknownProduct = unique.find((skuGroupKey) => !productPrimaryBySkuGroupKey[skuGroupKey])
  if (unknownProduct) throw new Error(`상품을 찾을 수 없습니다: ${unknownProduct}`)
  return unique
}

function requireItemUuidSet(itemUuids: string[]): Set<string> {
  if (itemUuids.length === 0) throw new Error('삭제할 후보 아이템이 없습니다.')
  if (itemUuids.some((itemUuid) => !itemUuid.trim())) throw new Error('삭제할 후보 아이템 ID가 비어 있습니다.')
  return new Set(itemUuids)
}

function createItem(stashUuid: string, skuGroupKey: string, now: string, overrides?: Partial<Pick<CandidateItemRecord, 'details' | 'isLatestLlmComment'>>) {
  return createCandidateItemRecord(stashUuid, skuGroupKey, now, overrides)
}

function requireCandidateDetailsSnapshot(
  details: CandidateItemRecord['details'] | undefined,
  skuGroupKey: string,
  options: { allowNull: boolean; companyUuid: string },
): CandidateItemRecord['details'] {
  if (!details) {
    if (options.allowNull) return null
    throw new Error('Candidate item details are required.')
  }

  const snapshot = parseOrderSnapshot(details)
  if (snapshot.skuGroupKey !== skuGroupKey) {
    throw new Error(`Candidate item details skuGroupKey mismatch: ${snapshot.skuGroupKey} !== ${skuGroupKey}`)
  }
  if (snapshot.companyUuid !== options.companyUuid) {
    throw new Error(`Candidate item details companyUuid mismatch: ${snapshot.companyUuid} !== ${options.companyUuid}`)
  }
  return snapshot
}

export function deleteCandidateItemRecord(itemUuid: string, ownerUserUuid?: string, companyUuid?: string): void {
  const requiredCompanyUuid = getMockMutationCompanyUuid(companyUuid)
  const records = readCandidateItemRecords()
  const index = records.findIndex((item) => item.uuid === itemUuid)
  const item = records[index]
  if (!item || !findCandidateStashForOwner(item.stashUuid, ownerUserUuid, requiredCompanyUuid)) throw new Error('후보 아이템을 찾을 수 없습니다.')
  records.splice(index, 1)
}

export function deleteCandidateItemRecords(stashUuid: string, itemUuids: string[], ownerUserUuid?: string, companyUuid?: string): void {
  requireCandidateStashForMutation(stashUuid, ownerUserUuid, companyUuid)
  const uuidSet = requireItemUuidSet(itemUuids)
  const records = readCandidateItemRecords()
  if ([...uuidSet].some((itemUuid) => !records.some((row) => row.uuid === itemUuid && row.stashUuid === stashUuid))) {
    throw new Error('후보군에 포함되지 않은 후보 아이템이 있습니다.')
  }
  for (let index = records.length - 1; index >= 0; index -= 1) {
    if (records[index].stashUuid === stashUuid && uuidSet.has(records[index].uuid)) records.splice(index, 1)
  }
}

export function deleteCandidateStashRecord(stashUuid: string, ownerUserUuid?: string, companyUuid?: string): void {
  const target = requireCandidateStashForMutation(stashUuid, ownerUserUuid, companyUuid)
  const stashes = readCandidateStashRecords()
  const stashIndex = stashes.findIndex((row) => row.uuid === target.uuid)
  if (stashIndex >= 0) stashes.splice(stashIndex, 1)
  const items = readCandidateItemRecords()
  for (let index = items.length - 1; index >= 0; index -= 1) {
    if (items[index].stashUuid === target.uuid) items.splice(index, 1)
  }
}

export function createCandidateStashSummary(payload: CreateCandidateStashPayload, ownerUserUuid = MOCK_ADMIN_USER_UUID): CandidateStashSummary {
  const now = new Date().toISOString()
  assertCreatePayload(payload)
  const stash: CandidateStashRecord = {
    uuid: makeUuid32(),
    name: requireStashName(payload.name),
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

export function updateCandidateStashSummary(payload: UpdateCandidateStashPayload, ownerUserUuid?: string, companyUuid?: string): CandidateStashSummary {
  const target = requireCandidateStashForMutation(payload.stashUuid, ownerUserUuid, companyUuid)
  target.name = requireStashName(payload.name)
  target.note = payload.note?.trim() || null
  target.dbUpdatedAt = new Date().toISOString()
  return toCandidateStashSummary(target, readCandidateItemRecords().filter((item) => item.stashUuid === target.uuid).length)
}

export function duplicateCandidateStashRecord(sourceStashUuid: string, ownerUserUuid?: string, companyUuid?: string): void {
  const source = requireCandidateStashForMutation(sourceStashUuid, ownerUserUuid, companyUuid)
  const now = new Date().toISOString()
  const duplicatedStashUuid = makeUuid32()
  readCandidateStashRecords().push({ ...source, uuid: duplicatedStashUuid, name: `${source.name} 복사본`, dbCreatedAt: now, dbUpdatedAt: now })
  readCandidateItemRecords()
    .filter((row) => row.stashUuid === source.uuid)
    .forEach((item) => readCandidateItemRecords().push(createItem(duplicatedStashUuid, item.skuGroupKey, now, {
      details: item.details,
      isLatestLlmComment: item.isLatestLlmComment,
    })))
}

export function appendCandidateItemRecord(payload: AppendCandidateItemPayload, ownerUserUuid?: string, companyUuid?: string): void {
  const stash = requireCandidateStashForMutation(payload.stashUuid, ownerUserUuid, companyUuid ?? payload.companyUuid)
  requireSkuGroupKeys([payload.skuGroupKey])
  const records = readCandidateItemRecords()
  if (records.some((row) => row.stashUuid === payload.stashUuid && row.skuGroupKey === payload.skuGroupKey)) throw new Error('이미 후보군에 포함된 상품입니다.')
  records.push(createItem(payload.stashUuid, payload.skuGroupKey, new Date().toISOString(), {
    details: requireCandidateDetailsSnapshot(payload.details, payload.skuGroupKey, { allowNull: false, companyUuid: stash.companyUuid }),
    isLatestLlmComment: payload.isLatestLlmComment,
  }))
}

export function appendCandidateItemsToStash(payload: AppendCandidateItemsPayload, ownerUserUuid?: string, companyUuid?: string): AppendCandidateItemsResponse {
  requireCandidateStashForMutation(payload.stashUuid, ownerUserUuid, companyUuid)
  const records = readCandidateItemRecords()
  const existingSkuGroupKeySet = new Set(records.filter((row) => row.stashUuid === payload.stashUuid).map((row) => row.skuGroupKey))
  const now = new Date().toISOString()
  const createdItems = requireSkuGroupKeys(payload.skuGroupKeys)
    .filter((skuGroupKey) => !existingSkuGroupKeySet.has(skuGroupKey))
    .map((skuGroupKey) => {
      const created = createItem(payload.stashUuid, skuGroupKey, now)
      records.push(created)
      existingSkuGroupKeySet.add(skuGroupKey)
      return created
    })
  return { candidateItems: buildCandidateStashItems(createdItems) }
}

export function updateCandidateItemRecord(payload: UpdateCandidateItemPayload, ownerUserUuid?: string, companyUuid?: string): UpdateCandidateItemResponse {
  const requiredCompanyUuid = getMockMutationCompanyUuid(companyUuid)
  const item = readCandidateItemRecords().find((row) => row.uuid === payload.itemUuid)
  if (!item || !findCandidateStashForOwner(item.stashUuid, ownerUserUuid, requiredCompanyUuid)) throw new Error('후보 아이템을 찾을 수 없습니다.')
  item.details = requireCandidateDetailsSnapshot(payload.details, item.skuGroupKey, { allowNull: true, companyUuid: requiredCompanyUuid })
  item.isLatestLlmComment = payload.isLatestLlmComment
  item.dbUpdatedAt = new Date().toISOString()
  return toCandidateItemDetail(item)
}

export function uploadCandidateStashExcelFile(file: File, ownerUserUuid = MOCK_ADMIN_USER_UUID, companyUuid?: string): CandidateStashExcelUploadResult {
  const requiredCompanyUuid = getMockMutationCompanyUuid(companyUuid)
  const fileName = file.name.trim()
  if (!fileName || !/\.(xlsx|xls)$/i.test(fileName)) throw new Error('엑셀 파일(.xlsx, .xls)만 업로드할 수 있습니다.')
  if (file.size <= 0) throw new Error('빈 엑셀 파일은 업로드할 수 없습니다.')

  const skuGroupKeys = Object.keys(productPrimaryBySkuGroupKey).slice(0, MOCK_EXCEL_UPLOAD_ITEM_LIMIT)
  if (skuGroupKeys.length === 0) throw new Error('Mock API에 업로드 후보 상품 데이터가 없습니다.')

  const now = new Date().toISOString()
  const stashUuid = makeUuid32()
  const stashName = fileName.replace(/\.(xlsx|xls)$/i, '').trim() || '후보군 업로드'
  readCandidateStashRecords().push({
    uuid: stashUuid,
    name: stashName,
    note: 'Mock Excel upload result',
    userUuid: ownerUserUuid,
    companyUuid: requiredCompanyUuid,
    ...DEFAULT_CANDIDATE_STASH_CONTEXT,
    dbCreatedAt: now,
    dbUpdatedAt: now,
  })
  skuGroupKeys.forEach((skuGroupKey) => readCandidateItemRecords().push(createItem(stashUuid, skuGroupKey, now)))
  return {
    stashUuid,
    stashName,
    itemCount: skuGroupKeys.length,
    warnings: [
      'Mock API는 실제 엑셀 내용을 파싱하지 않고 파일명과 mock catalog로 후보군을 생성합니다.',
      '업로드 기간과 예측 개월 수는 mock 기본 후보군 컨텍스트를 사용합니다.',
    ],
  }
}
