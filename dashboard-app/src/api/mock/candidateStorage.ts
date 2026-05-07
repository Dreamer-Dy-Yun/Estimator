import { CANDIDATE_ITEM_STORAGE_KEY, CANDIDATE_STASH_STORAGE_KEY } from './constants'
import { ensureCandidateSeed } from './candidateSeeds'
import { ensureMockAiCommentForSnapshot } from './orderSnapshotForCandidate'
import {
  DEFAULT_CANDIDATE_STASH_CONTEXT,
  type CandidateItemRecord,
  type CandidateStashRecord,
} from './records'

function readJsonArray<T>(key: string): T[] {
  const raw = localStorage.getItem(key)
  return (raw ? JSON.parse(raw) : []) as T[]
}

export function readCandidateStashRecords(): CandidateStashRecord[] {
  ensureCandidateSeed()
  const records = readJsonArray<Partial<CandidateStashRecord>>(CANDIDATE_STASH_STORAGE_KEY)
  let changed = false
  const normalized = records.map((record) => {
    const now = new Date().toISOString()
    const rawForecastMonths = Number(record.forecastMonths)
    const forecastMonths = Number.isFinite(rawForecastMonths)
      ? Math.max(1, Math.min(24, Math.round(rawForecastMonths)))
      : DEFAULT_CANDIDATE_STASH_CONTEXT.forecastMonths
    const next: CandidateStashRecord = {
      uuid: String(record.uuid ?? ''),
      name: String(record.name ?? ''),
      note: record.note ?? null,
      productId: String(record.productId ?? ''),
      periodStart: record.periodStart?.trim() || DEFAULT_CANDIDATE_STASH_CONTEXT.periodStart,
      periodEnd: record.periodEnd?.trim() || DEFAULT_CANDIDATE_STASH_CONTEXT.periodEnd,
      forecastMonths,
      dbCreatedAt: String(record.dbCreatedAt ?? now),
      dbUpdatedAt: String(record.dbUpdatedAt ?? record.dbCreatedAt ?? now),
    }
    changed ||= next.periodStart !== record.periodStart
      || next.periodEnd !== record.periodEnd
      || next.forecastMonths !== record.forecastMonths
    return next
  })
  if (changed) writeCandidateStashRecords(normalized)
  return normalized
}

export function readCandidateItemRecords(): CandidateItemRecord[] {
  ensureCandidateSeed()
  return readJsonArray<CandidateItemRecord>(CANDIDATE_ITEM_STORAGE_KEY)
}

export function readCandidateItemsForStash(stashUuid: string): CandidateItemRecord[] {
  return readCandidateItemRecords().filter((row) => row.stashUuid === stashUuid)
}

export function writeCandidateStashRecords(records: CandidateStashRecord[]) {
  localStorage.setItem(CANDIDATE_STASH_STORAGE_KEY, JSON.stringify(records))
}

export function writeCandidateItemRecords(records: CandidateItemRecord[]) {
  localStorage.setItem(CANDIDATE_ITEM_STORAGE_KEY, JSON.stringify(records))
}

export function setCandidateItemLlmCommentState(itemUuid: string, isLatestLlmComment: boolean) {
  const items = readCandidateItemRecords()
  const idx = items.findIndex((row) => row.uuid === itemUuid)
  if (idx === -1) return
  const prev = items[idx]!
  items[idx] = {
    ...prev,
    details: isLatestLlmComment ? ensureMockAiCommentForSnapshot(prev.details) : prev.details,
    isLatestLlmComment,
  }
  writeCandidateItemRecords(items)
}
