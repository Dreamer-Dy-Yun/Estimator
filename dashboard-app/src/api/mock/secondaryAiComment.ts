import { buildSalesKpiColumn } from '../../utils/salesKpiColumn'
import type { SecondaryAiCommentParams } from '../types'
import { getMockSecondaryCompetitorChannel } from './salesTables'
import { productPrimaryBySkuGroupKey, productSecondaryBySkuGroupKey } from './productCatalog'

const koNumber = new Intl.NumberFormat('ko-KR')

function formatEa(value: number | null | undefined) {
  if (value == null) return '확인 필요'
  return `${koNumber.format(Math.max(0, Math.round(value)))}EA`
}

function formatWon(value: number | null | undefined) {
  if (value == null) return '확인 필요'
  return `${koNumber.format(Math.max(0, Math.round(value)))}원`
}

function requireProductPrimary(skuGroupKey: string) {
  const primary = productPrimaryBySkuGroupKey[skuGroupKey]
  if (!primary) throw new Error(`Unknown mock product primary: ${skuGroupKey}`)
  return primary
}

function requireProductSecondary(skuGroupKey: string) {
  const secondary = productSecondaryBySkuGroupKey[skuGroupKey]
  if (!secondary) throw new Error(`Unknown mock product secondary: ${skuGroupKey}`)
  return secondary
}

function requireNumber(value: number | null | undefined, label: string) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`Missing mock numeric value: ${label}`)
  }
  return value
}

export function buildSecondaryAiComment(params: SecondaryAiCommentParams) {
  const primary = requireProductPrimary(params.skuGroupKey)
  const secondary = requireProductSecondary(params.skuGroupKey)
  const channel = getMockSecondaryCompetitorChannel(params.competitorChannelId)
  const selfCol = buildSalesKpiColumn('self', primary, secondary, channel)
  const competitorCol = buildSalesKpiColumn('competitor', primary, secondary, channel)
  const topSize = primary.sizeMix.reduce<(typeof primary.sizeMix)[number] | null>(
    (best, row) => (best == null || row.qty > best.qty ? row : best),
    null,
  )
  const competitorQty = Math.max(0, Math.round(competitorCol.qty))
  const selfQty = Math.max(0, Math.round(selfCol.qty))
  const qtyGap = competitorQty - selfQty
  const prompt = [
    `${primary.brand} ${primary.productName}(${primary.code}/${primary.colorCode})의 2차 드로워 AI 코멘트를 작성해 주세요.`,
    `데이터 참조기간 ${params.periodStart}~${params.periodEnd}, 예측 개월 ${params.forecastMonths}, 경쟁 채널 ${channel.label} 기준입니다.`,
    params.candidateItemUuid ? `후보 아이템 UUID: ${params.candidateItemUuid}` : '후보 아이템 저장 전 live 검토입니다.',
  ].join('\n')
  const answer = [
    `${primary.productName}은(는) ${channel.label} 기준 경쟁 판매량 ${formatEa(competitorQty)}, 자사 판매량 ${formatEa(selfQty)}로 확인됩니다.`,
    qtyGap > 0
      ? `경쟁 채널 판매량이 자사보다 ${formatEa(qtyGap)} 높아, 입고 전 판매 속도와 노출 조건을 먼저 점검하는 편이 좋습니다.`
      : `자사 판매량이 경쟁 채널 대비 밀리지 않아, 현재 오더 수량은 재고 여유와 이익률 중심으로 조정하면 됩니다.`,
    `추천 오더 기준 수량은 ${formatEa(primary.recommendedOrderQty)}, 예상 주문 원가는 약 ${formatWon(primary.recommendedOrderQty * Math.round(requireNumber(selfCol.avgCost, 'self avgCost')))}입니다.`,
    topSize
      ? `${topSize.size} 사이즈 판매 비중이 가장 커서 사이즈별 오더 조정 시 우선 확인하세요.`
      : '사이즈별 판매 비중 데이터가 비어 있어, 저장 전 사이즈 배분 확인이 필요합니다.',
  ].join('\n')
  return {
    llmPrompt: prompt,
    llmAnswer: answer,
    generatedAt: new Date().toISOString(),
  }
}
