import type { CandidateItemDetail } from '../../../api'

export function assertCandidateItemDetailSnapshotFlag(item: CandidateItemDetail): void {
  const hasSnapshot: boolean = item.confirmedOrderSnapshot != null
  if (item.hasConfirmedOrderSnapshot !== hasSnapshot) {
    throw new Error(`Candidate item snapshot flag mismatch: ${item.uuid}`)
  }
}

export function assertCandidateItemDetailSnapshotFlags(items: CandidateItemDetail[]): void {
  items.forEach(assertCandidateItemDetailSnapshotFlag)
}
