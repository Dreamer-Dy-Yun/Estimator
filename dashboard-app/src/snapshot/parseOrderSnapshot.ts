import type {
  OrderSnapshotBaseSubject,
  OrderSnapshotComparisonBasis,
  OrderSnapshotComparisonSubject,
  OrderSnapshotConfirmed,
  OrderSnapshotConfirmedRound,
  OrderSnapshotDocument,
  OrderSnapshotDrawer1,
  OrderSnapshotDrawer2,
  OrderSnapshotMonthlySalesTrendPoint,
  OrderSnapshotPrimarySummary,
  OrderSnapshotSizeOrder,
  OrderSnapshotStockOrderDisplaySizeRow,
  OrderSnapshotStockOrderResult,
  OrderSnapshotUnitEconomics,
} from './orderSnapshotTypes'
import { ORDER_SNAPSHOT_SCHEMA_VERSION } from './orderSnapshotTypes'

export type Obj = Record<string, unknown>
export type StockOrderResult = NonNullable<OrderSnapshotDocument['drawer2']['stockOrderResult']>

const PRIMARY_STRING_KEYS = ['productName', 'brand', 'category', 'code', 'colorCode'] as const
const PRIMARY_NUMBER_KEYS = ['price', 'qty', 'availableStock'] as const
const CONTEXT_STRING_KEYS = ['periodStart', 'periodEnd', 'dailyTrendStartMonth'] as const
const CONTEXT_NUMBER_KEYS = ['forecastMonths', 'dailyTrendLeadTimeDays'] as const
const STOCK_RESULT_KEYS = ['trendDailyMean', 'dailyMean', 'sigma'] as const
const STOCK_DISPLAY_TOTAL_KEYS = ['currentStockQtyTotal', 'totalOrderBalanceTotal', 'expectedInboundOrderBalanceTotal'] as const
const STOCK_DISPLAY_SIZE_ROW_QUANTITY_KEYS = ['currentStockQty', 'totalOrderBalance', 'expectedInboundOrderBalance'] as const
export type StockOrderDisplaySizeRowQuantityKey = typeof STOCK_DISPLAY_SIZE_ROW_QUANTITY_KEYS[number]
const SIZE_ORDER_SHARE_PCT_KEYS = ['baseSharePct', 'comparisonSharePct', 'blendedSharePct'] as const
const SIZE_ORDER_QUANTITY_KEYS = ['forecastQty', 'recommendedQty'] as const

export function parseOrderSnapshot(details: unknown): OrderSnapshotDocument {
  const d: Obj = expectRecord(details, 'snapshot')
  if (d.schemaVersion !== ORDER_SNAPSHOT_SCHEMA_VERSION) {
    throw new Error('snapshot schemaVersion mismatch: ' + String(d.schemaVersion))
  }
  const skuGroupKey: string = expectNonEmptyString(d.skuGroupKey, 'snapshot.skuGroupKey')
  const context: OrderSnapshotDocument['context'] = normalizeContext(expectRecord(d.context, 'context'))
  const drawer1: OrderSnapshotDrawer1 = normalizeDrawer1Structure(expectRecord(d.drawer1, 'drawer1'))
  const drawer2: OrderSnapshotDrawer2 = normalizeDrawer2Structure(expectRecord(d.drawer2, 'drawer2'))
  expectMatchingNumbers(context.dailyTrendLeadTimeDays, drawer2.stockOrderRequest.leadTimeDays, 'context.dailyTrendLeadTimeDays', 'drawer2.stockOrderRequest.leadTimeDays')
  expectMatchingStrings(skuGroupKey, drawer1.summary.skuGroupKey, 'snapshot.skuGroupKey', 'drawer1.summary.skuGroupKey')
  expectMatchingStrings(skuGroupKey, drawer2.comparisonBasis.skuGroupKey, 'snapshot.skuGroupKey', 'drawer2.comparisonBasis.skuGroupKey')
  return {
    schemaVersion: ORDER_SNAPSHOT_SCHEMA_VERSION,
    skuGroupKey,
    savedAt: expectString(d.savedAt, 'snapshot.savedAt'),
    context,
    drawer1,
    drawer2,
  }
}

function normalizeContext(context: Obj): OrderSnapshotDocument['context'] {
  return {
    ...normalizeStringFields(context, 'context', CONTEXT_STRING_KEYS),
    ...normalizeNumberFields(context, 'context', CONTEXT_NUMBER_KEYS),
  }
}

