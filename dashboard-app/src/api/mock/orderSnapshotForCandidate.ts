import type { ProductSecondaryDetail, SecondaryCompetitorChannel } from '..'
import type { OrderSnapshotDrawer1V2, OrderSnapshotDrawer2V2, OrderSnapshotPrimarySummaryV2 } from '../../snapshot/orderSnapshotTypes'
import type { ProductSecondarySizeRow } from '../../types'
import type { SalesKpiColumn } from '../../utils/salesKpiColumn'
import type { ProductPrimarySummary } from '../types'
import { buildSalesKpiColumn } from '../../utils/salesKpiColumn'
import {
  createOrderSnapshotCompetitorBasis,
  createOrderSnapshotPrimarySummary,
  createOrderSnapshotStockOrderRequest,
  ORDER_SNAPSHOT_SCHEMA_VERSION,
} from '../../snapshot/orderSnapshotTypes'
import type { SecondaryOrderSnapshotPayload } from '../types/snapshot'
import { requireMockProductPrimary, requireMockProductSecondary } from './mockProductLookup'
import { getMockCompanyScale, scopeMockProductPrimary, scopeMockProductSecondary } from './mockCompanyScope'
import { secondaryCompetitorChannels } from './salesTables'

const koNumber: Intl.NumberFormat = new Intl.NumberFormat('ko-KR')
const formatEa: (value: number | null | undefined) => string = (value: number | null | undefined) : string => value == null ? '확인 필요' : `${koNumber.format(Math.max(0, Math.round(value)))}EA`
const formatWon: (value: number | null | undefined) => string = (value: number | null | undefined) : string => value == null ? '확인 필요' : `${koNumber.format(Math.max(0, Math.round(value)))}원`

interface MockOrderSnapshotOptions {
  periodStart?: string
  periodEnd?: string
  companyUuid?: string
}

function requireNumber(value: number | null | undefined, label: string) : number {
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error(`Missing mock numeric value: ${label}`)
  return value
}

function buildMockAiPrompt(snapshot: SecondaryOrderSnapshotPayload) : string {
  const { summary }: OrderSnapshotDrawer1V2 = snapshot.drawer1
  const { competitorChannelLabel, confirmedTotals }: OrderSnapshotDrawer2V2 = snapshot.drawer2
  return [
    `${summary.brand} ${summary.productName} 후보군 AI 코멘트를 작성하세요.`,
    `기간 ${snapshot.context.periodStart}~${snapshot.context.periodEnd}, 경쟁 채널 ${competitorChannelLabel}, 확정 오더 ${formatEa(confirmedTotals?.orderQty)} 기준입니다.`,
    '판매 흐름, 재고, 사이즈별 확정 수량 기준으로 사용자가 바로 확인할 코멘트를 짧게 작성하세요.',
  ].join('\n')
}

function buildMockAiAnswer(snapshot: SecondaryOrderSnapshotPayload) : string {
  const { summary }: OrderSnapshotDrawer1V2 = snapshot.drawer1
  const { competitorChannelLabel, confirmedTotals }: OrderSnapshotDrawer2V2 = snapshot.drawer2
  const marginRate: string = typeof confirmedTotals?.expectedOpProfitRatePct === 'number'
    ? `${confirmedTotals.expectedOpProfitRatePct.toFixed(1)}%`
    : '확인 필요'
  return [
    `${summary.productName}은(는) ${competitorChannelLabel} 기준 판매 흐름을 함께 볼 후보군입니다.`,
    `확정 오더 ${formatEa(confirmedTotals?.orderQty)}, 예상 매출 ${formatWon(confirmedTotals?.expectedSalesAmount)}, 예상 영업이익률 ${marginRate}입니다.`,
    '추천 수량 대비 가용 재고, 입고 잔량, 사이즈별 확정 수량을 우선 확인하세요.',
  ].join('\n')
}

export function ensureMockAiCommentForSnapshot(snapshot: SecondaryOrderSnapshotPayload): SecondaryOrderSnapshotPayload {
  const prompt: string = snapshot.drawer2.aiComment.prompt.trim()
  const answer: string = snapshot.drawer2.aiComment.answer.trim()
  if (prompt && answer) return snapshot
  return {
    ...snapshot,
    drawer2: {
      ...snapshot.drawer2,
      aiComment: {
        prompt: prompt || buildMockAiPrompt(snapshot),
        answer: answer || buildMockAiAnswer(snapshot),
        generatedAt: new Date().toISOString(),
      },
    },
  }
}

