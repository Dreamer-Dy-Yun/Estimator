export function normalizeCandidateItemUuids(candidateItemUuids: readonly string[]): string[] {
  return [...new Set(candidateItemUuids)].sort()
}

export function buildCandidateOrderMetricRequestSignature({
  stashUuid,
  dataReferencePeriodStart,
  dataReferencePeriodEnd,
  comparisonKey,
  seq,
  candidateItemUuids,
}: {
  stashUuid: string
  dataReferencePeriodStart: string
  dataReferencePeriodEnd: string
  comparisonKey: string
  seq: number
  candidateItemUuids: readonly string[]
}): string {
  return [stashUuid, dataReferencePeriodStart, dataReferencePeriodEnd, comparisonKey, seq, normalizeCandidateItemUuids(candidateItemUuids).join(',')].join(':')
}

export function createPendingMetricItemUuidSet(candidateItemUuids: readonly string[]): Set<string> {
  return new Set(normalizeCandidateItemUuids(candidateItemUuids))
}

export function settlePendingMetricItem(pendingItemUuids: Set<string>, itemUuid: string): boolean {
  pendingItemUuids.delete(itemUuid)
  return pendingItemUuids.size === 0
}
