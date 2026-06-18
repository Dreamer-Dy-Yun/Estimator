import type { ProductSecondaryDetail, SecondaryCompetitorChannel, SecondaryInboundSplitSource } from '..'
import type { OrderSnapshotBaseSubject, OrderSnapshotComparisonSubject, OrderSnapshotDrawer1, OrderSnapshotDrawer2, OrderSnapshotMonthlySalesTrendPoint, OrderSnapshotPrimarySummary } from '../../snapshot/orderSnapshotTypes'
import type { MonthlySalesPoint, ProductSecondarySizeRow } from '../../types'
import type { SalesKpiColumn } from '../../utils/salesKpiColumn'
import type { ProductPrimarySummary } from '../types'
import { buildSalesKpiColumn } from '../../utils/salesKpiColumn'
import {
  createOrderSnapshotBaseSubject,
  createOrderSnapshotComparisonBasis,
  createOrderSnapshotComparisonSubject,
  createOrderSnapshotMonthlySalesTrend,
  createOrderSnapshotPrimarySummary,
  createOrderSnapshotStockOrderRequest,
  getOrderSnapshotConfirmedTotalQty,
  ORDER_SNAPSHOT_SCHEMA_VERSION,
} from '../../snapshot/orderSnapshotTypes'
import type { OrderSnapshotDocument } from '../../snapshot/orderSnapshotTypes'
import { requireMockProductPrimary, requireMockProductSecondary } from './mockProductLookup'
import { getMockCompanyScale, scopeMockProductPrimary, scopeMockProductSecondary } from './mockCompanyScope'
import { formatNullableMockEa, formatNullableMockWon } from './mockNumberFormat'
import { secondaryCompetitorChannels } from './salesTables'

interface MockOrderSnapshotOptions {
  periodStart?: string
  periodEnd?: string
  companyUuid?: string
}

const MOCK_INBOUND_SPLIT_CALCULATION_BASE_DATE = '2026-04-01' as const
const MOCK_INBOUND_SPLIT_COVERAGE_END_DATE = '2026-05-01' as const
const MOCK_DAY_MS = 86_400_000 as const

function requireNumber(value: number | null | undefined, label: string) : number {
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error(`Missing mock numeric value: ${label}`)
  return value
}

function addMockIsoDays(date: string, days: number): string {
  const parsed: number = Date.parse(`${date}T00:00:00.000Z`)
  if (!Number.isFinite(parsed)) throw new Error(`Invalid mock date: ${date}`)
  return new Date(parsed + days * MOCK_DAY_MS).toISOString().slice(0, 10)
}

function buildMockOrderSnapshotInboundSplitSource({
  summary,
  sizeOrders,
  displaySizeRows,
  existingOrderInboundSupplyBySize,
  dailyMean,
}: {
  summary: OrderSnapshotPrimarySummary
  sizeOrders: { size: string; blendedSharePct: number }[]
  displaySizeRows: { size: string; currentStockQty: number }[]
  existingOrderInboundSupplyBySize: Record<string, { date: string; qty: number }[]>
  dailyMean: number
}): SecondaryInboundSplitSource {
  const displayRowBySize: Map<string, { size: string; currentStockQty: number }> = new Map(displaySizeRows.map((row: { size: string; currentStockQty: number }): [string, { size: string; currentStockQty: number }] => [row.size, row]))
  const supplyBySize: SecondaryInboundSplitSource['supplyBySize'] = Object.fromEntries(sizeOrders.map((row: { size: string; blendedSharePct: number }): [string, SecondaryInboundSplitSource['supplyBySize'][string]] => {
    const sourcePoints: SecondaryInboundSplitSource['supplyBySize'][string] = [
      { date: MOCK_INBOUND_SPLIT_CALCULATION_BASE_DATE, qty: displayRowBySize.get(row.size)?.currentStockQty ?? 0 },
      ...(existingOrderInboundSupplyBySize[row.size] ?? []).filter((point: { date: string; qty: number }): boolean =>
        point.date >= MOCK_INBOUND_SPLIT_CALCULATION_BASE_DATE && point.date < MOCK_INBOUND_SPLIT_COVERAGE_END_DATE),
    ]
    return [row.size, sourcePoints]
  }))
  const salesForecastByDate: SecondaryInboundSplitSource['salesForecastByDate'] = {}
  for (let offset = 0; ; offset += 1) {
    const date: string = addMockIsoDays(MOCK_INBOUND_SPLIT_CALCULATION_BASE_DATE, offset)
    if (date >= MOCK_INBOUND_SPLIT_COVERAGE_END_DATE) break
    salesForecastByDate[date] = Object.fromEntries(sizeOrders.map((row: { size: string; blendedSharePct: number }): [string, number] => [
      row.size,
      Math.max(0, dailyMean * row.blendedSharePct / 100),
    ]))
  }
  return {
    productId: summary.skuGroupKey,
    productIdentity: {
      productUuid: summary.productUuid ?? null,
      skuGroupKey: summary.skuGroupKey,
      brand: summary.brand,
      code: summary.code,
      colorCode: summary.colorCode,
    },
    calculationBaseDate: MOCK_INBOUND_SPLIT_CALCULATION_BASE_DATE,
    coverageStartDate: MOCK_INBOUND_SPLIT_CALCULATION_BASE_DATE,
    coverageEndDate: MOCK_INBOUND_SPLIT_COVERAGE_END_DATE,
    supplyBySize,
    salesForecastByDate,
  }
}

