import {
  ORDER_SNAPSHOT_SCHEMA_VERSION,
  type OrderSnapshotCompetitorBasisV2,
  type OrderSnapshotDocumentV2,
  type OrderSnapshotPrimarySummaryV2,
} from './orderSnapshotTypes'

type Obj = Record<string, unknown>
type StockOrderResult = NonNullable<OrderSnapshotDocumentV2['drawer2']['stockOrderResult']>

const PRIMARY_STRING_KEYS = ['productName', 'brand', 'category', 'code', 'colorCode'] as const
const PRIMARY_NUMBER_KEYS = ['price', 'qty', 'availableStock'] as const
const CONTEXT_STRING_KEYS = ['periodStart', 'periodEnd', 'dailyTrendStartMonth'] as const
const CONTEXT_NUMBER_KEYS = ['forecastMonths', 'dailyTrendLeadTimeDays'] as const
const STOCK_RESULT_KEYS = ['trendDailyMean', 'dailyMean', 'sigma'] as const
const STOCK_DISPLAY_TOTAL_KEYS = ['currentStockQtyTotal', 'totalOrderBalanceTotal', 'expectedInboundOrderBalanceTotal'] as const
const STOCK_DISPLAY_SIZE_ROW_QUANTITY_KEYS = ['currentStockQty', 'totalOrderBalance', 'expectedInboundOrderBalance'] as const
type StockOrderDisplaySizeRowQuantityKey = typeof STOCK_DISPLAY_SIZE_ROW_QUANTITY_KEYS[number]
const STOCK_ORDER_AMOUNT_KEYS = ['recommendedOrderQty', 'expectedOrderAmount', 'expectedSalesAmount', 'expectedOpProfit'] as const
const CONFIRMED_TOTAL_KEYS = ['orderQty', 'expectedSalesAmount', 'expectedOpProfit'] as const
const SIZE_ORDER_SHARE_PCT_KEYS = ['selfSharePct', 'competitorSharePct', 'blendedSharePct'] as const
const SIZE_ORDER_QUANTITY_KEYS = ['forecastQty', 'recommendedQty', 'confirmQty'] as const

/** Parse and validate the stored candidate item snapshot at the API boundary without inventing fallback business values. */
export function parseOrderSnapshot(details: unknown): OrderSnapshotDocumentV2 {
  const d = expectRecord(details, 'snapshot')
  if (d.schemaVersion !== ORDER_SNAPSHOT_SCHEMA_VERSION) {
    throw new Error(`snapshot schemaVersion mismatch: ${String(d.schemaVersion)}`)
  }
  const skuGroupKey = expectNonEmptyString(d.skuGroupKey, 'snapshot.skuGroupKey')
  const companyUuid = expectOptionalNonEmptyString(d.companyUuid, 'snapshot.companyUuid')
  const context = normalizeContext(expectRecord(d.context, 'context'))
  const drawer1 = normalizeDrawer1Structure(expectRecord(d.drawer1, 'drawer1'))
  const drawer2 = normalizeDrawer2Structure(expectRecord(d.drawer2, 'drawer2'))
  expectMatchingNumbers(
    context.dailyTrendLeadTimeDays,
    drawer2.stockOrderRequest.leadTimeDays,
    'context.dailyTrendLeadTimeDays',
    'drawer2.stockOrderRequest.leadTimeDays',
  )
  expectMatchingStrings(skuGroupKey, drawer1.summary.skuGroupKey, 'snapshot.skuGroupKey', 'drawer1.summary.skuGroupKey')
  expectMatchingStrings(skuGroupKey, drawer2.competitorBasis.skuGroupKey, 'snapshot.skuGroupKey', 'drawer2.competitorBasis.skuGroupKey')
  return {
    schemaVersion: ORDER_SNAPSHOT_SCHEMA_VERSION,
    skuGroupKey,
    ...optionalField('companyUuid', companyUuid),
    savedAt: expectString(d.savedAt, 'snapshot.savedAt'),
    context,
    drawer1,
    drawer2,
  }
}

function normalizeContext(context: Obj): OrderSnapshotDocumentV2['context'] {
  return {
    ...normalizeStringFields(context, 'context', CONTEXT_STRING_KEYS),
    ...normalizeNumberFields(context, 'context', CONTEXT_NUMBER_KEYS),
  }
}

function normalizeDrawer1Structure(drawer1: Obj): OrderSnapshotDocumentV2['drawer1'] {
  const source = expectRecord(drawer1.summary, 'drawer1.summary')
  const summary: OrderSnapshotPrimarySummaryV2 = {
    skuGroupKey: expectNonEmptyString(source.skuGroupKey, 'drawer1.summary.skuGroupKey'),
    ...normalizeStringFields(source, 'drawer1.summary', PRIMARY_STRING_KEYS),
    ...normalizeNumberFields(source, 'drawer1.summary', PRIMARY_NUMBER_KEYS),
  }
  return { summary }
}

