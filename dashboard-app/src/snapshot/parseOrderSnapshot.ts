import {
  ORDER_SNAPSHOT_SCHEMA_VERSION,
  type OrderSnapshotCompetitorSalesBasisV2,
  type OrderSnapshotDocumentV2,
  type OrderSnapshotPrimarySummaryV2,
} from './orderSnapshotTypes'

/** Parse and validate the stored candidate item snapshot at the API boundary. */
export function parseOrderSnapshot(
  details: unknown,
): OrderSnapshotDocumentV2 {
  const d = expectRecord(details, 'snapshot')
  if (d.schemaVersion !== ORDER_SNAPSHOT_SCHEMA_VERSION) {
    throw new Error(`snapshot schemaVersion mismatch: ${String(d.schemaVersion)}`)
  }
  const skuGroupKey = expectNonEmptyString(d.skuGroupKey, 'snapshot.skuGroupKey')
  const companyUuid = expectOptionalNonEmptyString(d.companyUuid, 'snapshot.companyUuid')
  const drawer1 = normalizeDrawer1Structure(expectRecord(d.drawer1, 'drawer1'))
  const drawer2 = normalizeDrawer2Structure(expectRecord(d.drawer2, 'drawer2'))
  return {
    schemaVersion: ORDER_SNAPSHOT_SCHEMA_VERSION,
    skuGroupKey,
    ...(companyUuid === undefined ? {} : { companyUuid }),
    savedAt: expectString(d.savedAt, 'snapshot.savedAt'),
    context: normalizeContext(expectRecord(d.context, 'context')),
    drawer1,
    drawer2,
  }
}

function normalizeContext(context: Record<string, unknown>): OrderSnapshotDocumentV2['context'] {
  return {
    periodStart: expectString(context.periodStart, 'context.periodStart'),
    periodEnd: expectString(context.periodEnd, 'context.periodEnd'),
    forecastMonths: expectNumber(context.forecastMonths, 'context.forecastMonths'),
    dailyTrendStartMonth: expectString(context.dailyTrendStartMonth, 'context.dailyTrendStartMonth'),
    dailyTrendLeadTimeDays: expectNumber(context.dailyTrendLeadTimeDays, 'context.dailyTrendLeadTimeDays'),
  }
}

function normalizeDrawer1Structure(drawer1: Record<string, unknown>): OrderSnapshotDocumentV2['drawer1'] {
  const source = expectRecord(drawer1.summary, 'drawer1.summary')
  const summary: OrderSnapshotPrimarySummaryV2 = {
    skuGroupKey: expectNonEmptyString(source.skuGroupKey, 'drawer1.summary.skuGroupKey'),
    productName: expectString(source.productName, 'drawer1.summary.productName'),
    brand: expectString(source.brand, 'drawer1.summary.brand'),
    category: expectString(source.category, 'drawer1.summary.category'),
    code: expectString(source.code, 'drawer1.summary.code'),
    colorCode: expectString(source.colorCode, 'drawer1.summary.colorCode'),
    price: expectNumber(source.price, 'drawer1.summary.price'),
    qty: expectNumber(source.qty, 'drawer1.summary.qty'),
    availableStock: expectNumber(source.availableStock, 'drawer1.summary.availableStock'),
  }
  return {
    summary,
  }
}

