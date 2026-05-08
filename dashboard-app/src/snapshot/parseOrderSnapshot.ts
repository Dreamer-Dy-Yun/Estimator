import { ORDER_SNAPSHOT_SCHEMA_VERSION, type OrderSnapshotDocumentV1 } from './orderSnapshotTypes'

/** Parse and validate the stored candidate item snapshot at the API boundary. */
export function parseOrderSnapshot(
  details: unknown,
): OrderSnapshotDocumentV1 {
  const d = expectRecord(details, 'snapshot')
  if (d.schemaVersion !== ORDER_SNAPSHOT_SCHEMA_VERSION) {
    throw new Error(`snapshot schemaVersion mismatch: ${String(d.schemaVersion)}`)
  }
  if (typeof d.productId !== 'string' || !d.productId) throw new Error('snapshot productId is missing')
  validateDrawer1Structure(expectRecord(d.drawer1, 'drawer1'))
  expectRecord(d.context, 'context')
  validateDrawer2Structure(expectRecord(d.drawer2, 'drawer2'))
  return details as OrderSnapshotDocumentV1
}

function validateDrawer1Structure(drawer1: Record<string, unknown>) {
  expectRecord(drawer1.summary, 'drawer1.summary')
}

function validateDrawer2Structure(drawer2: Record<string, unknown>) {
  expectRecord(drawer2.secondary, 'drawer2.secondary')
  expectRecord(drawer2.salesSelf, 'drawer2.salesSelf')
  expectRecord(drawer2.salesCompetitor, 'drawer2.salesCompetitor')
  expectRecord(drawer2.stockInputs, 'drawer2.stockInputs')
  expectRecord(drawer2.stockDerived, 'drawer2.stockDerived')
  const sizeRows = expectArray(drawer2.sizeRows, 'drawer2.sizeRows')
  for (const [index, row] of sizeRows.entries()) {
    expectRecord(row, `drawer2.sizeRows[${index}]`)
  }
}

function expectRecord(value: unknown, label: string): Record<string, unknown> {
  if (value == null || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${label} must be an object`)
  }
  return value as Record<string, unknown>
}

function expectArray(value: unknown, label: string): unknown[] {
  if (!Array.isArray(value)) throw new Error(`${label} must be an array`)
  return value
}
