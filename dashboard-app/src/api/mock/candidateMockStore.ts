import type {
  CandidateItemListResult,
  CandidateRecommendationResult,
  CandidateStashSummary,
} from '../types'
import {
  buildCandidateItemSummaries,
  buildCandidateReferenceItem,
  buildCandidateStashItems,
  hasCandidateRecommendationBadge,
  type CandidateDataReferencePeriod,
} from './candidateItemSummaryBuilder'
import { seededCandidateItems, seededCandidateStashes } from './candidateSeeds'
import { isMockRecordInCompanyScope } from './mockCompanyScope'
import { type CandidateItemRecord, type CandidateStashRecord } from './records'
import { allKnownSkuGroupKeys } from './salesTables'
import { makeUuid32 } from './utils'

export interface DataReferencePeriodParams {
  dataReferencePeriodStart: string
  dataReferencePeriodEnd: string
}

export function readCandidateStashRecords(): CandidateStashRecord[] {
  return seededCandidateStashes
}

export function readCandidateItemRecords(): CandidateItemRecord[] {
  return seededCandidateItems
}

export function filterCandidateStashesForOwner(
  rows: CandidateStashRecord[],
  ownerUserUuid?: string,
  companyUuid?: string,
): CandidateStashRecord[] {
  return rows
    .filter((row: CandidateStashRecord) : boolean => (ownerUserUuid ? row.userUuid === ownerUserUuid : true))
    .filter((row: CandidateStashRecord) : boolean => isMockRecordInCompanyScope(row.companyUuid, companyUuid))
}

export function findCandidateStashForOwner(
  stashUuid: string,
  ownerUserUuid?: string,
  companyUuid?: string,
): CandidateStashRecord | null {
  const stash: CandidateStashRecord | null = readCandidateStashRecords().find((row: CandidateStashRecord) : boolean => row.uuid === stashUuid) ?? null
  if (!stash) return null
  if (ownerUserUuid && stash.userUuid !== ownerUserUuid) return null
  if (!isMockRecordInCompanyScope(stash.companyUuid, companyUuid)) return null
  return stash
}

export function readCandidateItemsForStash(
  stashUuid: string,
  ownerUserUuid?: string,
  companyUuid?: string,
): CandidateItemRecord[] {
  if (!findCandidateStashForOwner(stashUuid, ownerUserUuid, companyUuid)) return []
  return readCandidateItemRecords().filter((row: CandidateItemRecord) : boolean => row.stashUuid === stashUuid)
}

export function toCandidateStashSummary(
  row: CandidateStashRecord,
  itemCount: number,
  dbUpdatedAt: string = row.dbUpdatedAt ?? row.dbCreatedAt,
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

export function buildCandidateListParamsPeriod({
  dataReferencePeriodStart,
  dataReferencePeriodEnd,
}: DataReferencePeriodParams): CandidateDataReferencePeriod {
  return {
    start: dataReferencePeriodStart,
    end: dataReferencePeriodEnd,
  }
}

export function buildCandidateItemListResult(
  records: CandidateItemRecord[],
  period: CandidateDataReferencePeriod,
  includeOrderMetrics: boolean = false,
  companyUuid?: string,
): CandidateItemListResult {
  return {
    candidateItems: buildCandidateStashItems(records),
    items: buildCandidateItemSummaries(records, period, {
      includeRecommendationInsights: false,
      includeOrderMetrics,
      companyUuid,
    }),
  }
}

export function buildCandidateRecommendationResult(
  period: CandidateDataReferencePeriod,
  limit: number = 50,
  cursor?: string,
  companyUuid?: string,
): CandidateRecommendationResult {
  const startIndex: number = cursor ? Math.max(0, Number(cursor) || 0) : 0
  const pageSize: number = Math.max(1, limit)
  const recommendations: CandidateRecommendationResult['recommendations'] = []
  let nextCursor: string | null = null

  for (let index: number = startIndex; index < allKnownSkuGroupKeys.length; index += 1) {
    const skuGroupKey: string = allKnownSkuGroupKeys[index]
    if (!skuGroupKey || !hasCandidateRecommendationBadge(skuGroupKey, companyUuid)) continue

    if (recommendations.length >= pageSize) {
      nextCursor = String(index)
      break
    }
    recommendations.push(buildCandidateReferenceItem(skuGroupKey, period, companyUuid))
  }

  return {
    recommendations,
    nextCursor,
  }
}

export function createCandidateItemRecord(
  stashUuid: string,
  skuGroupKey: string,
  now: string,
  overrides: Partial<Pick<CandidateItemRecord, 'confirmedOrderSnapshot' | 'isLatestLlmComment'>> = {},
): CandidateItemRecord {
  return {
    uuid: makeUuid32(),
    stashUuid,
    skuUuid: skuGroupKey,
    skuGroupKey,
    confirmedOrderSnapshot: overrides.confirmedOrderSnapshot ?? null,
    isLatestLlmComment: overrides.isLatestLlmComment ?? false,
    dbCreatedAt: now,
    dbUpdatedAt: now,
  }
}
