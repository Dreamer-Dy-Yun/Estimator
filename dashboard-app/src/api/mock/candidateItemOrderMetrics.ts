import type { CandidateOrderMetric } from '../types'
import type { CandidateDataReferencePeriod } from './candidateItemSummaryBuilder'
import { buildCandidateItemInsight } from './candidateItemInsights'
import { estimatePeriodWeight, productPrimaryBySkuGroupKey } from './productCatalog'
import type { CandidateItemRecord } from './records'
import { selfBySkuGroupKey } from './salesTables'

function getProductPrimary(skuGroupKey: string) {
  const primary = productPrimaryBySkuGroupKey[skuGroupKey]
  if (!primary) throw new Error(`Unknown mock SKU group: ${skuGroupKey}`)
  return primary
}

function getPeriodWeight(dataReferencePeriod?: CandidateDataReferencePeriod) {
  return dataReferencePeriod
    ? estimatePeriodWeight(dataReferencePeriod.start, dataReferencePeriod.end)
    : 1
}

export function buildCandidateItemOrderMetric(
  row: CandidateItemRecord,
  dataReferencePeriod?: CandidateDataReferencePeriod,
): CandidateOrderMetric {
  const skuGroupKey = row.skuGroupKey
  const periodWeight = getPeriodWeight(dataReferencePeriod)
  const primary = getProductPrimary(skuGroupKey)
  const self = selfBySkuGroupKey[skuGroupKey]
  const avgPrice = Math.max(0, Math.round(self?.avgPrice ?? primary.price))
  const avgCost = Math.max(0, Math.round(self?.avgCost ?? primary.price * 0.78))
  const feeRatePct = Math.max(0, Math.round((self?.feeRate ?? 13) * 10) / 10)
  const baseQty = Math.max(0, Math.round((self?.qty ?? primary.qty) * 0.58))
  const qty = Math.max(0, Math.round(baseQty * periodWeight))
  const expectedOrderAmount = qty * avgCost
  const expectedSalesAmount = qty * avgPrice
  const expectedOpProfit = qty * Math.round(avgPrice - avgCost - (avgPrice * feeRatePct) / 100)
  const opMarginRatePct = expectedSalesAmount > 0 ? (expectedOpProfit / expectedSalesAmount) * 100 : null
  const sizeMix = primary.sizeMix
  const sizeRatioSum = sizeMix.reduce((acc, sizeRow) => acc + Math.max(0, sizeRow.ratio), 0)
  const insight = buildCandidateItemInsight(
    skuGroupKey,
    qty,
    expectedSalesAmount,
    expectedOpProfit,
    dataReferencePeriod,
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
      inboundExpectedDate: row.details?.drawer2.stockInputs.leadTimeEndDate ?? null,
      sizeOrderQty: sizeRatioSum > 0
        ? sizeMix.map((sizeRow) => ({
            size: sizeRow.size,
            orderQty: Math.max(0, Math.round(qty * (Math.max(0, sizeRow.ratio) / sizeRatioSum))),
          }))
        : [],
    },
  }
}