function normalizeDrawer1Structure(drawer1: Obj): OrderSnapshotDocument['drawer1'] {
  const source: Obj = expectRecord(drawer1.summary, 'drawer1.summary')
  const summary: OrderSnapshotPrimarySummary = {
    skuGroupKey: expectNonEmptyString(source.skuGroupKey, 'drawer1.summary.skuGroupKey'),
    ...normalizeStringFields(source, 'drawer1.summary', PRIMARY_STRING_KEYS),
    ...normalizeNumberFields(source, 'drawer1.summary', PRIMARY_NUMBER_KEYS),
  }
  return {
    summary,
    monthlySalesTrend: normalizeMonthlySalesTrend(drawer1.monthlySalesTrend),
  }
}

function normalizeMonthlySalesTrend(value: unknown): OrderSnapshotMonthlySalesTrendPoint[] {
  const label = 'drawer1.monthlySalesTrend' as const
  return expectArray(value, label).map((point: unknown, index: number): OrderSnapshotMonthlySalesTrendPoint => {
    const pointLabel: string = label + '[' + index + ']'
    const pointSource: Obj = expectRecord(point, pointLabel)
    return {
      idx: expectNumber(pointSource.idx, pointLabel + '.idx'),
      actual: expectNumberOrNull(pointSource.actual, pointLabel + '.actual'),
      comparisonActual: expectNumberOrNull(pointSource.comparisonActual, pointLabel + '.comparisonActual'),
      forecastLink: expectNumberOrNull(pointSource.forecastLink, pointLabel + '.forecastLink'),
      date: expectNonEmptyString(pointSource.date, pointLabel + '.date'),
      isForecast: expectBoolean(pointSource.isForecast, pointLabel + '.isForecast'),
      sales: expectNumber(pointSource.sales, pointLabel + '.sales'),
      comparisonSales: expectNumberOrNull(pointSource.comparisonSales, pointLabel + '.comparisonSales'),
    }
  })
}

function normalizeDrawer2Structure(drawer2: Obj): OrderSnapshotDocument['drawer2'] {
  const sizeOrders: OrderSnapshotSizeOrder[] = normalizeSizeOrders(drawer2.sizeOrders)
  const stockOrderResult: OrderSnapshotStockOrderResult | undefined = normalizeOptionalStockOrderResult(drawer2.stockOrderResult, sizeOrders)
  const unitEconomics: OrderSnapshotUnitEconomics | undefined = normalizeOptionalUnitEconomics(drawer2.unitEconomics)
  const confirmed: OrderSnapshotConfirmed = normalizeConfirmed(drawer2.confirmed, sizeOrders)
  return {
    baseSubject: normalizeBaseSubject(expectRecord(drawer2.baseSubject, 'drawer2.baseSubject')),
    comparisonSubject: normalizeComparisonSubject(expectRecord(drawer2.comparisonSubject, 'drawer2.comparisonSubject')),
    comparisonBasis: normalizeComparisonBasis(expectRecord(drawer2.comparisonBasis, 'drawer2.comparisonBasis')),
    stockOrderRequest: normalizeStockOrderRequest(drawer2.stockOrderRequest),
    ...optionalField('stockOrderResult', stockOrderResult),
    ...optionalField('unitEconomics', unitEconomics),
    selfWeightPct: expectNumberInRange(drawer2.selfWeightPct, 'drawer2.selfWeightPct', 0, 100),
    bufferStock: expectNumber(drawer2.bufferStock, 'drawer2.bufferStock'),
    aiComment: normalizeAiComment(drawer2.aiComment),
    confirmed,
    sizeOrders,
  }
}

function normalizeBaseSubject(subject: Obj): OrderSnapshotBaseSubject {
  const role: string = expectString(subject.role, 'drawer2.baseSubject.role')
  const kind: string = expectString(subject.kind, 'drawer2.baseSubject.kind')
  if (role !== 'base') throw new Error('drawer2.baseSubject.role must be base')
  if (kind !== 'self-company') throw new Error('drawer2.baseSubject.kind must be self-company')
  return {
    role: 'base',
    kind: 'self-company',
    ...optionalField('sourceId', expectOptionalNonEmptyString(subject.sourceId, 'drawer2.baseSubject.sourceId')),
  }
}

function normalizeComparisonSubject(subject: Obj): OrderSnapshotComparisonSubject {
  return normalizeComparisonSubjectWithLabel(subject, 'drawer2.comparisonSubject')
}

