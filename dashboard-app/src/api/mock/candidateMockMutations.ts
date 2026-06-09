import type { OrderSnapshotDocument } from '../types'
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

const MOCK_EXCEL_UPLOAD_ITEM_LIMIT = 3 as const

function requireCandidateStashForMutation(stashUuid: string, ownerUserUuid?: string, companyUuid?: string): CandidateStashRecord {
  const requiredCompanyUuid: string = getMockMutationCompanyUuid(companyUuid)
  const stash: CandidateStashRecord | null = findCandidateStashForOwner(stashUuid, ownerUserUuid, requiredCompanyUuid)
  if (!stash || stash.companyUuid !== requiredCompanyUuid) throw new Error('후보군을 찾을 수 없습니다.')
  return stash
}

function requireStashName(name: string): string {
  const trimmed: string = name.trim()
  if (!trimmed) throw new Error('후보군 이름을 입력하세요.')
  return trimmed
}

function assertCreatePayload(payload: CreateCandidateStashPayload): void {
  if (!payload.periodStart || !payload.periodEnd) throw new Error('후보군 기간을 입력하세요.')
  if (payload.periodStart > payload.periodEnd) throw new Error('후보군 시작일은 종료일보다 늦을 수 없습니다.')
  if (!Number.isFinite(payload.forecastMonths) || payload.forecastMonths <= 0) throw new Error('예측 개월 수는 1 이상이어야 합니다.')
}

function requireSkuGroupKeys(skuGroupKeys: string[]): string[] {
  const unique: string[] = [...new Set(skuGroupKeys)]
  if (unique.length === 0) throw new Error('추가할 상품이 없습니다.')
  if (unique.some((skuGroupKey: string) : boolean => !skuGroupKey.trim())) throw new Error('추가할 상품 키가 비어 있습니다.')
  const unknownProduct: string | undefined = unique.find((skuGroupKey: string) : boolean => !productPrimaryBySkuGroupKey[skuGroupKey])
  if (unknownProduct) throw new Error(`상품을 찾을 수 없습니다: ${unknownProduct}`)
  return unique
}

function requireItemUuidSet(itemUuids: string[]): Set<string> {
  if (itemUuids.length === 0) throw new Error('삭제할 후보 아이템이 없습니다.')
  if (itemUuids.some((itemUuid: string) : boolean => !itemUuid.trim())) throw new Error('삭제할 후보 아이템 ID가 비어 있습니다.')
  return new Set(itemUuids)
}

function createItem(stashUuid: string, skuGroupKey: string, now: string, overrides?: Partial<Pick<CandidateItemRecord, 'details' | 'isLatestLlmComment'>>) : CandidateItemRecord {
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

  const snapshot: OrderSnapshotDocument = parseOrderSnapshot(details)
  if (snapshot.skuGroupKey !== skuGroupKey) {
    throw new Error(`Candidate item details skuGroupKey mismatch: ${snapshot.skuGroupKey} !== ${skuGroupKey}`)
  }
  if (snapshot.drawer2.baseSubject.sourceId !== options.companyUuid) {
    throw new Error(`Candidate item details baseSubject sourceId mismatch: ${snapshot.drawer2.baseSubject.sourceId} !== ${options.companyUuid}`)
  }
  return snapshot
}

export function deleteCandidateItemRecord(itemUuid: string, ownerUserUuid?: string, companyUuid?: string): void {
  const requiredCompanyUuid: string = getMockMutationCompanyUuid(companyUuid)
  const records: CandidateItemRecord[] = readCandidateItemRecords()
  const index: number = records.findIndex((item: CandidateItemRecord) : boolean => item.uuid === itemUuid)
  const item: CandidateItemRecord = records[index]
  if (!item || !findCandidateStashForOwner(item.stashUuid, ownerUserUuid, requiredCompanyUuid)) throw new Error('후보 아이템을 찾을 수 없습니다.')
  records.splice(index, 1)
}

export function deleteCandidateItemRecords(stashUuid: string, itemUuids: string[], ownerUserUuid?: string, companyUuid?: string): void {
  requireCandidateStashForMutation(stashUuid, ownerUserUuid, companyUuid)
  const uuidSet: Set<string> = requireItemUuidSet(itemUuids)
  const records: CandidateItemRecord[] = readCandidateItemRecords()
  if ([...uuidSet].some((itemUuid: string) : boolean => !records.some((row: CandidateItemRecord) : boolean => row.uuid === itemUuid && row.stashUuid === stashUuid))) {
    throw new Error('후보군에 포함되지 않은 후보 아이템이 있습니다.')
  }
  for (let index: number = records.length - 1; index >= 0; index -= 1) {
    if (records[index].stashUuid === stashUuid && uuidSet.has(records[index].uuid)) records.splice(index, 1)
  }
}

export function deleteCandidateStashRecord(stashUuid: string, ownerUserUuid?: string, companyUuid?: string): void {
  const target: CandidateStashRecord = requireCandidateStashForMutation(stashUuid, ownerUserUuid, companyUuid)
  const stashes: CandidateStashRecord[] = readCandidateStashRecords()
  const stashIndex: number = stashes.findIndex((row: CandidateStashRecord) : boolean => row.uuid === target.uuid)
  if (stashIndex >= 0) stashes.splice(stashIndex, 1)
  const items: CandidateItemRecord[] = readCandidateItemRecords()
  for (let index: number = items.length - 1; index >= 0; index -= 1) {
    if (items[index].stashUuid === target.uuid) items.splice(index, 1)
  }
}

