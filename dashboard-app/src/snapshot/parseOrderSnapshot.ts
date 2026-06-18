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
export type StockOrderResult = OrderSnapshotDocument['drawer2']['stockOrderResult']
const LEGACY_SCHEMA_VERSION_4 = 4 as const
const LEGACY_SCHEMA_VERSION_5 = 5 as const
const LEGACY_SCHEMA_VERSION_6 = 6 as const
const LEGACY_SCHEMA_VERSION_7 = 7 as const

const PRIMARY_STRING_KEYS = ['productName', 'brand', 'category', 'code', 'colorCode'] as const
const PRIMARY_NUMBER_KEYS = ['price', 'qty', 'availableStock'] as const
const CONTEXT_STRING_KEYS = ['periodStart', 'periodEnd', 'dailyTrendStartMonth'] as const
const STOCK_RESULT_KEYS = ['trendDailyMean', 'dailyMean', 'sigma'] as const
const STOCK_DISPLAY_TOTAL_KEYS = ['currentStockQtyTotal', 'totalOrderBalanceTotal', 'expectedInboundOrderBalanceTotal'] as const
const STOCK_DISPLAY_SIZE_ROW_QUANTITY_KEYS = ['currentStockQty', 'totalOrderBalance', 'expectedInboundOrderBalance'] as const
export type StockOrderDisplaySizeRowQuantityKey = typeof STOCK_DISPLAY_SIZE_ROW_QUANTITY_KEYS[number]
const SIZE_ORDER_SHARE_PCT_KEYS = ['baseSharePct', 'comparisonSharePct', 'blendedSharePct'] as const
const SIZE_ORDER_QUANTITY_KEYS = ['forecastQty', 'recommendedQty'] as const

export function parseOrderSnapshot(snapshotInput: unknown): OrderSnapshotDocument {
  const d: Obj = expectRecord(snapshotInput, 'snapshot')
  const isLegacySnapshot: boolean =
    d.schemaVersion === LEGACY_SCHEMA_VERSION_6 ||
    d.schemaVersion === LEGACY_SCHEMA_VERSION_5 ||
    d.schemaVersion === LEGACY_SCHEMA_VERSION_4 ||
    d.schemaVersion === LEGACY_SCHEMA_VERSION_7
  if (
    d.schemaVersion !== ORDER_SNAPSHOT_SCHEMA_VERSION &&
    !isLegacySnapshot
  ) {
    throw new Error('snapshot schemaVersion mismatch: ' + String(d.schemaVersion))
  }
  const skuGroupKey: string = expectNonEmptyString(d.skuGroupKey, 'snapshot.skuGroupKey')
  const context: OrderSnapshotDocument['context'] = normalizeContext(expectRecord(d.context, 'context'))
  const drawer1: OrderSnapshotDrawer1 = normalizeDrawer1Structure(expectRecord(d.drawer1, 'drawer1'))
  const drawer2: OrderSnapshotDrawer2 = normalizeDrawer2Structure(expectRecord(d.drawer2, 'drawer2'), drawer1.summary, isLegacySnapshot)
  expectMatchingNumbers(context.dailyTrendForecastDays, drawer2.stockOrderRequest.orderCoverageDays, 'context.dailyTrendForecastDays', 'drawer2.stockOrderRequest.orderCoverageDays')
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
  const dailyTrendForecastDays: number = normalizeRenamedNumberField(
    context,
    'context',
    'dailyTrendForecastDays',
    'dailyTrendLeadTimeDays',
  )
  return {
    ...normalizeStringFields(context, 'context', CONTEXT_STRING_KEYS),
    forecastMonths: expectNumber(context.forecastMonths, 'context.forecastMonths'),
    dailyTrendForecastDays,
  }
}