function normalizeComparisonSubjectWithLabel(subject: Obj, label: string): OrderSnapshotComparisonSubject {
  const role: string = expectString(subject.role, label + '.role')
  const kind: string = expectString(subject.kind, label + '.kind')
  if (role !== 'comparison') throw new Error(label + '.role must be comparison')
  if (kind !== 'self-company' && kind !== 'competitor-channel') throw new Error(label + '.kind is invalid')
  const sourceId: string | undefined = expectOptionalNonEmptyString(subject.sourceId, label + '.sourceId')
  if (kind === 'competitor-channel' && sourceId == null) throw new Error(label + '.sourceId is required')
  return {
    role: 'comparison',
    kind,
    id: expectNonEmptyString(subject.id, label + '.id'),
    label: expectNonEmptyString(subject.label, label + '.label'),
    ...optionalField('sourceId', sourceId),
  } as OrderSnapshotComparisonSubject
}

function normalizeComparisonBasis(basis: Obj): OrderSnapshotComparisonBasis {
  return {
    skuGroupKey: expectNonEmptyString(basis.skuGroupKey, 'drawer2.comparisonBasis.skuGroupKey'),
    comparisonPrice: expectNumber(basis.comparisonPrice, 'drawer2.comparisonBasis.comparisonPrice'),
    comparisonQty: expectNumber(basis.comparisonQty, 'drawer2.comparisonBasis.comparisonQty'),
    comparisonRatioBySize: normalizeComparisonRatioBySize(basis.comparisonRatioBySize),
  }
}

function normalizeComparisonRatioBySize(value: unknown): OrderSnapshotComparisonBasis['comparisonRatioBySize'] {
  const source: Obj = expectRecord(value, 'drawer2.comparisonBasis.comparisonRatioBySize')
  return Object.fromEntries(Object.entries(source).map(([size, ratio]: [string, unknown]) : [string, number] => [
    size,
    expectNumberInRange(ratio, 'drawer2.comparisonBasis.comparisonRatioBySize.' + size, 0, 1),
  ]))
}

function normalizeStockOrderRequest(value: unknown): OrderSnapshotDocument['drawer2']['stockOrderRequest'] {
  const label = 'drawer2.stockOrderRequest' as const
  const source: Obj = expectRecord(value, label)
  return {
    ...normalizeStringFields(source, label, ['currentOrderInboundDueDate', 'nextOrderInboundDueDate'] as const),
    leadTimeDays: expectNumber(source.leadTimeDays, label + '.leadTimeDays'),
    ...(source.dailyMeanOverride === undefined ? {} : { dailyMeanOverride: expectNumber(source.dailyMeanOverride, label + '.dailyMeanOverride') }),
  }
}

function normalizeOptionalUnitEconomics(value: unknown): OrderSnapshotDocument['drawer2']['unitEconomics'] {
  if (value === undefined) return undefined
  const label = 'drawer2.unitEconomics' as const
  const source: Obj = expectRecord(value, label)
  return {
    unitPrice: expectNumber(source.unitPrice, label + '.unitPrice'),
    unitCost: expectNumber(source.unitCost, label + '.unitCost'),
    expectedFeeRatePct: expectNumberInRange(source.expectedFeeRatePct, label + '.expectedFeeRatePct', 0, 100),
  }
}

function normalizeAiComment(value: unknown): OrderSnapshotDocument['drawer2']['aiComment'] {
  const source: Obj = expectRecord(value, 'drawer2.aiComment')
  return {
    ...normalizeStringFields(source, 'drawer2.aiComment', ['prompt', 'answer'] as const),
    generatedAt: expectStringOrNull(source.generatedAt, 'drawer2.aiComment.generatedAt'),
  }
}

function normalizeOptionalStockOrderResult(value: unknown, sizeOrders: OrderSnapshotDocument['drawer2']['sizeOrders']): OrderSnapshotDocument['drawer2']['stockOrderResult'] {
  if (value === undefined) return undefined
  const source: Obj = expectRecord(value, 'drawer2.stockOrderResult')
  return {
    ...normalizeNumberFields(source, 'drawer2.stockOrderResult', STOCK_RESULT_KEYS),
    display: normalizeStockOrderDisplay(source.display, sizeOrders),
  }
}

