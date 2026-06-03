import type { ProductSecondaryDetail } from '..'
import type { ProductSecondarySizeRow } from '../../types'
import type { SalesKpiColumn } from '../../utils/salesKpiColumn'
import type { ProductPrimarySummary } from '../types'
import type { MockSecondaryCompetitorChannel } from './salesTables'
import { buildSalesKpiColumn } from '../../utils/salesKpiColumn'
import type { SecondaryAiCommentParams } from '../types'
import { scopeMockProductPrimary, scopeMockProductSecondary } from './mockCompanyScope'
import { requireMockProductPrimary, requireMockProductSecondary } from './mockProductLookup'
import { getMockSecondaryCompetitorChannel } from './salesTables'

const koNumber: Intl.NumberFormat = new Intl.NumberFormat('ko-KR')
const formatEa: (value: number) => string = (value: number) : string => `${koNumber.format(Math.max(0, Math.round(value)))}EA`
const formatWon: (value: number) => string = (value: number) : string => `${koNumber.format(Math.max(0, Math.round(value)))}원`

function requireNumber(value: number | null | undefined, label: string) : number {
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error(`Missing mock numeric value: ${label}`)
  return value
}

export function buildSecondaryAiComment(params: SecondaryAiCommentParams) : { prompt: string; answer: string; generatedAt: string; } {
  const primary: ProductPrimarySummary = scopeMockProductPrimary(requireMockProductPrimary(params.skuGroupKey), params)
  const secondary: ProductSecondaryDetail = scopeMockProductSecondary(requireMockProductSecondary(params.skuGroupKey), params)
  const channel: MockSecondaryCompetitorChannel = getMockSecondaryCompetitorChannel(params.competitorChannelId)
  const selfCol: SalesKpiColumn = buildSalesKpiColumn('self', primary, secondary, channel)
  const competitorCol: SalesKpiColumn = buildSalesKpiColumn('competitor', primary, secondary, channel)
  const competitorQty: number = Math.max(0, Math.round(competitorCol.qty))
  const selfQty: number = Math.max(0, Math.round(selfCol.qty))
  const recommendedQty: number = secondary.sizeRows.reduce((sum: number, row: ProductSecondarySizeRow) : number => sum + Math.max(0, Math.round(row.confirmedQty)), 0)
  const topSize: ProductSecondarySizeRow = secondary.sizeRows.reduce((best: ProductSecondarySizeRow, row: ProductSecondarySizeRow) : ProductSecondarySizeRow => (row.qty > best.qty ? row : best), secondary.sizeRows[0]!)

  return {
    prompt: [
      `${primary.brand} ${primary.productName} 2차 드로워 AI 코멘트를 작성하세요.`,
      `참조 기간 ${params.periodStart}~${params.periodEnd}, 예측 ${params.forecastMonths}개월, 경쟁 채널 ${channel.label}.`,
      params.candidateItemUuid ? `후보 아이템 UUID: ${params.candidateItemUuid}` : '후보 아이템 저장 전 live 요청입니다.',
    ].join('\n'),
    answer: [
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
