import type { ProductComparisonComparisonSubjectRef, ProductComparisonSubjectRef, ProductSecondaryDetail } from '..'
import type { ProductSecondarySizeRow } from '../../types'
import type { SalesKpiColumn } from '../../utils/salesKpiColumn'
import type { ProductPrimarySummary } from '../types'
import { buildSalesKpiColumn } from '../../utils/salesKpiColumn'
import type { SecondaryAiCommentParams } from '../types'
import { getCompanyUuidForOptionalScope } from '../types'
import { MOCK_COMPANIES, scopeMockProductPrimary, scopeMockProductSecondary } from './mockCompanyScope'
import { requireMockProductPrimary, requireMockProductSecondary } from './mockProductLookup'
import { getMockSecondaryCompetitorChannel } from './salesTables'

const koNumber: Intl.NumberFormat = new Intl.NumberFormat('ko-KR')
const formatEa: (value: number) => string = (value: number) : string => `${koNumber.format(Math.max(0, Math.round(value)))}EA`
const formatWon: (value: number) => string = (value: number) : string => `${koNumber.format(Math.max(0, Math.round(value)))}원`

function requireNumber(value: number | null | undefined, label: string) : number {
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error(`Missing mock numeric value: ${label}`)
  return value
}

function selfCompanySubjectScope(subject: ProductComparisonSubjectRef): { companyUuid?: string } {
  const companyUuid: string | undefined = getCompanyUuidForOptionalScope(subject.sourceId)
  return companyUuid == null ? {} : { companyUuid }
}

function selfCompanyLabel(sourceId: string | undefined): string {
  const companyUuid: string | undefined = getCompanyUuidForOptionalScope(sourceId)
  if (companyUuid == null) return '자사전체'
  const company: { uuid: string; name: string } | undefined = MOCK_COMPANIES.find(
    (candidate: { uuid: string; name: string }) : boolean => candidate.uuid === companyUuid,
  )
  if (company == null) throw new Error(`Unknown mock self-company subject: ${sourceId}`)
  return company.name
}

function comparisonLabel(subject: ProductComparisonComparisonSubjectRef): string {
  return subject.kind === 'competitor-channel'
    ? getMockSecondaryCompetitorChannel(subject.sourceId).label
    : selfCompanyLabel(subject.sourceId)
}

export function buildSecondaryAiComment(params: SecondaryAiCommentParams) : { prompt: string; answer: string; generatedAt: string; } {
  const primary: ProductPrimarySummary = scopeMockProductPrimary(requireMockProductPrimary(params.skuGroupKey), selfCompanySubjectScope(params.base))
  const secondary: ProductSecondaryDetail = scopeMockProductSecondary(requireMockProductSecondary(params.skuGroupKey), selfCompanySubjectScope(params.base))
  const subjectLabel: string = comparisonLabel(params.comparison)
  const selfCol: SalesKpiColumn = buildSalesKpiColumn('self', primary, secondary, { id: 'base', label: selfCompanyLabel(params.base.sourceId) })
  const comparisonCol: SalesKpiColumn = params.comparison.kind === 'competitor-channel'
    ? buildSalesKpiColumn('competitor', primary, secondary, getMockSecondaryCompetitorChannel(params.comparison.sourceId))
    : buildSalesKpiColumn(
      'self',
      scopeMockProductPrimary(requireMockProductPrimary(params.skuGroupKey), selfCompanySubjectScope(params.comparison)),
      scopeMockProductSecondary(requireMockProductSecondary(params.skuGroupKey), selfCompanySubjectScope(params.comparison)),
      { id: params.comparison.sourceId ?? 'all', label: subjectLabel },
    )
  const comparisonQty: number = Math.max(0, Math.round(comparisonCol.qty))
  const selfQty: number = Math.max(0, Math.round(selfCol.qty))
  const recommendedQty: number = secondary.sizeRows.reduce((sum: number, row: ProductSecondarySizeRow) : number => sum + Math.max(0, Math.round(row.confirmedQty)), 0)
  const topSize: ProductSecondarySizeRow = secondary.sizeRows.reduce((best: ProductSecondarySizeRow, row: ProductSecondarySizeRow) : ProductSecondarySizeRow => (row.qty > best.qty ? row : best), secondary.sizeRows[0]!)

  return {
    prompt: [
      `${primary.brand} ${primary.productName} 2차 드로워 AI 코멘트를 작성하세요.`,
      `참조 기간 ${params.periodStart}~${params.periodEnd}, 예측 ${params.forecastMonths}개월, 비교 대상 ${subjectLabel}.`,
      params.candidateItemUuid ? `후보 아이템 UUID: ${params.candidateItemUuid}` : '후보 아이템 저장 전 live 요청입니다.',
    ].join('\n'),
    answer: [
      `${primary.productName}은(는) ${subjectLabel} 기준 비교 판매 ${formatEa(comparisonQty)}, 자사 판매 ${formatEa(selfQty)}로 확인됩니다.`,
      comparisonQty > selfQty
        ? `비교 대상 판매가 자사보다 ${formatEa(comparisonQty - selfQty)} 높습니다. 입고 전 판매 속도와 잔량을 우선 확인하세요.`
        : '자사 판매가 비교 대상 대비 낮지 않습니다. 현재 오더 수량은 재고 여유와 이익률 중심으로 조정하면 됩니다.',
      `추천 수량은 ${formatEa(recommendedQty)}, 예상 원가는 약 ${formatWon(recommendedQty * Math.round(requireNumber(selfCol.avgCost, 'self avgCost')))}입니다.`,
      `${topSize.size} 사이즈 판매 비중이 커서 사이즈별 오더 조정 전 우선 확인이 필요합니다.`,
    ].join('\n'),
    generatedAt: new Date().toISOString(),
  }
}
