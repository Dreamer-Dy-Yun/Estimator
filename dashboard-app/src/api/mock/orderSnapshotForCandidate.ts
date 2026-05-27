import { buildSalesKpiColumn } from '../../utils/salesKpiColumn'
import {
  createOrderSnapshotCompetitorBasis,
  createOrderSnapshotPrimarySummary,
  createOrderSnapshotStockOrderRequest,
  ORDER_SNAPSHOT_SCHEMA_VERSION,
} from '../../snapshot/orderSnapshotTypes'
import type { SecondaryOrderSnapshotPayload } from '../types/snapshot'
import { requireMockProductPrimary, requireMockProductSecondary } from './mockProductLookup'
import { secondaryCompetitorChannels } from './salesTables'

const koNumber = new Intl.NumberFormat('ko-KR')
const formatEa = (value: number | null | undefined) => value == null ? '확인 필요' : `${koNumber.format(Math.max(0, Math.round(value)))}EA`
const formatWon = (value: number | null | undefined) => value == null ? '확인 필요' : `${koNumber.format(Math.max(0, Math.round(value)))}원`

interface MockOrderSnapshotOptions {
  periodStart?: string
  periodEnd?: string
  companyUuid?: string
}

function requireNumber(value: number | null | undefined, label: string) {
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error(`Missing mock numeric value: ${label}`)
  return value
}

function buildMockAiPrompt(snapshot: SecondaryOrderSnapshotPayload) {
  const { summary } = snapshot.drawer1
  const { competitorChannelLabel, confirmedTotals } = snapshot.drawer2
  return [
    `${summary.brand} ${summary.productName} 후보군 AI 코멘트를 작성하세요.`,
    `기간 ${snapshot.context.periodStart}~${snapshot.context.periodEnd}, 경쟁 채널 ${competitorChannelLabel}, 확정 오더 ${formatEa(confirmedTotals?.orderQty)} 기준입니다.`,
    '판매 흐름, 재고, 사이즈별 확정 수량 기준으로 사용자가 바로 확인할 코멘트를 짧게 작성하세요.',
  ].join('\n')
}

function buildMockAiAnswer(snapshot: SecondaryOrderSnapshotPayload) {
  const { summary } = snapshot.drawer1
  const { competitorChannelLabel, confirmedTotals } = snapshot.drawer2
  const marginRate = typeof confirmedTotals?.expectedOpProfitRatePct === 'number'
    ? `${confirmedTotals.expectedOpProfitRatePct.toFixed(1)}%`
    : '확인 필요'
  return [
    `${summary.productName}은(는) ${competitorChannelLabel} 기준 판매 흐름을 함께 볼 후보군입니다.`,
    `확정 오더 ${formatEa(confirmedTotals?.orderQty)}, 예상 매출 ${formatWon(confirmedTotals?.expectedSalesAmount)}, 예상 영업이익률 ${marginRate}입니다.`,
    '추천 수량 대비 가용 재고, 입고 잔량, 사이즈별 확정 수량을 우선 확인하세요.',
  ].join('\n')
}

export function ensureMockAiCommentForSnapshot(snapshot: SecondaryOrderSnapshotPayload): SecondaryOrderSnapshotPayload {
  const prompt = snapshot.drawer2.aiComment.prompt.trim()
  const answer = snapshot.drawer2.aiComment.answer.trim()
  if (prompt && answer) return snapshot
  return {
    ...snapshot,
    drawer2: {
      ...snapshot.drawer2,
      aiComment: {
        prompt: prompt || buildMockAiPrompt(snapshot),
        answer: answer || buildMockAiAnswer(snapshot),
      },
    },
  }
}

