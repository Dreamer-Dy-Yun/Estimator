import type { CandidateItemDetail } from '../types'
import type { CandidateItemRecord } from './records'

export function toCandidateItemDetail(row: CandidateItemRecord): CandidateItemDetail {
  return {
    uuid: row.uuid,
    stashUuid: row.stashUuid,
    skuUuid: row.skuUuid,
    skuGroupKey: row.skuGroupKey,
    confirmedOrderSnapshot: row.confirmedOrderSnapshot,
    hasConfirmedOrderSnapshot: row.confirmedOrderSnapshot != null,
    isLatestLlmComment: row.isLatestLlmComment,
    dbCreatedAt: row.dbCreatedAt,
    dbUpdatedAt: row.dbUpdatedAt ?? row.dbCreatedAt,
  }
}

export function buildCandidateItemStatsByStash(items: CandidateItemRecord[]) : Map<string, { count: number; latestItemTs: string; }> {
  const stats: Map<string, { count: number; latestItemTs: string; }> = new Map<string, { count: number; latestItemTs: string }>()
  for (const item of items) {
    const current: { count: number; latestItemTs: string; } | undefined = stats.get(item.stashUuid)
    const dbCreatedAt: string = String(item.dbCreatedAt)
    if (!current) {
      stats.set(item.stashUuid, { count: 1, latestItemTs: dbCreatedAt })
      continue
    }
    current.count += 1
    if (dbCreatedAt > current.latestItemTs) current.latestItemTs = dbCreatedAt
  }
  return stats
}