function normalizeDrawer1Structure(drawer1: Obj): OrderSnapshotDocument['drawer1'] {
  const source: Obj = expectRecord(drawer1.summary, 'drawer1.summary')
  const summary: OrderSnapshotPrimarySummary = {
    skuGroupKey: expectNonEmptyString(source.skuGroupKey, 'drawer1.summary.skuGroupKey'),
    ...(source.productUuid == null ? {} : { productUuid: expectNonEmptyString(source.productUuid, 'drawer1.summary.productUuid') }),
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

function normalizeDrawer2Structure(drawer2: Obj, primarySummary: OrderSnapshotPrimarySummary, isLegacySnapshot: boolean): OrderSnapshotDocument['drawer2'] {
  const sizeOrders: OrderSnapshotSizeOrder[] = normalizeSizeOrders(drawer2.sizeOrders)
  const stockOrderRequest: OrderSnapshotDocument['drawer2']['stockOrderRequest'] = normalizeStockOrderRequest(drawer2.stockOrderRequest)
  const stockOrderResult: OrderSnapshotStockOrderResult = normalizeStockOrderResult(drawer2.stockOrderResult, sizeOrders, stockOrderRequest, primarySummary, isLegacySnapshot)
  const unitEconomics: OrderSnapshotUnitEconomics = normalizeUnitEconomics(drawer2.unitEconomics)
  const confirmed: OrderSnapshotConfirmed = normalizeConfirmed(drawer2.confirmed, sizeOrders)
  return {
    baseSubject: normalizeBaseSubject(expectRecord(drawer2.baseSubject, 'drawer2.baseSubject')),
    comparisonSubject: normalizeComparisonSubject(expectRecord(drawer2.comparisonSubject, 'drawer2.comparisonSubject')),
    comparisonBasis: normalizeComparisonBasis(expectRecord(drawer2.comparisonBasis, 'drawer2.comparisonBasis')),
    stockOrderRequest,
    stockOrderResult,
    unitEconomics,
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
  const orderCoverageDays: number = normalizeRenamedNumberField(source, label, 'orderCoverageDays', 'leadTimeDays')
  return {
    ...normalizeStringFields(source, label, ['currentOrderInboundDueDate', 'nextOrderInboundDueDate'] as const),
    orderCoverageDays,
    ...(source.dailyMeanOverride === undefined ? {} : { dailyMeanOverride: expectNumber(source.dailyMeanOverride, label + '.dailyMeanOverride') }),
  }
}

function normalizeUnitEconomics(value: unknown): OrderSnapshotDocument['drawer2']['unitEconomics'] {
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

function normalizeStockOrderResult(
  value: unknown,
  sizeOrders: OrderSnapshotDocument['drawer2']['sizeOrders'],
  stockOrderRequest: OrderSnapshotDocument['drawer2']['stockOrderRequest'],
  primarySummary: OrderSnapshotPrimarySummary,
  isLegacySnapshot: boolean,
): OrderSnapshotDocument['drawer2']['stockOrderResult'] {
  const source: Obj = expectRecord(value, 'drawer2.stockOrderResult')
  const display: StockOrderResult['display'] = normalizeStockOrderDisplay(source.display, sizeOrders)
  return {
    productIdentity: normalizeProductIdentity(source.productIdentity, primarySummary, isLegacySnapshot),
    inboundSplitSource: normalizeInboundSplitSource(source.inboundSplitSource, sizeOrders, stockOrderRequest, display, primarySummary, isLegacySnapshot),
    existingOrderInboundSupplyBySize: normalizeExistingOrderInboundSupplyBySize(source.existingOrderInboundSupplyBySize, sizeOrders, stockOrderRequest, display, isLegacySnapshot),
    ...normalizeNumberFields(source, 'drawer2.stockOrderResult', STOCK_RESULT_KEYS),
    display,
  }
}

function normalizeInboundSplitSource(
  value: unknown,
  sizeOrders: OrderSnapshotDocument['drawer2']['sizeOrders'],
  stockOrderRequest: OrderSnapshotDocument['drawer2']['stockOrderRequest'],
  display: StockOrderResult['display'],
  primarySummary: OrderSnapshotPrimarySummary,
  isLegacySnapshot: boolean,
): StockOrderResult['inboundSplitSource'] {
  if (value == null) {
    if (!isLegacySnapshot) throw new Error('drawer2.stockOrderResult.inboundSplitSource is required')
    return buildLegacyInboundSplitSource(sizeOrders, stockOrderRequest, display, primarySummary)
  }

  const source: Obj = expectRecord(value, 'drawer2.stockOrderResult.inboundSplitSource')
  const productIdentity = normalizeProductIdentity(source.productIdentity, primarySummary, isLegacySnapshot)
  const sizeOrderSizes: Set<string> = new Set(sizeOrders.map((row: OrderSnapshotSizeOrder): string => row.size))
  return {
    productId: expectNonEmptyString(source.productId, 'drawer2.stockOrderResult.inboundSplitSource.productId'),
    productIdentity,
    ...normalizeStringFields(source, 'drawer2.stockOrderResult.inboundSplitSource', ['calculationBaseDate', 'coverageStartDate', 'coverageEndDate'] as const),
    supplyBySize: normalizeInboundSplitSourceSupplyBySize(source.supplyBySize, sizeOrderSizes),
    salesForecastByDate: normalizeInboundSplitSourceSalesForecastByDate(source.salesForecastByDate, sizeOrderSizes),
  }
}

function normalizeInboundSplitSourceSupplyBySize(value: unknown, expectedSizes: Set<string>): StockOrderResult['inboundSplitSource']['supplyBySize'] {
  const source: Obj = expectRecord(value, 'drawer2.stockOrderResult.inboundSplitSource.supplyBySize')
  const rows: Array<{ size: string }> = Object.keys(source).map((size: string): { size: string } => ({ size }))
  expectSameSizeSet(rows, expectedSizes, 'drawer2.stockOrderResult.inboundSplitSource.supplyBySize', 'drawer2.sizeOrders')
  return Object.fromEntries(Object.entries(source).map(([size, points]: [string, unknown]): [string, StockOrderResult['inboundSplitSource']['supplyBySize'][string]] => [
    size,
    expectArray(points, `drawer2.stockOrderResult.inboundSplitSource.supplyBySize.${size}`).map((point: unknown, index: number): StockOrderResult['inboundSplitSource']['supplyBySize'][string][number] => {
      const label: string = `drawer2.stockOrderResult.inboundSplitSource.supplyBySize.${size}[${index}]`
      const pointSource: Obj = expectRecord(point, label)
      return {
        date: expectNonEmptyString(pointSource.date, label + '.date'),
        qty: expectNumber(pointSource.qty, label + '.qty'),
      }
    }),
  ]))
}

function normalizeInboundSplitSourceSalesForecastByDate(value: unknown, expectedSizes: Set<string>): StockOrderResult['inboundSplitSource']['salesForecastByDate'] {
  const source: Obj = expectRecord(value, 'drawer2.stockOrderResult.inboundSplitSource.salesForecastByDate')
  return Object.fromEntries(Object.entries(source).map(([date, row]: [string, unknown]): [string, StockOrderResult['inboundSplitSource']['salesForecastByDate'][string]] => {
    const rowSource: Obj = expectRecord(row, `drawer2.stockOrderResult.inboundSplitSource.salesForecastByDate.${date}`)
    const rows: Array<{ size: string }> = Object.keys(rowSource).map((size: string): { size: string } => ({ size }))
    expectSameSizeSet(rows, expectedSizes, `drawer2.stockOrderResult.inboundSplitSource.salesForecastByDate.${date}`, 'drawer2.sizeOrders')
    return [
      date,
      Object.fromEntries(Object.entries(rowSource).map(([size, qty]: [string, unknown]): [string, number] => [
        size,
        expectNumber(qty, `drawer2.stockOrderResult.inboundSplitSource.salesForecastByDate.${date}.${size}`),
      ])),
    ]
  }))
}

function buildLegacyInboundSplitSource(
  sizeOrders: OrderSnapshotDocument['drawer2']['sizeOrders'],
  stockOrderRequest: OrderSnapshotDocument['drawer2']['stockOrderRequest'],
  display: StockOrderResult['display'],
  primarySummary: OrderSnapshotPrimarySummary,
): StockOrderResult['inboundSplitSource'] {
  const calculationBaseDate: string = stockOrderRequest.currentOrderInboundDueDate
  const coverageEndDate: string = stockOrderRequest.nextOrderInboundDueDate
  const displayRowBySize: Map<string, OrderSnapshotStockOrderDisplaySizeRow> = new Map(display.sizeRows.map((row: OrderSnapshotStockOrderDisplaySizeRow): [string, OrderSnapshotStockOrderDisplaySizeRow] => [row.size, row]))
  const supplyBySize: StockOrderResult['inboundSplitSource']['supplyBySize'] = Object.fromEntries(sizeOrders.map((row: OrderSnapshotSizeOrder): [string, StockOrderResult['inboundSplitSource']['supplyBySize'][string]] => [
    row.size,
    [{ date: calculationBaseDate, qty: displayRowBySize.get(row.size)?.currentStockQty ?? 0 }],
  ]))
  const salesForecastByDate: StockOrderResult['inboundSplitSource']['salesForecastByDate'] = {}
  const days: number = Math.max(1, stockOrderRequest.orderCoverageDays)
  for (let offset: number = 0; ; offset += 1) {
    const date: string = addIsoDays(calculationBaseDate, offset)
    if (date >= coverageEndDate) break
    salesForecastByDate[date] = Object.fromEntries(sizeOrders.map((row: OrderSnapshotSizeOrder): [string, number] => [
      row.size,
      Math.max(0, row.forecastQty / days),
    ]))
  }
  return {
    productId: primarySummary.skuGroupKey,
    productIdentity: {
      ...(primarySummary.productUuid == null ? {} : { productUuid: primarySummary.productUuid }),
      skuGroupKey: primarySummary.skuGroupKey,
      brand: primarySummary.brand,
      code: primarySummary.code,
      colorCode: primarySummary.colorCode,
    },
    calculationBaseDate,
    coverageStartDate: stockOrderRequest.currentOrderInboundDueDate,
    coverageEndDate,
    supplyBySize,
    salesForecastByDate,
  }
}

function normalizeProductIdentity(value: unknown, primarySummary: OrderSnapshotPrimarySummary, isLegacySnapshot: boolean): StockOrderResult['productIdentity'] {
  if (value == null) {
    if (!isLegacySnapshot) throw new Error('drawer2.stockOrderResult.productIdentity is required')
    return {
      ...(primarySummary.productUuid == null ? {} : { productUuid: primarySummary.productUuid }),
      skuGroupKey: primarySummary.skuGroupKey,
      brand: primarySummary.brand,
      code: primarySummary.code,
      colorCode: primarySummary.colorCode,
    }
  }
  const source: Obj = expectRecord(value, 'drawer2.stockOrderResult.productIdentity')
  return {
    ...(source.productUuid == null ? {} : { productUuid: expectNonEmptyString(source.productUuid, 'drawer2.stockOrderResult.productIdentity.productUuid') }),
    skuGroupKey: expectNonEmptyString(source.skuGroupKey, 'drawer2.stockOrderResult.productIdentity.skuGroupKey'),
    brand: expectNonEmptyString(source.brand, 'drawer2.stockOrderResult.productIdentity.brand'),
    code: expectNonEmptyString(source.code, 'drawer2.stockOrderResult.productIdentity.code'),
    colorCode: expectNonEmptyString(source.colorCode, 'drawer2.stockOrderResult.productIdentity.colorCode'),
  }
}

function normalizeExistingOrderInboundSupplyBySize(
  value: unknown,
  sizeOrders: OrderSnapshotDocument['drawer2']['sizeOrders'],
  stockOrderRequest: OrderSnapshotDocument['drawer2']['stockOrderRequest'],
  display: StockOrderResult['display'],
  isLegacySnapshot: boolean,
): StockOrderResult['existingOrderInboundSupplyBySize'] {
  if (value == null) {
    if (!isLegacySnapshot) throw new Error('drawer2.stockOrderResult.existingOrderInboundSupplyBySize is required')
    return buildLegacyExistingOrderInboundSupplyBySize(display, stockOrderRequest)
  }
  const source: Obj = expectRecord(value, 'drawer2.stockOrderResult.existingOrderInboundSupplyBySize')
  const sizeOrderSizes: Set<string> = new Set(sizeOrders.map((row: OrderSnapshotSizeOrder): string => row.size))
  const rows: Array<{ size: string }> = Object.keys(source).map((size: string): { size: string } => ({ size }))
  expectSameSizeSet(rows, sizeOrderSizes, 'drawer2.stockOrderResult.existingOrderInboundSupplyBySize', 'drawer2.sizeOrders')
  return Object.fromEntries(Object.entries(source).map(([size, points]: [string, unknown]): [string, StockOrderResult['existingOrderInboundSupplyBySize'][string]] => [
    size,
    expectArray(points, `drawer2.stockOrderResult.existingOrderInboundSupplyBySize.${size}`).map((point: unknown, index: number): StockOrderResult['existingOrderInboundSupplyBySize'][string][number] => {
      const label: string = `drawer2.stockOrderResult.existingOrderInboundSupplyBySize.${size}[${index}]`
      const pointSource: Obj = expectRecord(point, label)
      return {
        date: expectNonEmptyString(pointSource.date, label + '.date'),
        qty: expectNumberInRange(pointSource.qty, label + '.qty', 0, Number.MAX_SAFE_INTEGER),
      }
    }),
  ]))
}

function buildLegacyExistingOrderInboundSupplyBySize(
  display: StockOrderResult['display'],
  stockOrderRequest: OrderSnapshotDocument['drawer2']['stockOrderRequest'],
): StockOrderResult['existingOrderInboundSupplyBySize'] {
  const beforeCurrentOrderInboundDate: string = addIsoDays(stockOrderRequest.currentOrderInboundDueDate, -1)
  const currentOrderInboundDate: string = stockOrderRequest.currentOrderInboundDueDate
  return Object.fromEntries(display.sizeRows.map((row: OrderSnapshotStockOrderDisplaySizeRow): [string, StockOrderResult['existingOrderInboundSupplyBySize'][string]] => {
    const expectedInboundOrderBalance: number = Math.min(row.totalOrderBalance, row.expectedInboundOrderBalance)
    const remainingOrderBalance: number = Math.max(0, row.totalOrderBalance - expectedInboundOrderBalance)
    const points: StockOrderResult['existingOrderInboundSupplyBySize'][string] = []
    if (expectedInboundOrderBalance > 0) points.push({ date: beforeCurrentOrderInboundDate, qty: expectedInboundOrderBalance })
    if (remainingOrderBalance > 0) points.push({ date: currentOrderInboundDate, qty: remainingOrderBalance })
    return [row.size, points]
  }))
}

function addIsoDays(date: string, days: number): string {
  const parsed: Date = new Date(`${date}T00:00:00.000Z`)
  parsed.setUTCDate(parsed.getUTCDate() + days)
  return parsed.toISOString().slice(0, 10)
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
      ignoreExistingOrderInbound: round.ignoreExistingOrderInbound === undefined
        ? false
        : expectBoolean(round.ignoreExistingOrderInbound, rowLabel + '.ignoreExistingOrderInbound'),
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

function normalizeRenamedNumberField(source: Obj, label: string, currentKey: string, legacyKey: string): number {
  const hasCurrent: boolean = source[currentKey] !== undefined
  const hasLegacy: boolean = source[legacyKey] !== undefined
  if (!hasCurrent && !hasLegacy) return expectNumber(undefined, label + '.' + currentKey)
  const value: number = expectNumber(hasCurrent ? source[currentKey] : source[legacyKey], label + '.' + currentKey)
  if (hasCurrent && hasLegacy) {
    expectMatchingNumbers(value, expectNumber(source[legacyKey], label + '.' + legacyKey), label + '.' + currentKey, label + '.' + legacyKey)
  }
  return value
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