function normalizeDrawer2Structure(drawer2: Record<string, unknown>): OrderSnapshotDocumentV2['drawer2'] {
  const competitorSalesBasis = normalizeCompetitorSalesBasis(
    expectRecord(drawer2.competitorSalesBasis ?? drawer2.secondary, 'drawer2.competitorSalesBasis'),
  )
  const orderUnitInputs = normalizeOptionalOrderUnitInputs(drawer2.orderUnitInputs)
  const stockDisplay = normalizeOptionalStockDisplay(drawer2.stockDisplay)
  const confirmedTotals = normalizeOptionalConfirmedTotals(drawer2.confirmedTotals)
  return {
    competitorSalesBasis,
    competitorChannelId: expectString(drawer2.competitorChannelId, 'drawer2.competitorChannelId'),
    competitorChannelLabel: expectString(drawer2.competitorChannelLabel, 'drawer2.competitorChannelLabel'),
    stockInputs: normalizeStockInputs(drawer2.stockInputs),
    ...(orderUnitInputs == null ? {} : { orderUnitInputs }),
    ...(stockDisplay == null ? {} : { stockDisplay }),
    selfWeightPct: expectNumber(drawer2.selfWeightPct, 'drawer2.selfWeightPct'),
    bufferStock: expectNumber(drawer2.bufferStock, 'drawer2.bufferStock'),
    llmPrompt: expectString(drawer2.llmPrompt, 'drawer2.llmPrompt'),
    llmAnswer: expectString(drawer2.llmAnswer, 'drawer2.llmAnswer'),
    ...(confirmedTotals == null ? {} : { confirmedTotals }),
    sizeRows: normalizeSizeRows(drawer2.sizeRows),
  }
}

function normalizeCompetitorSalesBasis(
  basis: Record<string, unknown>,
): OrderSnapshotCompetitorSalesBasisV2 {
  return {
    skuGroupKey: expectNonEmptyString(basis.skuGroupKey, 'drawer2.competitorSalesBasis.skuGroupKey'),
    competitorPrice: expectNumber(basis.competitorPrice, 'drawer2.competitorSalesBasis.competitorPrice'),
    competitorQty: expectNumber(basis.competitorQty, 'drawer2.competitorSalesBasis.competitorQty'),
    competitorRatioBySize: normalizeCompetitorRatioBySize(basis.competitorRatioBySize),
  }
}

function normalizeCompetitorRatioBySize(value: unknown): OrderSnapshotCompetitorSalesBasisV2['competitorRatioBySize'] {
  const source = expectRecord(value, 'drawer2.competitorSalesBasis.competitorRatioBySize')
  const ratios: Record<string, number> = {}
  for (const [size, ratio] of Object.entries(source)) {
    ratios[size] = expectNumber(ratio, `drawer2.competitorSalesBasis.competitorRatioBySize.${size}`)
  }
  return ratios
}

function normalizeStockInputs(value: unknown): OrderSnapshotDocumentV2['drawer2']['stockInputs'] {
  const source = expectRecord(value, 'drawer2.stockInputs')
  return {
    trendDailyMean: expectNumber(source.trendDailyMean, 'drawer2.stockInputs.trendDailyMean'),
    dailyMean: expectNumber(source.dailyMean, 'drawer2.stockInputs.dailyMean'),
    leadTimeStartDate: expectString(source.leadTimeStartDate, 'drawer2.stockInputs.leadTimeStartDate'),
    leadTimeEndDate: expectString(source.leadTimeEndDate, 'drawer2.stockInputs.leadTimeEndDate'),
    leadTimeDays: expectNumber(source.leadTimeDays, 'drawer2.stockInputs.leadTimeDays'),
    safetyStockMode: expectSafetyStockMode(source.safetyStockMode, 'drawer2.stockInputs.safetyStockMode'),
    manualSafetyStock: expectNumber(source.manualSafetyStock, 'drawer2.stockInputs.manualSafetyStock'),
    sigma: expectNumber(source.sigma, 'drawer2.stockInputs.sigma'),
    serviceLevelPct: expectNumber(source.serviceLevelPct, 'drawer2.stockInputs.serviceLevelPct'),
  }
}

function normalizeOptionalOrderUnitInputs(
  value: unknown,
): OrderSnapshotDocumentV2['drawer2']['orderUnitInputs'] {
  if (value === undefined) return undefined
  const source = expectRecord(value, 'drawer2.orderUnitInputs')
  return {
    unitPrice: expectNumber(source.unitPrice, 'drawer2.orderUnitInputs.unitPrice'),
    unitCost: expectNumber(source.unitCost, 'drawer2.orderUnitInputs.unitCost'),
    expectedFeeRatePct: expectNumber(source.expectedFeeRatePct, 'drawer2.orderUnitInputs.expectedFeeRatePct'),
  }
}