function normalizeDrawer2Structure(drawer2: Obj): OrderSnapshotDocumentV2['drawer2'] {
  const sizeOrders = normalizeSizeOrders(drawer2.sizeOrders)
  const stockOrderResult = normalizeOptionalStockOrderResult(drawer2.stockOrderResult, sizeOrders)
  const unitEconomics = normalizeOptionalUnitEconomics(drawer2.unitEconomics)
  const confirmedTotals = normalizeConfirmedTotals(drawer2.confirmedTotals)
  expectConfirmedTotalsMatchSizeOrders(confirmedTotals, sizeOrders)
  return {
    competitorBasis: normalizeCompetitorBasis(expectRecord(drawer2.competitorBasis, 'drawer2.competitorBasis')),
    competitorChannelId: expectString(drawer2.competitorChannelId, 'drawer2.competitorChannelId'),
    competitorChannelLabel: expectString(drawer2.competitorChannelLabel, 'drawer2.competitorChannelLabel'),
    stockOrderRequest: normalizeStockOrderRequest(drawer2.stockOrderRequest),
    ...optionalField('stockOrderResult', stockOrderResult),
    ...optionalField('unitEconomics', unitEconomics),
    selfWeightPct: expectNumberInRange(drawer2.selfWeightPct, 'drawer2.selfWeightPct', 0, 100),
    bufferStock: expectNumber(drawer2.bufferStock, 'drawer2.bufferStock'),
    aiComment: normalizeAiComment(drawer2.aiComment),
    confirmedTotals,
    sizeOrders,
  }
}

function normalizeCompetitorBasis(basis: Obj): OrderSnapshotCompetitorBasisV2 {
  return {
    skuGroupKey: expectNonEmptyString(basis.skuGroupKey, 'drawer2.competitorBasis.skuGroupKey'),
    competitorPrice: expectNumber(basis.competitorPrice, 'drawer2.competitorBasis.competitorPrice'),
    competitorQty: expectNumber(basis.competitorQty, 'drawer2.competitorBasis.competitorQty'),
    competitorRatioBySize: normalizeCompetitorRatioBySize(basis.competitorRatioBySize),
  }
}

function normalizeCompetitorRatioBySize(value: unknown): OrderSnapshotCompetitorBasisV2['competitorRatioBySize'] {
  const source = expectRecord(value, 'drawer2.competitorBasis.competitorRatioBySize')
  return Object.fromEntries(
    Object.entries(source).map(([size, ratio]) => [
      size,
      expectNumberInRange(ratio, `drawer2.competitorBasis.competitorRatioBySize.${size}`, 0, 1),
    ]),
  )
}

function normalizeStockOrderRequest(value: unknown): OrderSnapshotDocumentV2['drawer2']['stockOrderRequest'] {
  const label = 'drawer2.stockOrderRequest'
  const source = expectRecord(value, label)
  return {
    ...normalizeStringFields(source, label, ['currentOrderInboundDueDate', 'nextOrderInboundDueDate'] as const),
    leadTimeDays: expectNumber(source.leadTimeDays, `${label}.leadTimeDays`),
    ...(source.dailyMeanOverride === undefined
      ? {}
      : { dailyMeanOverride: expectNumber(source.dailyMeanOverride, `${label}.dailyMeanOverride`) }),
  }
}

function normalizeOptionalUnitEconomics(value: unknown): OrderSnapshotDocumentV2['drawer2']['unitEconomics'] {
  if (value === undefined) return undefined
  const label = 'drawer2.unitEconomics'
  const source = expectRecord(value, label)
  return {
    unitPrice: expectNumber(source.unitPrice, `${label}.unitPrice`),
    unitCost: expectNumber(source.unitCost, `${label}.unitCost`),
    expectedFeeRatePct: expectNumberInRange(source.expectedFeeRatePct, `${label}.expectedFeeRatePct`, 0, 100),
  }
}

function normalizeAiComment(value: unknown): OrderSnapshotDocumentV2['drawer2']['aiComment'] {
  const source = expectRecord(value, 'drawer2.aiComment')
  return {
    ...normalizeStringFields(source, 'drawer2.aiComment', ['prompt', 'answer'] as const),
    generatedAt: expectStringOrNull(source.generatedAt, 'drawer2.aiComment.generatedAt'),
  }
}