export function createCandidateStashSummary(payload: CreateCandidateStashPayload, ownerUserUuid: string = MOCK_ADMIN_USER_UUID): CandidateStashSummary {
  const now: string = new Date().toISOString()
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
  const target: CandidateStashRecord = requireCandidateStashForMutation(payload.stashUuid, ownerUserUuid, companyUuid)
  target.name = requireStashName(payload.name)
  target.note = payload.note?.trim() || null
  target.dbUpdatedAt = new Date().toISOString()
  return toCandidateStashSummary(target, readCandidateItemRecords().filter((item: CandidateItemRecord) : boolean => item.stashUuid === target.uuid).length)
}

export function duplicateCandidateStashRecord(sourceStashUuid: string, ownerUserUuid?: string, companyUuid?: string): void {
  const source: CandidateStashRecord = requireCandidateStashForMutation(sourceStashUuid, ownerUserUuid, companyUuid)
  const now: string = new Date().toISOString()
  const duplicatedStashUuid: string = makeUuid32()
  readCandidateStashRecords().push({ ...source, uuid: duplicatedStashUuid, name: `${source.name} 복사본`, dbCreatedAt: now, dbUpdatedAt: now })
  readCandidateItemRecords()
    .filter((row: CandidateItemRecord) : boolean => row.stashUuid === source.uuid)
    .forEach((item: CandidateItemRecord) : number => readCandidateItemRecords().push(createItem(duplicatedStashUuid, item.skuGroupKey, now, {
      details: item.details,
      isLatestLlmComment: item.isLatestLlmComment,
    })))
}

export function appendCandidateItemRecord(payload: AppendCandidateItemPayload, ownerUserUuid?: string, companyUuid?: string): void {
  const stash: CandidateStashRecord = requireCandidateStashForMutation(payload.stashUuid, ownerUserUuid, companyUuid ?? payload.companyUuid)
  requireSkuGroupKeys([payload.skuGroupKey])
  const records: CandidateItemRecord[] = readCandidateItemRecords()
  if (records.some((row: CandidateItemRecord) : boolean => row.stashUuid === payload.stashUuid && row.skuGroupKey === payload.skuGroupKey)) throw new Error('이미 후보군에 포함된 상품입니다.')
  records.push(createItem(payload.stashUuid, payload.skuGroupKey, new Date().toISOString(), {
    details: requireCandidateDetailsSnapshot(payload.details, payload.skuGroupKey, { allowNull: false, companyUuid: stash.companyUuid }),
    isLatestLlmComment: payload.isLatestLlmComment,
  }))
}

export function appendCandidateItemsToStash(payload: AppendCandidateItemsPayload, ownerUserUuid?: string, companyUuid?: string): AppendCandidateItemsResponse {
  requireCandidateStashForMutation(payload.stashUuid, ownerUserUuid, companyUuid)
  const records: CandidateItemRecord[] = readCandidateItemRecords()
  const existingSkuGroupKeySet: Set<string> = new Set(records.filter((row: CandidateItemRecord) : boolean => row.stashUuid === payload.stashUuid).map((row: CandidateItemRecord) : string => row.skuGroupKey))
  const now: string = new Date().toISOString()
  const createdItems: CandidateItemRecord[] = requireSkuGroupKeys(payload.skuGroupKeys)
    .filter((skuGroupKey: string) : boolean => !existingSkuGroupKeySet.has(skuGroupKey))
    .map((skuGroupKey: string) : CandidateItemRecord => {
      const created: CandidateItemRecord = createItem(payload.stashUuid, skuGroupKey, now)
      records.push(created)
      existingSkuGroupKeySet.add(skuGroupKey)
      return created
    })
  return { candidateItems: buildCandidateStashItems(createdItems) }
}

export function updateCandidateItemRecord(payload: UpdateCandidateItemPayload, ownerUserUuid?: string, companyUuid?: string): UpdateCandidateItemResponse {
  const requiredCompanyUuid: string = getMockMutationCompanyUuid(companyUuid)
  const item: CandidateItemRecord | undefined = readCandidateItemRecords().find((row: CandidateItemRecord) : boolean => row.uuid === payload.itemUuid)
  if (!item || !findCandidateStashForOwner(item.stashUuid, ownerUserUuid, requiredCompanyUuid)) throw new Error('후보 아이템을 찾을 수 없습니다.')
  item.details = requireCandidateDetailsSnapshot(payload.details, item.skuGroupKey, { allowNull: true, companyUuid: requiredCompanyUuid })
  item.isLatestLlmComment = payload.isLatestLlmComment
  item.dbUpdatedAt = new Date().toISOString()
  return toCandidateItemDetail(item)
}

export function uploadCandidateStashExcelFile(file: File, ownerUserUuid: string = MOCK_ADMIN_USER_UUID, companyUuid?: string): CandidateStashExcelUploadResult {
  const requiredCompanyUuid: string = getMockMutationCompanyUuid(companyUuid)
  const fileName: string = file.name.trim()
  if (!fileName || !/\.(xlsx|xls)$/i.test(fileName)) throw new Error('엑셀 파일(.xlsx, .xls)만 업로드할 수 있습니다.')
  if (file.size <= 0) throw new Error('빈 엑셀 파일은 업로드할 수 없습니다.')

  const skuGroupKeys: string[] = Object.keys(productPrimaryBySkuGroupKey).slice(0, MOCK_EXCEL_UPLOAD_ITEM_LIMIT)
  if (skuGroupKeys.length === 0) throw new Error('Mock API에 업로드 후보 상품 데이터가 없습니다.')

  const now: string = new Date().toISOString()
  const stashUuid: string = makeUuid32()
  const stashName: string = fileName.replace(/\.(xlsx|xls)$/i, '').trim() || '후보군 업로드'
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
  skuGroupKeys.forEach((skuGroupKey: string) : number => readCandidateItemRecords().push(createItem(stashUuid, skuGroupKey, now)))
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