function normalizeOptionalStockDisplay(
  value: unknown,
): OrderSnapshotDocumentV2['drawer2']['stockDisplay'] {
  if (value === undefined) return undefined
  const source = expectRecord(value, 'drawer2.stockDisplay')
  return {
    currentStockQtyTotal: expectNumber(source.currentStockQtyTotal, 'drawer2.stockDisplay.currentStockQtyTotal'),
    totalOrderBalanceTotal: expectNumber(source.totalOrderBalanceTotal, 'drawer2.stockDisplay.totalOrderBalanceTotal'),
    expectedInboundOrderBalanceTotal: expectNumber(
      source.expectedInboundOrderBalanceTotal,
      'drawer2.stockDisplay.expectedInboundOrderBalanceTotal',
    ),
    currentStockQtyBySize: normalizeNumberArray(source.currentStockQtyBySize, 'drawer2.stockDisplay.currentStockQtyBySize'),
    totalOrderBalanceBySize: normalizeNumberArray(source.totalOrderBalanceBySize, 'drawer2.stockDisplay.totalOrderBalanceBySize'),
    expectedInboundOrderBalanceBySize: normalizeNumberArray(
      source.expectedInboundOrderBalanceBySize,
      'drawer2.stockDisplay.expectedInboundOrderBalanceBySize',
    ),
  }
}

function normalizeOptionalConfirmedTotals(
  value: unknown,
): OrderSnapshotDocumentV2['drawer2']['confirmedTotals'] {
  if (value === undefined) return undefined
  const source = expectRecord(value, 'drawer2.confirmedTotals')
  return {
    orderQty: expectNumber(source.orderQty, 'drawer2.confirmedTotals.orderQty'),
    expectedSalesAmount: expectNumber(source.expectedSalesAmount, 'drawer2.confirmedTotals.expectedSalesAmount'),
    expectedOpProfit: expectNumber(source.expectedOpProfit, 'drawer2.confirmedTotals.expectedOpProfit'),
    expectedOpProfitRatePct: expectNumberOrNull(
      source.expectedOpProfitRatePct,
      'drawer2.confirmedTotals.expectedOpProfitRatePct',
    ),
  }
}

function normalizeSizeRows(value: unknown): OrderSnapshotDocumentV2['drawer2']['sizeRows'] {
  return expectArray(value, 'drawer2.sizeRows').map((row, index) => {
    const source = expectRecord(row, `drawer2.sizeRows[${index}]`)
    return {
      size: expectString(source.size, `drawer2.sizeRows[${index}].size`),
      selfSharePct: expectNumber(source.selfSharePct, `drawer2.sizeRows[${index}].selfSharePct`),
      competitorSharePct: expectNumber(source.competitorSharePct, `drawer2.sizeRows[${index}].competitorSharePct`),
      blendedSharePct: expectNumber(source.blendedSharePct, `drawer2.sizeRows[${index}].blendedSharePct`),
      forecastQty: expectNumber(source.forecastQty, `drawer2.sizeRows[${index}].forecastQty`),
      recommendedQty: expectNumber(source.recommendedQty, `drawer2.sizeRows[${index}].recommendedQty`),
      confirmQty: expectNumber(source.confirmQty, `drawer2.sizeRows[${index}].confirmQty`),
    }
  })
}

function normalizeNumberArray(value: unknown, label: string): number[] {
  return expectArray(value, label).map((item, index) => expectNumber(item, `${label}[${index}]`))
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
  if (value === undefined) return undefined
  return expectNonEmptyString(value, label)
}
function expectNumber(value: unknown, label: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`${label} must be a finite number`)
  }
  return value
}

function expectSafetyStockMode(
  value: unknown,
  label: string,
): OrderSnapshotDocumentV2['drawer2']['stockInputs']['safetyStockMode'] {
  if (value !== 'manual' && value !== 'formula') {
    throw new Error(`${label} must be manual or formula`)
  }
  return value
}

function expectNumberOrNull(value: unknown, label: string): number | null {
  if (value === null) return null
  return expectNumber(value, label)
}