function normalizeOptionalStockOrderResult(
  value: unknown,
  sizeOrders: OrderSnapshotDocumentV2['drawer2']['sizeOrders'],
): OrderSnapshotDocumentV2['drawer2']['stockOrderResult'] {
  if (value === undefined) return undefined
  const source = expectRecord(value, 'drawer2.stockOrderResult')
  return {
    ...normalizeNumberFields(source, 'drawer2.stockOrderResult', STOCK_RESULT_KEYS),
    display: normalizeStockOrderDisplay(source.display, sizeOrders),
    safetyStockCalc: normalizeStockOrderAmountBlock(source.safetyStockCalc, 'safetyStockCalc', false),
    forecastQtyCalc: normalizeStockOrderAmountBlock(source.forecastQtyCalc, 'forecastQtyCalc', true),
  }
}

function normalizeStockOrderDisplay(
  value: unknown,
  sizeOrders: OrderSnapshotDocumentV2['drawer2']['sizeOrders'],
): StockOrderResult['display'] {
  const label = 'drawer2.stockOrderResult.display'
  const source = expectRecord(value, label)
  const sizeRows = normalizeStockOrderDisplaySizeRows(source.sizeRows, sizeOrders)
  const display = {
    ...normalizeNumberFields(source, label, STOCK_DISPLAY_TOTAL_KEYS),
    sizeRows,
  }
  expectStockOrderDisplayTotalsMatchRows(display, label)
  return display
}

function normalizeStockOrderDisplaySizeRows(
  value: unknown,
  sizeOrders: OrderSnapshotDocumentV2['drawer2']['sizeOrders'],
): StockOrderResult['display']['sizeRows'] {
  const label = 'drawer2.stockOrderResult.display.sizeRows'
  const sizeOrderSizes = new Set(sizeOrders.map((row) => row.size))
  const rows = expectArray(value, label).map((row, index) => {
    const rowLabel = `${label}[${index}]`
    const source = expectRecord(row, rowLabel)
    return {
      size: expectNonEmptyString(source.size, `${rowLabel}.size`),
      ...normalizeNumberFields(source, rowLabel, STOCK_DISPLAY_SIZE_ROW_QUANTITY_KEYS),
    }
  })
  expectUniqueSizes(rows, label)
  expectSameSizeSet(rows, sizeOrderSizes, label, 'drawer2.sizeOrders')
  return rows
}

function normalizeStockOrderAmountBlock<K extends 'safetyStockCalc' | 'forecastQtyCalc'>(value: unknown, key: K, nullableSafetyStock: boolean): StockOrderResult[K] {
  const label = `drawer2.stockOrderResult.${key}`
  const source = expectRecord(value, label)
  if (nullableSafetyStock && source.safetyStock !== null) throw new Error(`${label}.safetyStock must be null`)
  return {
    safetyStock: nullableSafetyStock ? null : expectNumber(source.safetyStock, `${label}.safetyStock`),
    ...normalizeNumberFields(source, label, STOCK_ORDER_AMOUNT_KEYS),
  } as StockOrderResult[K]
}

function normalizeConfirmedTotals(value: unknown): OrderSnapshotDocumentV2['drawer2']['confirmedTotals'] {
  const label = 'drawer2.confirmedTotals'
  const source = expectRecord(value, label)
  return {
    ...normalizeNumberFields(source, label, CONFIRMED_TOTAL_KEYS),
    expectedOpProfitRatePct: expectNumberOrNull(source.expectedOpProfitRatePct, `${label}.expectedOpProfitRatePct`),
  }
}

function normalizeSizeOrders(value: unknown): OrderSnapshotDocumentV2['drawer2']['sizeOrders'] {
  const rows = expectArray(value, 'drawer2.sizeOrders').map((row, index) => {
    const label = `drawer2.sizeOrders[${index}]`
    const source = expectRecord(row, label)
    return {
      size: expectNonEmptyString(source.size, `${label}.size`),
      ...normalizeNumberFieldsInRange(source, label, SIZE_ORDER_SHARE_PCT_KEYS, 0, 100),
      ...normalizeNumberFields(source, label, SIZE_ORDER_QUANTITY_KEYS),
    }
  })
  expectUniqueSizes(rows, 'drawer2.sizeOrders')
  return rows
}

function expectConfirmedTotalsMatchSizeOrders(
  confirmedTotals: OrderSnapshotDocumentV2['drawer2']['confirmedTotals'],
  sizeOrders: OrderSnapshotDocumentV2['drawer2']['sizeOrders'],
): void {
  const expectedOrderQty = sizeOrders.reduce((sum, row) => sum + row.confirmQty, 0)
  expectMatchingNumbers(
    confirmedTotals.orderQty,
    expectedOrderQty,
    'drawer2.confirmedTotals.orderQty',
    'sum(drawer2.sizeOrders[].confirmQty)',
  )
}

