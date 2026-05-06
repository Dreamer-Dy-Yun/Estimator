import { CANDIDATE_ITEM_STORAGE_KEY, CANDIDATE_STASH_STORAGE_KEY } from './constants'
import { ensureCandidateSeed } from './candidateSeeds'
import { ensureMockAiCommentForSnapshot } from './orderSnapshotForCandidate'
import type { CandidateItemRecord, CandidateStashRecord } from './records'

function readJsonArray<T>(key: string): T[] {
  const raw = localStorage.getItem(key)
  return (raw ? JSON.parse(raw) : []) as T[]
}

export function readCandidateStashRecords(): CandidateStashRecord[] {
  ensureCandidateSeed()
  return readJsonArray<CandidateStashRecord>(CANDIDATE_STASH_STORAGE_KEY)
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
