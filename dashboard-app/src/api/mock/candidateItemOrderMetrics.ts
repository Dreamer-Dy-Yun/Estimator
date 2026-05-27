import type { CandidateOrderMetric } from '../types'
import type { CandidateDataReferencePeriod } from './candidateItemSummaryTypes'
import { buildCandidateItemInsight } from './candidateItemInsights'
import { estimatePeriodWeight, productPrimaryBySkuGroupKey, productSecondaryBySkuGroupKey } from './productCatalog'
import { scopeMockProductPrimary, scopeMockProductSecondary, scopeMockSelfSalesRow } from './mockCompanyScope'
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

function getProductSecondary(skuGroupKey: string) {
  const secondary = productSecondaryBySkuGroupKey[skuGroupKey]
  if (!secondary) throw new Error(`Unknown mock secondary SKU group: ${skuGroupKey}`)
  return secondary
}

export function buildCandidateItemOrderMetric(
  row: CandidateItemRecord,
  dataReferencePeriod?: CandidateDataReferencePeriod,
  companyUuid?: string,
): CandidateOrderMetric {
  const skuGroupKey = row.skuGroupKey
  const periodWeight = getPeriodWeight(dataReferencePeriod)
  const primary = scopeMockProductPrimary(getProductPrimary(skuGroupKey), { companyUuid })
  const selfSource = selfBySkuGroupKey[skuGroupKey]
  const self = selfSource ? scopeMockSelfSalesRow(selfSource, { companyUuid }) : null
  const avgPrice = Math.max(0, Math.round(self?.avgPrice ?? primary.price))
  const avgCost = Math.max(0, Math.round(self?.avgCost ?? primary.price * 0.78))
  const feeRatePct = Math.max(0, Math.round((self?.feeRate ?? 13) * 10) / 10)
  const baseQty = Math.max(0, Math.round((self?.qty ?? primary.qty) * 0.58))
  const qty = Math.max(0, Math.round(baseQty * periodWeight))
  const expectedOrderAmount = qty * avgCost
  const expectedSalesAmount = qty * avgPrice
  const expectedOpProfit = qty * Math.round(avgPrice - avgCost - (avgPrice * feeRatePct) / 100)
  const opMarginRatePct = expectedSalesAmount > 0 ? (expectedOpProfit / expectedSalesAmount) * 100 : null
  const secondary = scopeMockProductSecondary(getProductSecondary(skuGroupKey), { companyUuid })
  const sizeRows = secondary.sizeRows
  const sizeRatioSum = sizeRows.reduce((acc, sizeRow) => acc + Math.max(0, sizeRow.selfRatio), 0)
  const insight = buildCandidateItemInsight(
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
        ? sizeRows.map((sizeRow) => ({
            size: sizeRow.size,
            orderQty: Math.max(0, Math.round(qty * (Math.max(0, sizeRow.selfRatio) / sizeRatioSum))),
          }))
        : [],
    },
  }
}
