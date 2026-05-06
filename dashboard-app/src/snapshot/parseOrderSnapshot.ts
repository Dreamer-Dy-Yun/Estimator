import type { SecondaryOrderSnapshotPayload } from '../api/types/snapshot'
import { ORDER_SNAPSHOT_SCHEMA_VERSION, type OrderSnapshotDocumentV1 } from './orderSnapshotTypes'

/** 후보군·저장 JSON을 엄격 파싱. 누락/구버전은 예외를 던진다. */
export function parseOrderSnapshot(
  details: SecondaryOrderSnapshotPayload | null | undefined,
): OrderSnapshotDocumentV1 {
  if (!details || typeof details !== 'object') throw new Error('스냅샷 본문 누락')
  const d = details as Record<string, unknown>
  if (d.schemaVersion !== ORDER_SNAPSHOT_SCHEMA_VERSION) {
    throw new Error(`스냅샷 버전 불일치: ${String(d.schemaVersion)}`)
  }
  if (d.drawer1 == null || d.drawer2 == null) throw new Error('스냅샷 drawer 누락')
  if (typeof d.productId !== 'string' || !d.productId) throw new Error('스냅샷 productId 누락')
  return details as OrderSnapshotDocumentV1
}
