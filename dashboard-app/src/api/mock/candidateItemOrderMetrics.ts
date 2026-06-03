import type { ProductSecondaryDetail } from '..'
import type { ProductSecondarySizeRow, SelfSalesRow } from '../../types'
import type { ProductPrimarySummary } from '../types'
import type { CandidateItemInsightSummary } from '../types/candidate'
import type { CandidateOrderMetric } from '../types'
import type { CandidateDataReferencePeriod } from './candidateItemSummaryTypes'
import { buildCandidateItemInsight } from './candidateItemInsights'
import { estimatePeriodWeight, productPrimaryBySkuGroupKey, productSecondaryBySkuGroupKey } from './productCatalog'
import { scopeMockProductPrimary, scopeMockProductSecondary, scopeMockSelfSalesRow } from './mockCompanyScope'
import type { CandidateItemRecord } from './records'
import { selfBySkuGroupKey } from './salesTables'

function getProductPrimary(skuGroupKey: string) : ProductPrimarySummary {
  const primary: ProductPrimarySummary = productPrimaryBySkuGroupKey[skuGroupKey]
  if (!primary) throw new Error(`Unknown mock SKU group: ${skuGroupKey}`)
  return primary
}

function getPeriodWeight(dataReferencePeriod?: CandidateDataReferencePeriod) : number {
  return dataReferencePeriod
    ? estimatePeriodWeight(dataReferencePeriod.start, dataReferencePeriod.end)
    : 1
}

function getProductSecondary(skuGroupKey: string) : ProductSecondaryDetail {
  const secondary: ProductSecondaryDetail = productSecondaryBySkuGroupKey[skuGroupKey]
  if (!secondary) throw new Error(`Unknown mock secondary SKU group: ${skuGroupKey}`)
  return secondary
}

export function buildCandidateItemOrderMetric(
  row: CandidateItemRecord,
  dataReferencePeriod?: CandidateDataReferencePeriod,
  companyUuid?: string,
): CandidateOrderMetric {
  const skuGroupKey: string = row.skuGroupKey
  const periodWeight: number = getPeriodWeight(dataReferencePeriod)
  const primary: ProductPrimarySummary = scopeMockProductPrimary(getProductPrimary(skuGroupKey), { companyUuid })
  const selfSource: SelfSalesRow = selfBySkuGroupKey[skuGroupKey]
  const self: SelfSalesRow | null = selfSource ? scopeMockSelfSalesRow(selfSource, { companyUuid }) : null
  const avgPrice: number = Math.max(0, Math.round(self?.avgPrice ?? primary.price))
  const avgCost: number = Math.max(0, Math.round(self?.avgCost ?? primary.price * 0.78))
  const feeRatePct: number = Math.max(0, Math.round((self?.feeRate ?? 13) * 10) / 10)
  const baseQty: number = Math.max(0, Math.round((self?.qty ?? primary.qty) * 0.58))
  const qty: number = Math.max(0, Math.round(baseQty * periodWeight))
  const expectedOrderAmount: number = qty * avgCost
  const expectedSalesAmount: number = qty * avgPrice
  const expectedOpProfit: number = qty * Math.round(avgPrice - avgCost - (avgPrice * feeRatePct) / 100)
  const opMarginRatePct: number | null = expectedSalesAmount > 0 ? (expectedOpProfit / expectedSalesAmount) * 100 : null
  const secondary: ProductSecondaryDetail = scopeMockProductSecondary(getProductSecondary(skuGroupKey), { companyUuid })
  const sizeRows: ProductSecondarySizeRow[] = secondary.sizeRows
  const sizeRatioSum: number = sizeRows.reduce((acc: number, sizeRow: ProductSecondarySizeRow) : number => acc + Math.max(0, sizeRow.selfRatio), 0)
  const insight: CandidateItemInsightSummary = buildCandidateItemInsight(
    skuGroupKey,
    qty,
    expectedSalesAmount,
    expectedOpProfit,
    dataReferencePeriod,
    companyUuid,
  )

  return {
    itemUuid: row.uuid,
    skuUuid: row.skuUuid,
    qty,
    expectedOrderAmount,
    expectedSalesAmount,
    expectedOpProfit,
    orderExport: {
      competitorChannelLabel: insight.competitorChannelLabel,
      selfQty: insight.selfQty,
      competitorQty: insight.competitorQty,
      expectedSalesQty: qty,
      expectedOrderAmount,
      avgCost,
      avgPrice,
      feeRatePct,
      opMarginRatePct,
      inboundExpectedDate: row.details?.drawer2.stockOrderRequest.nextOrderInboundDueDate ?? null,
      sizeOrderQty: sizeRatioSum > 0
        ? sizeRows.map((sizeRow: ProductSecondarySizeRow) : { size: string; orderQty: number; } => ({
            size: sizeRow.size,
            orderQty: Math.max(0, Math.round(qty * (Math.max(0, sizeRow.selfRatio) / sizeRatioSum))),
          }))
        : [],
    },
  }
}
