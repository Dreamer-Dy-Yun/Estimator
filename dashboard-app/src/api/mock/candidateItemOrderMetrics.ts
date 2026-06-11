import type {
  ProductComparisonBaseSubjectRef,
  ProductComparisonComparisonSubject,
  ProductComparisonComparisonSubjectRef,
  ProductPrimarySummary,
  ProductSecondaryDetail,
  SecondaryStockOrderCalcParams,
  SecondaryStockOrderCalcResult,
} from '../types'
import type { CandidateItemInsightSummary } from '../types/candidate'
import type { CandidateItemOrderExportSizeQty, CandidateOrderMetric } from '../types'
import type { CandidateDataReferencePeriod } from './candidateItemSummaryTypes'
import type { CandidateItemRecord } from './records'
import type { OrderSnapshotConfirmedTotals, OrderSnapshotDocument, OrderSnapshotSizeOrder, OrderSnapshotUnitEconomics } from '../../snapshot/orderSnapshotTypes'
import type { SecondarySizeOrderRow, SecondarySizeShare } from '../../utils/secondaryOrderProjection'
import { buildCandidateItemInsight } from './candidateItemInsights'
import { productPrimaryBySkuGroupKey } from './productCatalog'
import { scopeMockProductPrimary } from './mockCompanyScope'
import { buildMockProductSecondaryDetail } from './mockProductSecondaryDetailApi'
import { buildMockSecondaryStockOrderCalcResult } from './secondaryStockOrderCalcApi'
import { resolveMockProductSalesInsightSubject } from './mockProductComparisonApi'
import {
  buildSecondarySizeOrderRows,
  buildSecondarySizeShares,
} from '../../utils/secondaryOrderProjection'

const DEFAULT_LEAD_TIME_DAYS = 30 as const
const DEFAULT_SELF_WEIGHT_PCT = 50 as const
const DEFAULT_BUFFER_STOCK = 0 as const

function getProductPrimary(skuGroupKey: string) : ProductPrimarySummary {
  const primary: ProductPrimarySummary = productPrimaryBySkuGroupKey[skuGroupKey]
  if (!primary) throw new Error(`Unknown mock SKU group: ${skuGroupKey}`)
  return primary
}

function baseSubjectForCompany(companyUuid?: string): ProductComparisonBaseSubjectRef {
  return {
    role: 'base',
    kind: 'self-company',
    ...(companyUuid == null ? {} : { sourceId: companyUuid }),
  }
}

function requireComparisonSubject(comparison?: ProductComparisonComparisonSubjectRef): ProductComparisonComparisonSubjectRef {
  if (comparison == null) throw new Error('Mock candidate order metric comparison target is required.')
  return comparison
}

function roundedPercent(value: number | null): number | null {
  return value == null ? null : Math.round(value * 10) / 10
}

function orderExportSizeQtyFromSnapshot(sizeOrders: OrderSnapshotSizeOrder[]): CandidateItemOrderExportSizeQty[] {
  return sizeOrders.map((row: OrderSnapshotSizeOrder) : CandidateItemOrderExportSizeQty => ({
    size: row.size,
    orderQty: Math.max(0, Math.round(row.confirmQty)),
  }))
}

function orderExportSizeQtyFromRows(sizeRows: SecondarySizeOrderRow[]): CandidateItemOrderExportSizeQty[] {
  return sizeRows.map((row: SecondarySizeOrderRow) : CandidateItemOrderExportSizeQty => ({
    size: row.size,
    orderQty: Math.max(0, Math.round(row.confirmQty)),
  }))
}

function requireSnapshotUnitEconomics(snapshot: OrderSnapshotDocument): OrderSnapshotUnitEconomics {
  const unitEconomics: OrderSnapshotUnitEconomics | undefined = snapshot.drawer2.unitEconomics
  if (unitEconomics == null) throw new Error('Candidate snapshot is missing unitEconomics.')
  return unitEconomics
}

function buildSnapshotOrderMetric(
  row: CandidateItemRecord,
  snapshot: OrderSnapshotDocument,
  dataReferencePeriod: CandidateDataReferencePeriod | undefined,
  companyUuid: string | undefined,
): CandidateOrderMetric {
  const totals: OrderSnapshotConfirmedTotals = snapshot.drawer2.confirmedTotals
  const unitEconomics: OrderSnapshotUnitEconomics = requireSnapshotUnitEconomics(snapshot)
  const qty: number = Math.max(0, Math.round(totals.orderQty))
  const expectedOrderAmount: number = qty * Math.max(0, Math.round(unitEconomics.unitCost))
  const expectedSalesAmount: number = Math.max(0, Math.round(totals.expectedSalesAmount))
  const expectedOpProfit: number = Math.round(totals.expectedOpProfit)
  const insight: CandidateItemInsightSummary = buildCandidateItemInsight(
    row.skuGroupKey,
    qty,
    expectedSalesAmount,
    expectedOpProfit,
    dataReferencePeriod,
    companyUuid,
  )

  return {
    itemUuid: row.uuid,
    skuUuid: row.skuUuid,
    source: 'snapshot',
    qty,
    expectedOrderAmount,
    expectedSalesAmount,
    expectedOpProfit,
    orderExport: {
      competitorChannelLabel: snapshot.drawer2.comparisonSubject.label,
      selfQty: insight.selfQty,
      competitorQty: insight.competitorQty,
      expectedSalesQty: qty,
      expectedOrderAmount,
      avgCost: Math.max(0, Math.round(unitEconomics.unitCost)),
      avgPrice: Math.max(0, Math.round(unitEconomics.unitPrice)),
      feeRatePct: roundedPercent(unitEconomics.expectedFeeRatePct),
      opMarginRatePct: roundedPercent(totals.expectedOpProfitRatePct),
      inboundExpectedDate: snapshot.drawer2.stockOrderRequest.nextOrderInboundDueDate,
      sizeOrderQty: orderExportSizeQtyFromSnapshot(snapshot.drawer2.sizeOrders),
    },
  }
}

