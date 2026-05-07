import type { SecondaryOrderSnapshotPayload } from '../types/snapshot'
import { ORDER_SNAPSHOT_SCHEMA_VERSION } from '../../snapshot/orderSnapshotTypes'
import { allKnownProductIds, secondaryCompetitorChannels } from './salesTables'
import { productPrimaryById, productSecondaryById } from './productCatalog'
import { buildSalesKpiColumn } from '../../utils/salesKpiColumn'

const koNumber = new Intl.NumberFormat('ko-KR')

function formatEa(value: number | null | undefined) {
  return `${koNumber.format(Math.max(0, Math.round(value ?? 0)))}EA`
}

function formatWon(value: number | null | undefined) {
  return `${koNumber.format(Math.max(0, Math.round(value ?? 0)))}원`
}

function findLargestSizeRow(snapshot: SecondaryOrderSnapshotPayload) {
  return snapshot.drawer2.sizeRows.reduce<(typeof snapshot.drawer2.sizeRows)[number] | null>(
    (best, row) => {
      if (best == null) return row
      return Math.max(0, row.confirmQty) > Math.max(0, best.confirmQty) ? row : best
    },
    null,
  )
}

function buildMockAiPrompt(snapshot: SecondaryOrderSnapshotPayload) {
  const summary = snapshot.drawer1.summary
  const d2 = snapshot.drawer2
  return [
    `${summary.brand} ${summary.name}의 오더 후보 스냅샷을 검토해 주세요.`,
    `기간 ${snapshot.context.periodStart}~${snapshot.context.periodEnd}, 경쟁 채널 ${d2.competitorChannelLabel}, 확정 오더 ${formatEa(d2.confirmedTotals?.orderQty)} 기준입니다.`,
    '판매 흐름, 재고 여유, 사이즈별 확정 수량 기준으로 사용자가 바로 확인할 코멘트를 짧게 작성해 주세요.',
  ].join('\n')
}

function buildMockAiAnswer(snapshot: SecondaryOrderSnapshotPayload) {
  const summary = snapshot.drawer1.summary
  const d2 = snapshot.drawer2
  const totals = d2.confirmedTotals
  const largestSize = findLargestSizeRow(snapshot)
  const stockGap = Math.max(0, Math.round((d2.stockDerived.recommendedOrderQty ?? 0) - (summary.availableStock ?? 0)))
  const marginLabel = typeof totals?.expectedOpProfitRatePct === 'number'
    ? `${totals.expectedOpProfitRatePct.toFixed(1)}%`
    : '확인 필요'
  const sizeLine = largestSize
    ? `${largestSize.size} 사이즈 확정 수량이 ${formatEa(largestSize.confirmQty)}로 가장 커서, 해당 사이즈의 입고 잔량과 품절 리스크를 먼저 확인하세요.`
    : '사이즈별 확정 수량이 비어 있어, 최종 오더 전 사이즈 배분을 다시 확인하세요.'

  return [
    `${summary.name}은(는) ${d2.competitorChannelLabel} 기준 판매 흐름을 같이 볼 후보입니다.`,
    `현재 스냅샷은 확정 오더 ${formatEa(totals?.orderQty)}, 예상 매출 ${formatWon(totals?.expectedSalesAmount)}, 예상 영업이익률 ${marginLabel}로 잡혀 있습니다.`,
    stockGap > 0
      ? `추천 수량 대비 가용 재고가 약 ${formatEa(stockGap)} 부족하므로 리드타임 전 판매 속도와 미입고 잔량을 우선 점검하세요.`
      : '가용 재고가 추천 수량을 크게 압박하지 않아, 판매 속도 변화가 없으면 현재 확정 수량을 기준안으로 둘 수 있습니다.',
    sizeLine,
  ].join('\n')
}

export function ensureMockAiCommentForSnapshot(snapshot: SecondaryOrderSnapshotPayload): SecondaryOrderSnapshotPayload {
  const currentPrompt = snapshot.drawer2.llmPrompt.trim()
  const currentAnswer = snapshot.drawer2.llmAnswer.trim()
  if (currentPrompt && currentAnswer) return snapshot
  return {
    ...snapshot,
    drawer2: {
      ...snapshot.drawer2,
      llmPrompt: currentPrompt || buildMockAiPrompt(snapshot),
      llmAnswer: currentAnswer || buildMockAiAnswer(snapshot),
    },
  }
}