function buildMockAiPrompt(snapshot: OrderSnapshotDocument) : string {
  const { summary }: OrderSnapshotDrawer1 = snapshot.drawer1
  const { comparisonSubject, confirmed }: OrderSnapshotDrawer2 = snapshot.drawer2
  const orderQty: number = getOrderSnapshotConfirmedTotalQty(confirmed)
  return [
    `${summary.brand} ${summary.productName} 후보군 AI 코멘트를 작성하세요.`,
    `기간 ${snapshot.context.periodStart}~${snapshot.context.periodEnd}, 비교 대상 ${comparisonSubject.label}, 확정 오더 ${formatNullableMockEa(orderQty)} 기준입니다.`,
    '판매 흐름, 재고, 사이즈별 확정 수량 기준으로 사용자가 바로 확인할 코멘트를 짧게 작성하세요.',
  ].join('\n')
}

function buildMockAiAnswer(snapshot: OrderSnapshotDocument) : string {
  const { summary }: OrderSnapshotDrawer1 = snapshot.drawer1
  const { comparisonSubject, confirmed, unitEconomics }: OrderSnapshotDrawer2 = snapshot.drawer2
  const orderQty: number = getOrderSnapshotConfirmedTotalQty(confirmed)
  const expectedSalesAmount: number | null = unitEconomics == null ? null : orderQty * unitEconomics.unitPrice
  const expectedFeeAmount: number | null = unitEconomics == null ? null : Math.round((unitEconomics.unitPrice * unitEconomics.expectedFeeRatePct) / 100)
  const expectedOpProfit: number | null = unitEconomics == null || expectedFeeAmount == null ? null : orderQty * Math.round(unitEconomics.unitPrice - unitEconomics.unitCost - expectedFeeAmount)
  const marginRate: string = expectedSalesAmount != null && expectedSalesAmount > 0 && expectedOpProfit != null
    ? `${((expectedOpProfit / expectedSalesAmount) * 100).toFixed(1)}%`
    : '확인 필요'
  const baseLines: string[] = [
    `${summary.productName}은(는) ${comparisonSubject.label} 기준 판매 흐름을 함께 볼 후보군입니다.`,
    `확정 오더 ${formatNullableMockEa(orderQty)}, 예상 매출 ${formatNullableMockWon(expectedSalesAmount)}, 예상 영업이익률 ${marginRate}입니다.`,
    '추천 수량 대비 가용 재고, 입고 잔량, 사이즈별 확정 수량을 우선 확인하세요.',
  ]
  if (summary.code !== 'TEST-SHOE') return baseLines.join('\n')
  return [
    ...baseLines,
    '이 코멘트는 AI 코멘트 카드의 세로 overflow와 한번에 보기 버튼을 확인하기 위한 장문 mock 데이터입니다.',
    '현재 테스트 신발은 비교 대상 판매량과 자사 판매량이 비슷한 구간에 있으므로 단순히 총량만 보고 확정 수량을 늘리기보다, 사이즈별 판매 비중과 현재 재고가 동시에 맞는지를 먼저 확인해야 합니다.',
    '특히 상위 사이즈에 확정 수량이 몰리면 예상 매출은 커 보일 수 있지만 입고 잔량과 가용 재고가 부족한 사이즈에서 품절 위험이 먼저 발생할 수 있습니다.',
    '반대로 하위 사이즈는 판매 속도가 낮아 보이더라도 비교 대상의 비중이 높게 잡힌 경우가 있으므로, 자사 판매 실적만 기준으로 제외하면 실제 수요 검증 구간을 놓칠 수 있습니다.',
    '따라서 이번 mock 시나리오에서는 추천 수량, 예상 매출, 영업이익률, 사이즈별 확정 수량, 재고 잔량을 한 화면 안에서 모두 확인한 뒤 코멘트를 접거나 한번에 펼쳐 보는 흐름을 검증하는 것이 목적입니다.',
  ].join('\n')
}

