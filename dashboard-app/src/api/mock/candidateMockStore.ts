import type {
  CandidateItemListResult,
  CandidateStashSummary,
} from '../types'
import {
  buildCandidateItemSummaries,
  buildCandidateReferenceItems,
  buildCandidateStashItems,
  type CandidateDataReferencePeriod,
} from './candidateItemSummaryBuilder'
import { seededCandidateItems, seededCandidateStashes } from './candidateSeeds'
import { type CandidateItemRecord, type CandidateStashRecord } from './records'
import { allKnownSkuGroupKeys } from './salesTables'
import { makeUuid32 } from './utils'

interface DataReferencePeriodParams {
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
): CandidateStashRecord[] {
  if (!ownerUserUuid) return rows
  return rows.filter((row) => row.userUuid === ownerUserUuid)
}

export function findCandidateStashForOwner(stashUuid: string, ownerUserUuid?: string): CandidateStashRecord | null {
  const stash = readCandidateStashRecords().find((row) => row.uuid === stashUuid) ?? null
  if (!stash) return null
  if (ownerUserUuid && stash.userUuid !== ownerUserUuid) return null
  return stash
}

export function readCandidateItemsForStash(stashUuid: string, ownerUserUuid?: string): CandidateItemRecord[] {
  if (!findCandidateStashForOwner(stashUuid, ownerUserUuid)) return []
  return readCandidateItemRecords().filter((row) => row.stashUuid === stashUuid)
}

export function toCandidateStashSummary(
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
  includeOrderMetrics = false,
): CandidateItemListResult {
  return {
    referenceItems: buildCandidateReferenceItems(allKnownSkuGroupKeys, period),
    candidateItems: buildCandidateStashItems(records),
    items: buildCandidateItemSummaries(records, period, { includeOrderMetrics }),
  }
}

export function createCandidateItemRecord(
  stashUuid: string,
  skuGroupKey: string,
  now: string,
  overrides: Partial<Pick<CandidateItemRecord, 'details' | 'isLatestLlmComment'>> = {},
): CandidateItemRecord {
  return {
    uuid: makeUuid32(),
    stashUuid,
    skuUuid: skuGroupKey,
    skuGroupKey,
    details: overrides.details ?? null,
    isLatestLlmComment: overrides.isLatestLlmComment ?? false,
    dbCreatedAt: now,
    dbUpdatedAt: now,
  }
}
