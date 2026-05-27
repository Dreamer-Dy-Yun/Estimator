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
const UNIT_ECONOMICS_KEYS = ['unitPrice', 'unitCost', 'expectedFeeRatePct'] as const
const STOCK_RESULT_KEYS = ['trendDailyMean', 'dailyMean', 'sigma'] as const
const STOCK_DISPLAY_TOTAL_KEYS = ['currentStockQtyTotal', 'totalOrderBalanceTotal', 'expectedInboundOrderBalanceTotal'] as const
const STOCK_DISPLAY_ARRAY_KEYS = ['currentStockQtyBySize', 'totalOrderBalanceBySize', 'expectedInboundOrderBalanceBySize'] as const
const STOCK_ORDER_AMOUNT_KEYS = ['recommendedOrderQty', 'expectedOrderAmount', 'expectedSalesAmount', 'expectedOpProfit'] as const
const CONFIRMED_TOTAL_KEYS = ['orderQty', 'expectedSalesAmount', 'expectedOpProfit'] as const
const SIZE_ORDER_NUMBER_KEYS = ['selfSharePct', 'competitorSharePct', 'blendedSharePct', 'forecastQty', 'recommendedQty', 'confirmQty'] as const

/** Parse and validate the stored candidate item snapshot at the API boundary without inventing fallback business values. */
export function parseOrderSnapshot(details: unknown): OrderSnapshotDocumentV2 {
  const d = expectRecord(details, 'snapshot')
  if (d.schemaVersion !== ORDER_SNAPSHOT_SCHEMA_VERSION) {
    throw new Error(`snapshot schemaVersion mismatch: ${String(d.schemaVersion)}`)
  }
  const companyUuid = expectOptionalNonEmptyString(d.companyUuid, 'snapshot.companyUuid')
  return {
    schemaVersion: ORDER_SNAPSHOT_SCHEMA_VERSION,
    skuGroupKey: expectNonEmptyString(d.skuGroupKey, 'snapshot.skuGroupKey'),
    ...optionalField('companyUuid', companyUuid),
    savedAt: expectString(d.savedAt, 'snapshot.savedAt'),
    context: normalizeContext(expectRecord(d.context, 'context')),
    drawer1: normalizeDrawer1Structure(expectRecord(d.drawer1, 'drawer1')),
    drawer2: normalizeDrawer2Structure(expectRecord(d.drawer2, 'drawer2')),
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
  const stockOrderResult = normalizeOptionalStockOrderResult(drawer2.stockOrderResult)
  const unitEconomics = normalizeOptionalUnitEconomics(drawer2.unitEconomics)
  const confirmedTotals = normalizeOptionalConfirmedTotals(drawer2.confirmedTotals)
  return {
    competitorBasis: normalizeCompetitorBasis(expectRecord(drawer2.competitorBasis, 'drawer2.competitorBasis')),
    competitorChannelId: expectString(drawer2.competitorChannelId, 'drawer2.competitorChannelId'),
    competitorChannelLabel: expectString(drawer2.competitorChannelLabel, 'drawer2.competitorChannelLabel'),
    stockOrderRequest: normalizeStockOrderRequest(drawer2.stockOrderRequest),
    ...optionalField('stockOrderResult', stockOrderResult),
    ...optionalField('unitEconomics', unitEconomics),
    selfWeightPct: expectNumber(drawer2.selfWeightPct, 'drawer2.selfWeightPct'),
    bufferStock: expectNumber(drawer2.bufferStock, 'drawer2.bufferStock'),
    aiComment: normalizeAiComment(drawer2.aiComment),
    ...optionalField('confirmedTotals', confirmedTotals),
    sizeOrders: normalizeSizeOrders(drawer2.sizeOrders),
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
      expectNumber(ratio, `drawer2.competitorBasis.competitorRatioBySize.${size}`),
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
  return normalizeNumberFields(expectRecord(value, 'drawer2.unitEconomics'), 'drawer2.unitEconomics', UNIT_ECONOMICS_KEYS)
}

function normalizeAiComment(value: unknown): OrderSnapshotDocumentV2['drawer2']['aiComment'] {
  const source = expectRecord(value, 'drawer2.aiComment')
  return normalizeStringFields(source, 'drawer2.aiComment', ['prompt', 'answer'] as const)
}

function normalizeOptionalStockOrderResult(value: unknown): OrderSnapshotDocumentV2['drawer2']['stockOrderResult'] {
  if (value === undefined) return undefined
  const source = expectRecord(value, 'drawer2.stockOrderResult')
  return {
    ...normalizeNumberFields(source, 'drawer2.stockOrderResult', STOCK_RESULT_KEYS),
    display: normalizeStockOrderDisplay(source.display),
    safetyStockCalc: normalizeStockOrderAmountBlock(source.safetyStockCalc, 'safetyStockCalc', false),
    forecastQtyCalc: normalizeStockOrderAmountBlock(source.forecastQtyCalc, 'forecastQtyCalc', true),
  }
}

function normalizeStockOrderDisplay(value: unknown): StockOrderResult['display'] {
  const label = 'drawer2.stockOrderResult.display'
  const source = expectRecord(value, label)
  return {
    ...normalizeNumberFields(source, label, STOCK_DISPLAY_TOTAL_KEYS),
    ...normalizeNumberArrayFields(source, label, STOCK_DISPLAY_ARRAY_KEYS),
  }
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

function normalizeOptionalConfirmedTotals(value: unknown): OrderSnapshotDocumentV2['drawer2']['confirmedTotals'] {
  if (value === undefined) return undefined
  const label = 'drawer2.confirmedTotals'
  const source = expectRecord(value, label)
  return {
    ...normalizeNumberFields(source, label, CONFIRMED_TOTAL_KEYS),
    expectedOpProfitRatePct: expectNumberOrNull(source.expectedOpProfitRatePct, `${label}.expectedOpProfitRatePct`),
  }
}

function normalizeSizeOrders(value: unknown): OrderSnapshotDocumentV2['drawer2']['sizeOrders'] {
  return expectArray(value, 'drawer2.sizeOrders').map((row, index) => {
    const label = `drawer2.sizeOrders[${index}]`
    const source = expectRecord(row, label)
    return {
      size: expectString(source.size, `${label}.size`),
      ...normalizeNumberFields(source, label, SIZE_ORDER_NUMBER_KEYS),
    }
  })
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

function normalizeNumberArrayFields<K extends string>(source: Obj, label: string, keys: readonly K[]): Record<K, number[]> {
  return Object.fromEntries(keys.map((key) => [key, normalizeNumberArray(source[key], `${label}.${key}`)])) as Record<K, number[]>
}

function normalizeNumberArray(value: unknown, label: string): number[] {
  return expectArray(value, label).map((item, index) => expectNumber(item, `${label}[${index}]`))
}

function expectRecord(value: unknown, label: string): Obj {
  if (value == null || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${label} must be an object`)
  return value as Obj
}

function expectArray(value: unknown, label: string): unknown[] {
  if (!Array.isArray(value)) throw new Error(`${label} must be an array`)
  return value
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

function expectNumberOrNull(value: unknown, label: string): number | null {
  return value === null ? null : expectNumber(value, label)
}