export function ensureMockAiCommentForSnapshot(snapshot: OrderSnapshotDocument): OrderSnapshotDocument {
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
): OrderSnapshotDocument {
  const primarySource: ProductPrimarySummary = requireMockProductPrimary(skuGroupKey)
  const secondarySource: ProductSecondaryDetail = requireMockProductSecondary(skuGroupKey)
  const shouldScope: boolean = options.companyUuid ? getMockCompanyScale(options, skuGroupKey) > 0 : false
  const primary: ProductPrimarySummary = shouldScope ? scopeMockProductPrimary(primarySource, options) : primarySource
  const secondary: ProductSecondaryDetail = shouldScope ? scopeMockProductSecondary(secondarySource, options) : secondarySource
  const channel: SecondaryCompetitorChannel = secondaryCompetitorChannels[0]!
  const baseSubject: OrderSnapshotBaseSubject = createOrderSnapshotBaseSubject({
    role: 'base',
    kind: 'self-company',
    ...(options.companyUuid ? { sourceId: options.companyUuid } : {}),
  })
  const comparisonSubject: OrderSnapshotComparisonSubject = createOrderSnapshotComparisonSubject({
    role: 'comparison',
    kind: 'competitor-channel',
    id: `comparison:competitor-channel:${channel.id}`,
    sourceId: channel.id,
    label: channel.label,
  })
  const selfCol: SalesKpiColumn = buildSalesKpiColumn('self', primary, secondary, channel)
  const summary: OrderSnapshotPrimarySummary = createOrderSnapshotPrimarySummary(primary)
  const orderCoverageDays = 30 as const
  const unitPrice: number = Math.max(0, Math.round(summary.price ?? primary.price))
  const unitCost: number = Math.max(0, Math.round(requireNumber(selfCol.avgCost, 'self avgCost')))
  const feeRatePct: number = requireNumber(selfCol.feeRatePct, 'self feeRatePct')
  const dailyMean: number = Math.max(0.1, Math.round((primary.qty / 365) * 10) / 10)
  const monthlyTrendSeed: MonthlySalesPoint[] = primary.monthlySalesTrend ?? []
  const firstForecastIndex: number = monthlyTrendSeed.findIndex((point: MonthlySalesPoint): boolean => point.isForecast)
  const monthlySalesTrend: OrderSnapshotMonthlySalesTrendPoint[] = monthlyTrendSeed.map((point: MonthlySalesPoint, index: number): OrderSnapshotMonthlySalesTrendPoint => {
    const sales: number = Math.max(0, Math.round(point.sales))
    const comparisonSales: number | null = point.isForecast ? null : Math.max(0, Math.round(point.sales * 1.12))
    return {
      idx: index,
      date: point.date,
      isForecast: point.isForecast,
      sales,
      comparisonSales,
      actual: point.isForecast ? null : sales,
      comparisonActual: point.isForecast ? null : comparisonSales,
      forecastLink: firstForecastIndex !== -1 && (index === firstForecastIndex - 1 || index >= firstForecastIndex) ? sales : null,
    }
  })
  const selfQtyTotal: number = secondary.sizeRows.reduce((sum: number, row: ProductSecondarySizeRow) : number => sum + Math.max(0, row.qty), 0)
  const sharePct: (value: number, total: number) => number = (value: number, total: number) : number => total > 0 ? (Math.max(0, value) / total) * 100 : 0
  const sizeOrders: { size: string; baseSharePct: number; comparisonSharePct: number; blendedSharePct: number; forecastQty: number; recommendedQty: number; }[] = secondary.sizeRows.map((row: ProductSecondarySizeRow) : { size: string; baseSharePct: number; comparisonSharePct: number; blendedSharePct: number; forecastQty: number; recommendedQty: number; } => ({
    size: row.size,
    baseSharePct: sharePct(row.qty, selfQtyTotal),
    comparisonSharePct: (secondary.comparisonRatioBySize[row.size] ?? 0) * 100,
    blendedSharePct: (sharePct(row.qty, selfQtyTotal) + (secondary.comparisonRatioBySize[row.size] ?? 0) * 100) / 2,
    forecastQty: Math.max(0, Math.round(row.qty * 0.12)),
    recommendedQty: Math.max(0, row.confirmedQty),
  }))
  const confirmedQtyBySize: Record<string, number> = Object.fromEntries(secondary.sizeRows.map((row: ProductSecondarySizeRow): [string, number] => [row.size, Math.max(0, row.confirmedQty)]))
  const stockBySize: Map<string, number> = new Map(secondary.sizeRows.map((row: ProductSecondarySizeRow) : [string, number] => [row.size, Math.max(0, Math.round(row.availableStock))]))
  const displaySizeRows: { size: string; currentStockQty: number; totalOrderBalance: number; expectedInboundOrderBalance: number; }[] = sizeOrders.map((row: { size: string; baseSharePct: number; comparisonSharePct: number; blendedSharePct: number; forecastQty: number; recommendedQty: number; }) : { size: string; currentStockQty: number; totalOrderBalance: number; expectedInboundOrderBalance: number; } => ({
    size: row.size,
    currentStockQty: stockBySize.get(row.size) ?? 0,
    totalOrderBalance: Math.max(0, Math.round((confirmedQtyBySize[row.size] ?? 0) * 0.4)),
    expectedInboundOrderBalance: Math.max(0, Math.round((confirmedQtyBySize[row.size] ?? 0) * 0.3)),
  }))
  const existingOrderInboundSupplyBySize: Record<string, { date: string; qty: number }[]> = Object.fromEntries(displaySizeRows.map((row: { size: string; currentStockQty: number; totalOrderBalance: number; expectedInboundOrderBalance: number; }): [string, { date: string; qty: number }[]] => {
    const preCurrentOrderQty: number = Math.min(row.totalOrderBalance, row.expectedInboundOrderBalance)
    const postCurrentOrderQty: number = Math.max(0, row.totalOrderBalance - preCurrentOrderQty)
    const points: { date: string; qty: number }[] = []
    if (preCurrentOrderQty > 0) points.push({ date: '2026-03-31', qty: preCurrentOrderQty })
    if (postCurrentOrderQty > 0) points.push({ date: '2026-04-01', qty: postCurrentOrderQty })
    return [row.size, points]
  }))
  return ensureMockAiCommentForSnapshot({
    schemaVersion: ORDER_SNAPSHOT_SCHEMA_VERSION,
    skuGroupKey,
    savedAt: new Date().toISOString(),
    context: {
      periodStart: options.periodStart ?? '2025-01-01',
      periodEnd: options.periodEnd ?? '2025-12-31',
      forecastMonths: 8,
      dailyTrendStartMonth: '2025-01',
      dailyTrendForecastDays: orderCoverageDays,
    },
    drawer1: {
      summary,
      monthlySalesTrend: createOrderSnapshotMonthlySalesTrend(monthlySalesTrend),
    },
    drawer2: {
      baseSubject,
      comparisonSubject,
      comparisonBasis: createOrderSnapshotComparisonBasis(secondary),
      stockOrderRequest: createOrderSnapshotStockOrderRequest({
        currentOrderInboundDueDate: '2026-04-01',
        nextOrderInboundDueDate: '2026-05-01',
        orderCoverageDays,
      }),
      stockOrderResult: {
        productIdentity: {
          productUuid: summary.productUuid ?? null,
          skuGroupKey: summary.skuGroupKey,
          brand: summary.brand,
          code: summary.code,
          colorCode: summary.colorCode,
        },
        inboundSplitSource: buildMockOrderSnapshotInboundSplitSource({
          summary,
          sizeOrders,
          displaySizeRows,
          existingOrderInboundSupplyBySize,
          dailyMean,
        }),
        existingOrderInboundSupplyBySize,
        trendDailyMean: dailyMean,
        dailyMean,
        sigma: 12,
        display: {
          currentStockQtyTotal: displaySizeRows.reduce((sum: number, row: { size: string; currentStockQty: number; totalOrderBalance: number; expectedInboundOrderBalance: number; }) : number => sum + row.currentStockQty, 0),
          totalOrderBalanceTotal: displaySizeRows.reduce((sum: number, row: { size: string; currentStockQty: number; totalOrderBalance: number; expectedInboundOrderBalance: number; }) : number => sum + row.totalOrderBalance, 0),
          expectedInboundOrderBalanceTotal: displaySizeRows.reduce((sum: number, row: { size: string; currentStockQty: number; totalOrderBalance: number; expectedInboundOrderBalance: number; }) : number => sum + row.expectedInboundOrderBalance, 0),
          sizeRows: displaySizeRows,
        },
      },
      unitEconomics: { unitPrice, unitCost, expectedFeeRatePct: feeRatePct },
      selfWeightPct: 50,
      bufferStock: 0,
      aiComment: { prompt: '', answer: '', generatedAt: null },
      confirmed: {
        rounds: [{
          date: '2026-04-01',
          ignoreExistingOrderInbound: false,
          qtyBySize: confirmedQtyBySize,
        }],
      },
      sizeOrders,
    },
  })
}
