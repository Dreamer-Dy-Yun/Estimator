import type { CandidateItemSummary } from '../../../api'

export function removeCandidateItemsByUuid(
  items: CandidateItemSummary[],
  itemUuids: string[],
): CandidateItemSummary[] {
  if (!items.length || !itemUuids.length) return items
  const deleteUuidSet = new Set(itemUuids)
  const nextItems = items.filter((item) => !deleteUuidSet.has(item.uuid))
  return nextItems.length === items.length ? items : nextItems
}