function buildLiveSizeRows({
  row,
  base,
  comparison,
  dataReferencePeriod,
}: {
  row: CandidateItemRecord
  base: ProductComparisonBaseSubjectRef
  comparison: ProductComparisonComparisonSubjectRef
  dataReferencePeriod?: CandidateDataReferencePeriod
}): { stockCalc: SecondaryStockOrderCalcResult; sizeRows: SecondarySizeOrderRow[] } {
  const periodStart: string = dataReferencePeriod?.start ?? '2025-01-01'
  const periodEnd: string = dataReferencePeriod?.end ?? '2025-12-31'
  const stockCalcParams: SecondaryStockOrderCalcParams = {
    skuGroupKey: row.skuGroupKey,
    base,
    periodStart,
    periodEnd,
    forecastPeriodEnd: periodEnd.slice(0, 7),
    leadTimeDays: DEFAULT_LEAD_TIME_DAYS,
  }
  const secondary: ProductSecondaryDetail = buildMockProductSecondaryDetail(row.skuGroupKey, {
    base,
    comparison,
  })
  const stockCalc: SecondaryStockOrderCalcResult = buildMockSecondaryStockOrderCalcResult(stockCalcParams)
  const shares: SecondarySizeShare[] = buildSecondarySizeShares(secondary, DEFAULT_SELF_WEIGHT_PCT)
  const sizeRows: SecondarySizeOrderRow[] = buildSecondarySizeOrderRows({
    shares,
    dailyMeanEa: stockCalc.dailyMean,
    forecastSalesHorizonDays: DEFAULT_LEAD_TIME_DAYS,
    stockOrderSizeRows: stockCalc.display.sizeRows,
    bufferStock: DEFAULT_BUFFER_STOCK,
    orderDraft: {
      confirmQty: (_size: string, recommendedQty: number) : number => recommendedQty,
    },
  })
  return { stockCalc, sizeRows }
}

function buildLiveOrderMetric(
  row: CandidateItemRecord,
  dataReferencePeriod: CandidateDataReferencePeriod | undefined,
  companyUuid: string | undefined,
  comparison: ProductComparisonComparisonSubjectRef,
): CandidateOrderMetric {
  const base: ProductComparisonBaseSubjectRef = baseSubjectForCompany(companyUuid)
  const { sizeRows }: { stockCalc: SecondaryStockOrderCalcResult; sizeRows: SecondarySizeOrderRow[] } = buildLiveSizeRows({
    row,
    base,
    comparison,
    dataReferencePeriod,
  })
  const primary: ProductPrimarySummary = scopeMockProductPrimary(getProductPrimary(row.skuGroupKey), { companyUuid })
  const unitPrice: number = Math.max(0, Math.round(primary.price))
  const unitCost: number = Math.max(0, Math.round(primary.price * 0.78))
  const feeRatePct = 13 as const
  const qty: number = sizeRows.reduce((sum: number, sizeRow: SecondarySizeOrderRow) : number => sum + Math.max(0, Math.round(sizeRow.confirmQty)), 0)
  const expectedOrderAmount: number = qty * unitCost
  const expectedSalesAmount: number = qty * unitPrice
  const expectedOpProfit: number = qty * Math.round(unitPrice - unitCost - (unitPrice * feeRatePct) / 100)
  const opMarginRatePct: number | null = expectedSalesAmount > 0 ? (expectedOpProfit / expectedSalesAmount) * 100 : null
  const resolvedComparison: ProductComparisonComparisonSubject = resolveMockProductSalesInsightSubject(comparison)
  const insight: CandidateItemInsightSummary = buildCandidateItemInsight(
    row.skuGroupKey,
    qty,
    expectedSalesAmount,
    expectedOpProfit,
    dataReferencePeriod,
    companyUuid,
  )

  return {
    itemUuid: row.uuid,
    skuUuid: row.skuUuid,
    source: 'secondary-calc',
    qty,
    expectedOrderAmount,
    expectedSalesAmount,
    expectedOpProfit,
    orderExport: {
      competitorChannelLabel: resolvedComparison.label,
      selfQty: insight.selfQty,
      competitorQty: insight.competitorQty,
      expectedSalesQty: qty,
      expectedOrderAmount,
      avgCost: unitCost,
      avgPrice: unitPrice,
      feeRatePct,
      opMarginRatePct,
      inboundExpectedDate: null,
      sizeOrderQty: orderExportSizeQtyFromRows(sizeRows),
    },
  }
}

export function buildCandidateItemOrderMetric(
  row: CandidateItemRecord,
  dataReferencePeriod?: CandidateDataReferencePeriod,
  companyUuid?: string,
  comparison?: ProductComparisonComparisonSubjectRef,
): CandidateOrderMetric {
  if (row.details != null) {
    return buildSnapshotOrderMetric(row, row.details as OrderSnapshotDocument, dataReferencePeriod, companyUuid)
  }
  return buildLiveOrderMetric(row, dataReferencePeriod, companyUuid, requireComparisonSubject(comparison))
}