/** 후보군 목업: 품번별 요약·2차 스냅샷을 채워 브랜드 등이 리스트/드로어에 표시되도록 함 */
export function buildMockOrderSnapshotForCandidate(productId: string): SecondaryOrderSnapshotPayload {
  const primary = productPrimaryById[productId] ?? productPrimaryById[allKnownProductIds[0]]!
  const secondary = productSecondaryById[productId] ?? productSecondaryById[allKnownProductIds[0]]!
  const channel = secondaryCompetitorChannels[0]!
  const selfCol = buildSalesKpiColumn('self', primary, secondary, channel)
  const compCol = buildSalesKpiColumn('competitor', primary, secondary, channel)
  const { monthlySalesTrend, ...summarySansTrend } = primary
  void monthlySalesTrend
  const leadTimeDays = 30
  const stockInputs = {
    trendDailyMean: Math.max(0.1, Math.round((primary.qty / 365) * 10) / 10),
    dailyMean: Math.max(0.1, Math.round((primary.qty / 365) * 10) / 10),
    leadTimeStartDate: '2026-04-01',
    leadTimeEndDate: '2026-05-01',
    leadTimeDays,
    safetyStockMode: 'formula' as const,
    manualSafetyStock: 0,
    sigma: 12,
    serviceLevelPct: 95,
  }
  const unitPrice = Math.max(0, Math.round(summarySansTrend.price ?? primary.price))
  const unitCost = Math.max(0, Math.round(selfCol.avgCost ?? 0))
  const feePerUnit = Math.max(0, Math.round(selfCol.feePerUnit ?? 0))
  const opMarginPerUnit = unitPrice - unitCost - feePerUnit
  const stockDerived = {
    safetyStock: Math.max(0, Math.round(primary.availableStock * 0.2)),
    recommendedOrderQty: primary.recommendedOrderQty,
    expectedOrderAmount: Math.round(primary.recommendedOrderQty * unitCost),
    expectedSalesAmount: Math.round(primary.recommendedOrderQty * unitPrice),
    expectedOpProfit: Math.round(primary.recommendedOrderQty * opMarginPerUnit),
  }
  const sizeRows = primary.sizeMix.map((row) => {
    const rec = Math.max(1, row.confirmedQty)
    const fq = Math.max(1, Math.round(row.qty * 0.12))
    return {
      size: row.size,
      selfSharePct: 25,
      competitorSharePct: 25,
      blendedSharePct: 25,
      forecastQty: fq,
      recommendedQty: rec,
      confirmQty: rec,
    }
  })
  const savedAt = new Date().toISOString()
  const confirmedOrderQty = sizeRows.reduce((acc, row) => acc + Math.max(0, Math.round(row.confirmQty ?? 0)), 0)
  const confirmedExpectedSalesAmount = confirmedOrderQty * unitPrice
  const confirmedExpectedOpProfit = confirmedOrderQty * opMarginPerUnit
  return ensureMockAiCommentForSnapshot({
    schemaVersion: ORDER_SNAPSHOT_SCHEMA_VERSION,
    productId,
    savedAt,
    context: {
      periodStart: '2025-01-01',
      periodEnd: '2025-12-31',
      forecastMonths: 8,
      dailyTrendStartMonth: '2025-01',
      dailyTrendLeadTimeDays: leadTimeDays,
    },
    drawer1: { summary: summarySansTrend },
    drawer2: {
      secondary,
      competitorChannelId: channel.id,
      competitorChannelLabel: channel.label,
      minOpMarginPct: null,
      salesSelf: selfCol,
      salesCompetitor: compCol,
      stockInputs,
      stockDerived,
      selfWeightPct: 50,
      sizeForecastSource: 'forecastQty',
      bufferStock: 0,
      llmPrompt: '',
      llmAnswer: '',
      confirmedTotals: {
        orderQty: confirmedOrderQty,
        expectedSalesAmount: confirmedExpectedSalesAmount,
        expectedOpProfit: confirmedExpectedOpProfit,
        expectedOpProfitRatePct: confirmedExpectedSalesAmount > 0
          ? (confirmedExpectedOpProfit / confirmedExpectedSalesAmount) * 100
          : null,
      },
      sizeRows,
    },
  })
}