export function buildMockOrderSnapshotForCandidate(
  skuGroupKey: string,
  options: MockOrderSnapshotOptions = {},
): SecondaryOrderSnapshotPayload {
  const primarySource: ProductPrimarySummary = requireMockProductPrimary(skuGroupKey)
  const secondarySource: ProductSecondaryDetail = requireMockProductSecondary(skuGroupKey)
  const shouldScope: boolean = options.companyUuid ? getMockCompanyScale(options, skuGroupKey) > 0 : false
  const primary: ProductPrimarySummary = shouldScope ? scopeMockProductPrimary(primarySource, options) : primarySource
  const secondary: ProductSecondaryDetail = shouldScope ? scopeMockProductSecondary(secondarySource, options) : secondarySource
  const channel: SecondaryCompetitorChannel = secondaryCompetitorChannels[0]!
  const selfCol: SalesKpiColumn = buildSalesKpiColumn('self', primary, secondary, channel)
  const summary: OrderSnapshotPrimarySummaryV2 = createOrderSnapshotPrimarySummary(primary)
  const leadTimeDays = 30 as const
  const unitPrice: number = Math.max(0, Math.round(summary.price ?? primary.price))
  const unitCost: number = Math.max(0, Math.round(requireNumber(selfCol.avgCost, 'self avgCost')))
  const feePerUnit: number = Math.max(0, Math.round(requireNumber(selfCol.feePerUnit, 'self feePerUnit')))
  const feeRatePct: number = requireNumber(selfCol.feeRatePct, 'self feeRatePct')
  const dailyMean: number = Math.max(0.1, Math.round((primary.qty / 365) * 10) / 10)
  const selfQtyTotal: number = secondary.sizeRows.reduce((sum: number, row: ProductSecondarySizeRow) : number => sum + Math.max(0, row.qty), 0)
  const sharePct: (value: number, total: number) => number = (value: number, total: number) : number => total > 0 ? (Math.max(0, value) / total) * 100 : 0
  const sizeOrders: { size: string; selfSharePct: number; competitorSharePct: number; blendedSharePct: number; forecastQty: number; recommendedQty: number; confirmQty: number; }[] = secondary.sizeRows.map((row: ProductSecondarySizeRow) : { size: string; selfSharePct: number; competitorSharePct: number; blendedSharePct: number; forecastQty: number; recommendedQty: number; confirmQty: number; } => ({
    size: row.size,
    selfSharePct: sharePct(row.qty, selfQtyTotal),
    competitorSharePct: (secondary.competitorRatioBySize[row.size] ?? 0) * 100,
    blendedSharePct: (sharePct(row.qty, selfQtyTotal) + (secondary.competitorRatioBySize[row.size] ?? 0) * 100) / 2,
    forecastQty: Math.max(0, Math.round(row.qty * 0.12)),
    recommendedQty: Math.max(0, row.confirmedQty),
    confirmQty: Math.max(0, row.confirmedQty),
  }))
  const stockBySize: Map<string, number> = new Map(secondary.sizeRows.map((row: ProductSecondarySizeRow) : [string, number] => [row.size, Math.max(0, Math.round(row.availableStock))]))
  const displaySizeRows: { size: string; currentStockQty: number; totalOrderBalance: number; expectedInboundOrderBalance: number; }[] = sizeOrders.map((row: { size: string; selfSharePct: number; competitorSharePct: number; blendedSharePct: number; forecastQty: number; recommendedQty: number; confirmQty: number; }) : { size: string; currentStockQty: number; totalOrderBalance: number; expectedInboundOrderBalance: number; } => ({
    size: row.size,
    currentStockQty: stockBySize.get(row.size) ?? 0,
    totalOrderBalance: Math.max(0, Math.round(row.confirmQty * 0.4)),
    expectedInboundOrderBalance: Math.max(0, Math.round(row.confirmQty * 0.3)),
  }))
  const orderQty: number = sizeOrders.reduce((sum: number, row: { size: string; selfSharePct: number; competitorSharePct: number; blendedSharePct: number; forecastQty: number; recommendedQty: number; confirmQty: number; }) : number => sum + row.confirmQty, 0)
  const expectedSalesAmount: number = orderQty * unitPrice
  const expectedOpProfit: number = orderQty * (unitPrice - unitCost - feePerUnit)
  const expectedOrderAmount: number = orderQty * unitCost

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
          currentStockQtyTotal: displaySizeRows.reduce((sum: number, row: { size: string; currentStockQty: number; totalOrderBalance: number; expectedInboundOrderBalance: number; }) : number => sum + row.currentStockQty, 0),
          totalOrderBalanceTotal: displaySizeRows.reduce((sum: number, row: { size: string; currentStockQty: number; totalOrderBalance: number; expectedInboundOrderBalance: number; }) : number => sum + row.totalOrderBalance, 0),
          expectedInboundOrderBalanceTotal: displaySizeRows.reduce((sum: number, row: { size: string; currentStockQty: number; totalOrderBalance: number; expectedInboundOrderBalance: number; }) : number => sum + row.expectedInboundOrderBalance, 0),
          sizeRows: displaySizeRows,
        },
        safetyStockCalc: { safetyStock: orderQty, recommendedOrderQty: orderQty, expectedOrderAmount, expectedSalesAmount, expectedOpProfit },
        forecastQtyCalc: { safetyStock: null, recommendedOrderQty: orderQty, expectedOrderAmount, expectedSalesAmount, expectedOpProfit },
      },
      unitEconomics: { unitPrice, unitCost, expectedFeeRatePct: feeRatePct },
      selfWeightPct: 50,
      bufferStock: 0,
      aiComment: { prompt: '', answer: '', generatedAt: null },
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