function normalizeStockOrderDisplay(value: unknown, sizeOrders: OrderSnapshotDocument['drawer2']['sizeOrders']): StockOrderResult['display'] {
  const label = 'drawer2.stockOrderResult.display' as const
  const source: Obj = expectRecord(value, label)
  const sizeRows: OrderSnapshotStockOrderDisplaySizeRow[] = normalizeStockOrderDisplaySizeRows(source.sizeRows, sizeOrders)
  const display = {
    ...normalizeNumberFields(source, label, STOCK_DISPLAY_TOTAL_KEYS),
    sizeRows,
  }
  expectStockOrderDisplayTotalsMatchRows(display, label)
  return display
}

function normalizeStockOrderDisplaySizeRows(value: unknown, sizeOrders: OrderSnapshotDocument['drawer2']['sizeOrders']): StockOrderResult['display']['sizeRows'] {
  const label = 'drawer2.stockOrderResult.display.sizeRows' as const
  const sizeOrderSizes: Set<string> = new Set(sizeOrders.map((row: OrderSnapshotSizeOrder) : string => row.size))
  const rows = expectArray(value, label).map((row: unknown, index: number) : OrderSnapshotStockOrderDisplaySizeRow => {
    const rowLabel: string = label + '[' + index + ']'
    const source: Obj = expectRecord(row, rowLabel)
    return {
      size: expectNonEmptyString(source.size, rowLabel + '.size'),
      ...normalizeNumberFields(source, rowLabel, STOCK_DISPLAY_SIZE_ROW_QUANTITY_KEYS),
    }
  })
  expectUniqueSizes(rows, label)
  expectSameSizeSet(rows, sizeOrderSizes, label, 'drawer2.sizeOrders')
  return rows
}

function normalizeConfirmed(value: unknown, sizeOrders: OrderSnapshotDocument['drawer2']['sizeOrders']): OrderSnapshotConfirmed {
  const label = 'drawer2.confirmed' as const
  const source: Obj = expectRecord(value, label)
  const sizeOrderSizes: Set<string> = new Set(sizeOrders.map((row: OrderSnapshotSizeOrder): string => row.size))
  const rounds: OrderSnapshotConfirmedRound[] = expectArray(source.rounds, label + '.rounds').map((row: unknown, index: number): OrderSnapshotConfirmedRound => {
    const rowLabel: string = label + '.rounds[' + index + ']'
    const round: Obj = expectRecord(row, rowLabel)
    return {
      date: expectNonEmptyString(round.date, rowLabel + '.date'),
      qtyBySize: normalizeConfirmedQtyBySize(round.qtyBySize, rowLabel + '.qtyBySize', sizeOrderSizes),
    }
  })
  if (sizeOrders.length > 0 && rounds.length === 0) throw new Error(label + '.rounds must not be empty when drawer2.sizeOrders is not empty')
  return { rounds }
}

function normalizeConfirmedQtyBySize(value: unknown, label: string, expectedSizes: Set<string>): Record<string, number> {
  const source: Obj = expectRecord(value, label)
  const rows: Array<{ size: string }> = Object.keys(source).map((size: string): { size: string } => ({ size }))
  expectSameSizeSet(rows, expectedSizes, label, 'drawer2.sizeOrders')
  return Object.fromEntries(Object.entries(source).map(([size, qty]: [string, unknown]): [string, number] => [
    size,
    expectNumberInRange(qty, label + '.' + size, 0, Number.MAX_SAFE_INTEGER),
  ]))
}

function normalizeSizeOrders(value: unknown): OrderSnapshotDocument['drawer2']['sizeOrders'] {
  const rows = expectArray(value, 'drawer2.sizeOrders').map((row: unknown, index: number) : OrderSnapshotSizeOrder => {
    const label: string = 'drawer2.sizeOrders[' + index + ']'
    const source: Obj = expectRecord(row, label)
    return {
      size: expectNonEmptyString(source.size, label + '.size'),
      ...normalizeNumberFieldsInRange(source, label, SIZE_ORDER_SHARE_PCT_KEYS, 0, 100),
      ...normalizeNumberFields(source, label, SIZE_ORDER_QUANTITY_KEYS),
    }
  })
  expectUniqueSizes(rows, 'drawer2.sizeOrders')
  return rows
}