function expectStockOrderDisplayTotalsMatchRows(
  display: StockOrderResult['display'],
  label: string,
): void {
  const currentStockQtySum = sumStockOrderDisplayRows(display.sizeRows, 'currentStockQty')
  const totalOrderBalanceSum = sumStockOrderDisplayRows(display.sizeRows, 'totalOrderBalance')
  const expectedInboundOrderBalanceSum = sumStockOrderDisplayRows(display.sizeRows, 'expectedInboundOrderBalance')
  expectMatchingNumbers(display.currentStockQtyTotal, currentStockQtySum, `${label}.currentStockQtyTotal`, `sum(${label}.sizeRows[].currentStockQty)`)
  expectMatchingNumbers(display.totalOrderBalanceTotal, totalOrderBalanceSum, `${label}.totalOrderBalanceTotal`, `sum(${label}.sizeRows[].totalOrderBalance)`)
  expectMatchingNumbers(display.expectedInboundOrderBalanceTotal, expectedInboundOrderBalanceSum, `${label}.expectedInboundOrderBalanceTotal`, `sum(${label}.sizeRows[].expectedInboundOrderBalance)`)
}

function sumStockOrderDisplayRows(
  rows: StockOrderResult['display']['sizeRows'],
  key: StockOrderDisplaySizeRowQuantityKey,
): number {
  return rows.reduce((sum, row) => sum + Number(row[key]), 0)
}

function normalizeStringFields<K extends string>(source: Obj, label: string, keys: readonly K[]): Record<K, string> {
  return Object.fromEntries(keys.map((key) => [key, expectString(source[key], `${label}.${key}`)])) as Record<K, string>
}

function optionalField<K extends string, V>(key: K, value: V | undefined): Partial<Record<K, V>> {
  return value === undefined ? {} : { [key]: value } as Record<K, V>
}

function normalizeNumberFields<K extends string>(source: Obj, label: string, keys: readonly K[]): Record<K, number> {
  return Object.fromEntries(keys.map((key) => [key, expectNumber(source[key], `${label}.${key}`)])) as Record<K, number>
}

function normalizeNumberFieldsInRange<K extends string>(
  source: Obj,
  label: string,
  keys: readonly K[],
  min: number,
  max: number,
): Record<K, number> {
  return Object.fromEntries(
    keys.map((key) => [key, expectNumberInRange(source[key], `${label}.${key}`, min, max)]),
  ) as Record<K, number>
}

function expectRecord(value: unknown, label: string): Obj {
  if (value == null || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${label} must be an object`)
  return value as Obj
}

function expectArray(value: unknown, label: string): unknown[] {
  if (!Array.isArray(value)) throw new Error(`${label} must be an array`)
  return value
}

function expectUniqueSizes(rows: Array<{ size: string }>, label: string): void {
  const seen = new Set<string>()
  for (const row of rows) {
    if (seen.has(row.size)) throw new Error(`${label} contains duplicate size: ${row.size}`)
    seen.add(row.size)
  }
}

function expectSameSizeSet(
  rows: Array<{ size: string }>,
  expectedSizes: Set<string>,
  label: string,
  expectedLabel: string,
): void {
  if (rows.length !== expectedSizes.size) {
    throw new Error(`${label} sizes must match ${expectedLabel}`)
  }
  for (const row of rows) {
    if (!expectedSizes.has(row.size)) {
      throw new Error(`${label}.${row.size} must exist in ${expectedLabel}`)
    }
  }
}

function expectString(value: unknown, label: string): string {
  if (typeof value !== 'string') throw new Error(`${label} must be a string`)
  return value
}

function expectNonEmptyString(value: unknown, label: string): string {
  const text = expectString(value, label)
  if (!text) throw new Error(`${label} is missing`)
  return text
}

function expectOptionalNonEmptyString(value: unknown, label: string): string | undefined {
  return value === undefined ? undefined : expectNonEmptyString(value, label)
}

function expectNumber(value: unknown, label: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error(`${label} must be a finite number`)
  return value
}

function expectNumberInRange(value: unknown, label: string, min: number, max: number): number {
  const number = expectNumber(value, label)
  if (number < min || number > max) throw new Error(`${label} must be between ${min} and ${max}`)
  return number
}

function expectMatchingNumbers(left: number, right: number, leftLabel: string, rightLabel: string): void {
  if (Math.abs(left - right) > Number.EPSILON) {
    throw new Error(`${leftLabel} must match ${rightLabel}`)
  }
}

function expectMatchingStrings(left: string, right: string, leftLabel: string, rightLabel: string): void {
  if (left !== right) {
    throw new Error(`${leftLabel} must match ${rightLabel}`)
  }
}

function expectNumberOrNull(value: unknown, label: string): number | null {
  return value === null ? null : expectNumber(value, label)
}

function expectStringOrNull(value: unknown, label: string): string | null {
  return value === null ? null : expectString(value, label)
}
