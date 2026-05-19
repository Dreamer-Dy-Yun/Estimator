import type { CandidateItemDetail } from '../types'
import type { CandidateItemRecord } from './records'

export function toCandidateItemDetail(row: CandidateItemRecord): CandidateItemDetail {
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

export function buildCandidateItemStatsByStash(items: CandidateItemRecord[]) {
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