function expectStockOrderDisplayTotalsMatchRows(display: StockOrderResult['display'], label: string): void {
  expectMatchingNumbers(display.currentStockQtyTotal, sumStockOrderDisplayRows(display.sizeRows, 'currentStockQty'), label + '.currentStockQtyTotal', 'sum(' + label + '.sizeRows[].currentStockQty)')
  expectMatchingNumbers(display.totalOrderBalanceTotal, sumStockOrderDisplayRows(display.sizeRows, 'totalOrderBalance'), label + '.totalOrderBalanceTotal', 'sum(' + label + '.sizeRows[].totalOrderBalance)')
  expectMatchingNumbers(display.expectedInboundOrderBalanceTotal, sumStockOrderDisplayRows(display.sizeRows, 'expectedInboundOrderBalance'), label + '.expectedInboundOrderBalanceTotal', 'sum(' + label + '.sizeRows[].expectedInboundOrderBalance)')
}

function sumStockOrderDisplayRows(rows: StockOrderResult['display']['sizeRows'], key: StockOrderDisplaySizeRowQuantityKey): number {
  return rows.reduce((sum: number, row: OrderSnapshotStockOrderDisplaySizeRow) : number => sum + Number(row[key]), 0)
}

function normalizeStringFields<K extends string>(source: Obj, label: string, keys: readonly K[]): Record<K, string> {
  return Object.fromEntries(keys.map((key: K) : [K, string] => [key, expectString(source[key], label + '.' + key)])) as Record<K, string>
}

function optionalField<K extends string, V>(key: K, value: V | undefined): Partial<Record<K, V>> {
  return value === undefined ? {} : { [key]: value } as Record<K, V>
}

function normalizeNumberFields<K extends string>(source: Obj, label: string, keys: readonly K[]): Record<K, number> {
  return Object.fromEntries(keys.map((key: K) : [K, number] => [key, expectNumber(source[key], label + '.' + key)])) as Record<K, number>
}

function normalizeNumberFieldsInRange<K extends string>(source: Obj, label: string, keys: readonly K[], min: number, max: number): Record<K, number> {
  return Object.fromEntries(keys.map((key: K) : [K, number] => [key, expectNumberInRange(source[key], label + '.' + key, min, max)])) as Record<K, number>
}

function expectRecord(value: unknown, label: string): Obj {
  if (value == null || typeof value !== 'object' || Array.isArray(value)) throw new Error(label + ' must be an object')
  return value as Obj
}

function expectArray(value: unknown, label: string): unknown[] {
  if (!Array.isArray(value)) throw new Error(label + ' must be an array')
  return value
}

function expectUniqueSizes(rows: Array<{ size: string }>, label: string): void {
  const seen: Set<string> = new Set<string>()
  for (const row of rows) {
    if (seen.has(row.size)) throw new Error(label + ' contains duplicate size: ' + row.size)
    seen.add(row.size)
  }
}

function expectSameSizeSet(rows: Array<{ size: string }>, expectedSizes: Set<string>, label: string, expectedLabel: string): void {
  if (rows.length !== expectedSizes.size) throw new Error(label + ' sizes must match ' + expectedLabel)
  for (const row of rows) {
    if (!expectedSizes.has(row.size)) throw new Error(label + '.' + row.size + ' must exist in ' + expectedLabel)
  }
}

function expectString(value: unknown, label: string): string {
  if (typeof value !== 'string') throw new Error(label + ' must be a string')
  return value
}

function expectNonEmptyString(value: unknown, label: string): string {
  const text: string = expectString(value, label)
  if (!text) throw new Error(label + ' is missing')
  return text
}

function expectOptionalNonEmptyString(value: unknown, label: string): string | undefined {
  return value === undefined ? undefined : expectNonEmptyString(value, label)
}

function expectNumber(value: unknown, label: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error(label + ' must be a finite number')
  return value
}

function expectNumberOrNull(value: unknown, label: string): number | null {
  return value === null ? null : expectNumber(value, label)
}

function expectBoolean(value: unknown, label: string): boolean {
  if (typeof value !== 'boolean') throw new Error(label + ' must be a boolean')
  return value
}

function expectNumberInRange(value: unknown, label: string, min: number, max: number): number {
  const number: number = expectNumber(value, label)
  if (number < min || number > max) throw new Error(label + ' must be between ' + min + ' and ' + max)
  return number
}

function expectMatchingNumbers(left: number, right: number, leftLabel: string, rightLabel: string): void {
  if (Math.abs(left - right) > Number.EPSILON) throw new Error(leftLabel + ' must match ' + rightLabel)
}

function expectMatchingStrings(left: string, right: string, leftLabel: string, rightLabel: string): void {
  if (left !== right) throw new Error(leftLabel + ' must match ' + rightLabel)
}

function expectStringOrNull(value: unknown, label: string): string | null {
  return value === null ? null : expectString(value, label)
}