export function buildMockOrderSnapshotForCandidate(
  skuGroupKey: string,
  options: MockOrderSnapshotOptions = {},
): SecondaryOrderSnapshotPayload {
  const primary = requireMockProductPrimary(skuGroupKey)
  const secondary = requireMockProductSecondary(skuGroupKey)
  const channel = secondaryCompetitorChannels[0]!
  const selfCol = buildSalesKpiColumn('self', primary, secondary, channel)
  const summary = createOrderSnapshotPrimarySummary(primary)
  const leadTimeDays = 30
  const unitPrice = Math.max(0, Math.round(summary.price ?? primary.price))
  const unitCost = Math.max(0, Math.round(requireNumber(selfCol.avgCost, 'self avgCost')))
  const feePerUnit = Math.max(0, Math.round(requireNumber(selfCol.feePerUnit, 'self feePerUnit')))
  const feeRatePct = requireNumber(selfCol.feeRatePct, 'self feeRatePct')
  const dailyMean = Math.max(0.1, Math.round((primary.qty / 365) * 10) / 10)
  const selfQtyTotal = secondary.sizeRows.reduce((sum, row) => sum + Math.max(0, row.qty), 0)
  const sharePct = (value: number, total: number) => total > 0 ? (Math.max(0, value) / total) * 100 : 0
  const sizeOrders = secondary.sizeRows.map((row) => ({
    size: row.size,
    selfSharePct: sharePct(row.qty, selfQtyTotal),
    competitorSharePct: (secondary.competitorRatioBySize[row.size] ?? 0) * 100,
    blendedSharePct: (sharePct(row.qty, selfQtyTotal) + (secondary.competitorRatioBySize[row.size] ?? 0) * 100) / 2,
    forecastQty: Math.max(0, Math.round(row.qty * 0.12)),
    recommendedQty: Math.max(0, row.confirmedQty),
    confirmQty: Math.max(0, row.confirmedQty),
  }))
  const currentStockQtyBySize = secondary.sizeRows.map((row) => Math.max(0, Math.round(row.availableStock)))
  const totalOrderBalanceBySize = sizeOrders.map((row) => Math.max(0, Math.round(row.confirmQty * 0.4)))
  const expectedInboundOrderBalanceBySize = sizeOrders.map((row) => Math.max(0, Math.round(row.confirmQty * 0.3)))
  const orderQty = sizeOrders.reduce((sum, row) => sum + row.confirmQty, 0)
  const expectedSalesAmount = orderQty * unitPrice
  const expectedOpProfit = orderQty * (unitPrice - unitCost - feePerUnit)
  const expectedOrderAmount = orderQty * unitCost

  return ensureMockAiCommentForSnapshot({
    schemaVersion: ORDER_SNAPSHOT_SCHEMA_VERSION,
    skuGroupKey,
    ...(options.companyUuid ? { companyUuid: options.companyUuid } : {}),
    savedAt: new Date().toISOString(),
    context: {
      periodStart: options.periodStart ?? '2025-01-01',
      periodEnd: options.periodEnd ?? '2025-12-31',
      forecastMonths: 8,
      dailyTrendStartMonth: '2025-01',
      dailyTrendLeadTimeDays: leadTimeDays,
    },
    drawer1: { summary },
    drawer2: {
      competitorBasis: createOrderSnapshotCompetitorBasis(secondary),
      competitorChannelId: channel.id,
      competitorChannelLabel: channel.label,
      stockOrderRequest: createOrderSnapshotStockOrderRequest({
        currentOrderInboundDueDate: '2026-04-01',
        nextOrderInboundDueDate: '2026-05-01',
        leadTimeDays,
      }),
      stockOrderResult: {
        trendDailyMean: dailyMean,
        dailyMean,
        sigma: 12,
        display: {
          currentStockQtyTotal: currentStockQtyBySize.reduce((sum, value) => sum + value, 0),
          totalOrderBalanceTotal: totalOrderBalanceBySize.reduce((sum, value) => sum + value, 0),
          expectedInboundOrderBalanceTotal: expectedInboundOrderBalanceBySize.reduce((sum, value) => sum + value, 0),
          currentStockQtyBySize,
          totalOrderBalanceBySize,
          expectedInboundOrderBalanceBySize,
        },
        safetyStockCalc: { safetyStock: orderQty, recommendedOrderQty: orderQty, expectedOrderAmount, expectedSalesAmount, expectedOpProfit },
        forecastQtyCalc: { safetyStock: null, recommendedOrderQty: orderQty, expectedOrderAmount, expectedSalesAmount, expectedOpProfit },
      },
      unitEconomics: { unitPrice, unitCost, expectedFeeRatePct: feeRatePct },
      selfWeightPct: 50,
      bufferStock: 0,
      aiComment: { prompt: '', answer: '' },
      confirmedTotals: {
        orderQty,
        expectedSalesAmount,
        expectedOpProfit,
        expectedOpProfitRatePct: expectedSalesAmount > 0 ? (expectedOpProfit / expectedSalesAmount) * 100 : null,
      },
      sizeOrders,
    },
  })
}
