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
import type { OrderSnapshotDocument, OrderSnapshotUnitEconomics } from '../../snapshot/orderSnapshotTypes'
import { getOrderSnapshotConfirmedQtyBySize, getOrderSnapshotConfirmedTotalQty } from '../../snapshot/orderSnapshotTypes'
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

const DEFAULT_ORDER_COVERAGE_DAYS = 30 as const
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

function orderExportSizeQtyFromSnapshot(snapshot: OrderSnapshotDocument): CandidateItemOrderExportSizeQty[] {
  const confirmedQtyBySize: Record<string, number> = getOrderSnapshotConfirmedQtyBySize(snapshot.drawer2.confirmed)
  return snapshot.drawer2.sizeOrders.map((row: { size: string }) : CandidateItemOrderExportSizeQty => ({
    size: row.size,
    orderQty: Math.max(0, Math.round(confirmedQtyBySize[row.size] ?? 0)),
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
  const unitEconomics: OrderSnapshotUnitEconomics = requireSnapshotUnitEconomics(snapshot)
  const qty: number = Math.max(0, Math.round(getOrderSnapshotConfirmedTotalQty(snapshot.drawer2.confirmed)))
  const expectedOrderAmount: number = qty * Math.max(0, Math.round(unitEconomics.unitCost))
  const expectedSalesAmount: number = qty * Math.max(0, Math.round(unitEconomics.unitPrice))
  const expectedFeeAmount: number = Math.round((unitEconomics.unitPrice * unitEconomics.expectedFeeRatePct) / 100)
  const expectedOpProfit: number = qty * Math.round(unitEconomics.unitPrice - unitEconomics.unitCost - expectedFeeAmount)
  const opMarginRatePct: number | null = expectedSalesAmount > 0 ? (expectedOpProfit / expectedSalesAmount) * 100 : null
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
      comparisonSubjectLabel: snapshot.drawer2.comparisonSubject.label,
      selfQty: insight.selfQty,
      competitorQty: insight.competitorQty,
      expectedSalesQty: qty,
      expectedOrderAmount,
      avgCost: Math.max(0, Math.round(unitEconomics.unitCost)),
      avgPrice: Math.max(0, Math.round(unitEconomics.unitPrice)),
      feeRatePct: roundedPercent(unitEconomics.expectedFeeRatePct),
      opMarginRatePct: roundedPercent(opMarginRatePct),
      inboundExpectedDate: snapshot.drawer2.stockOrderRequest.nextOrderInboundDueDate,
      sizeOrderQty: orderExportSizeQtyFromSnapshot(snapshot),
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
    forecastPeriodEndMonth: periodEnd.slice(0, 7),
    orderCoverageDays: DEFAULT_ORDER_COVERAGE_DAYS,
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
    forecastSalesHorizonDays: DEFAULT_ORDER_COVERAGE_DAYS,
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
      comparisonSubjectLabel: resolvedComparison.label,
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
  if (row.confirmedOrderSnapshot != null) {
    return buildSnapshotOrderMetric(row, row.confirmedOrderSnapshot as OrderSnapshotDocument, dataReferencePeriod, companyUuid)
  }
  return buildLiveOrderMetric(row, dataReferencePeriod, companyUuid, requireComparisonSubject(comparison))
}
