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
  expectRecord(d.drawer1, 'drawer1')
  validateDrawer2(expectRecord(d.drawer2, 'drawer2'))
  return details as OrderSnapshotDocumentV1
}

function validateDrawer2(drawer2: Record<string, unknown>) {
  expectRecord(drawer2.secondary, 'drawer2.secondary')
  expectString(drawer2.competitorChannelId, 'drawer2.competitorChannelId')
  expectString(drawer2.competitorChannelLabel, 'drawer2.competitorChannelLabel')
  expectFiniteNumber(drawer2.bufferStock, 'drawer2.bufferStock')
  expectFiniteNumber(drawer2.selfWeightPct, 'drawer2.selfWeightPct')
  expectString(drawer2.llmPrompt, 'drawer2.llmPrompt')
  expectString(drawer2.llmAnswer, 'drawer2.llmAnswer')

  const stockInputs = expectRecord(drawer2.stockInputs, 'drawer2.stockInputs')
  expectString(stockInputs.leadTimeStartDate, 'drawer2.stockInputs.leadTimeStartDate')
  expectString(stockInputs.leadTimeEndDate, 'drawer2.stockInputs.leadTimeEndDate')
  expectFiniteNumber(stockInputs.dailyMean, 'drawer2.stockInputs.dailyMean')

  const sizeRows = expectArray(drawer2.sizeRows, 'drawer2.sizeRows')
  if (sizeRows.length === 0) throw new Error('drawer2.sizeRows is empty')
  for (const [index, row] of sizeRows.entries()) {
    const sizeRow = expectRecord(row, `drawer2.sizeRows[${index}]`)
    expectString(sizeRow.size, `drawer2.sizeRows[${index}].size`)
    expectNonNegativeNumber(sizeRow.confirmQty, `drawer2.sizeRows[${index}].confirmQty`)
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

function expectString(value: unknown, label: string) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${label} must be a non-empty string`)
  }
}

function expectFiniteNumber(value: unknown, label: string) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`${label} must be a finite number`)
  }
}

function expectNonNegativeNumber(value: unknown, label: string) {
  expectFiniteNumber(value, label)
  if ((value as number) < 0) throw new Error(`${label} must be a non-negative number`)
}
