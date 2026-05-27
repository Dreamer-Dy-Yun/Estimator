import { buildSalesKpiColumn } from '../../utils/salesKpiColumn'
import type { SecondaryAiCommentParams } from '../types'
import { requireMockProductPrimary, requireMockProductSecondary } from './mockProductLookup'
import { getMockSecondaryCompetitorChannel } from './salesTables'

const koNumber = new Intl.NumberFormat('ko-KR')
const formatEa = (value: number) => `${koNumber.format(Math.max(0, Math.round(value)))}EA`
const formatWon = (value: number) => `${koNumber.format(Math.max(0, Math.round(value)))}원`

function requireNumber(value: number | null | undefined, label: string) {
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error(`Missing mock numeric value: ${label}`)
  return value
}

export function buildSecondaryAiComment(params: SecondaryAiCommentParams) {
  const primary = requireMockProductPrimary(params.skuGroupKey)
  const secondary = requireMockProductSecondary(params.skuGroupKey)
  const channel = getMockSecondaryCompetitorChannel(params.competitorChannelId)
  const selfCol = buildSalesKpiColumn('self', primary, secondary, channel)
  const competitorCol = buildSalesKpiColumn('competitor', primary, secondary, channel)
  const competitorQty = Math.max(0, Math.round(competitorCol.qty))
  const selfQty = Math.max(0, Math.round(selfCol.qty))
  const recommendedQty = secondary.sizeRows.reduce((sum, row) => sum + Math.max(0, Math.round(row.confirmedQty)), 0)
  const topSize = secondary.sizeRows.reduce((best, row) => (row.qty > best.qty ? row : best), secondary.sizeRows[0]!)

  return {
    llmPrompt: [
      `${primary.brand} ${primary.productName} 2차 드로워 AI 코멘트를 작성하세요.`,
      `참조 기간 ${params.periodStart}~${params.periodEnd}, 예측 ${params.forecastMonths}개월, 경쟁 채널 ${channel.label}.`,
      params.candidateItemUuid ? `후보 아이템 UUID: ${params.candidateItemUuid}` : '후보 아이템 저장 전 live 요청입니다.',
    ].join('\n'),
    llmAnswer: [
      `${primary.productName}은(는) ${channel.label} 기준 경쟁 판매 ${formatEa(competitorQty)}, 자사 판매 ${formatEa(selfQty)}로 확인됩니다.`,
      competitorQty > selfQty
        ? `경쟁 채널 판매가 자사보다 ${formatEa(competitorQty - selfQty)} 높습니다. 입고 전 판매 속도와 잔량을 우선 확인하세요.`
        : '자사 판매가 경쟁 채널 대비 낮지 않습니다. 현재 오더 수량은 재고 여유와 이익률 중심으로 조정하면 됩니다.',
      `추천 수량은 ${formatEa(recommendedQty)}, 예상 원가는 약 ${formatWon(recommendedQty * Math.round(requireNumber(selfCol.avgCost, 'self avgCost')))}입니다.`,
      `${topSize.size} 사이즈 판매 비중이 커서 사이즈별 오더 조정 전 우선 확인이 필요합니다.`,
    ].join('\n'),
    generatedAt: new Date().toISOString(),
  }
}
