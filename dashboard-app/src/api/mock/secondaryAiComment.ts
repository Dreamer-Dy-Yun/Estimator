import type { ProductComparisonComparisonSubjectRef, ProductComparisonSubjectRef, ProductSecondaryDetail } from '..'
import type { ProductSecondarySizeRow } from '../../types'
import type { SalesKpiColumn } from '../../utils/salesKpiColumn'
import type { ProductPrimarySummary } from '../types'
import { buildSalesKpiColumn } from '../../utils/salesKpiColumn'
import type { SecondaryAiCommentParams } from '../types'
import { getCompanyUuidForOptionalScope } from '../types'
import { MOCK_COMPANIES, scopeMockProductPrimary, scopeMockProductSecondary } from './mockCompanyScope'
import { formatMockEa, formatMockWon } from './mockNumberFormat'
import { requireMockProductPrimary, requireMockProductSecondary } from './mockProductLookup'
import { getMockSecondaryCompetitorChannel } from './salesTables'

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
  const answerLines: string[] = [
    `${primary.productName}은(는) ${subjectLabel} 기준 비교 판매 ${formatMockEa(comparisonQty)}, 자사 판매 ${formatMockEa(selfQty)}로 확인됩니다.`,
    comparisonQty > selfQty
      ? `비교 대상 판매가 자사보다 ${formatMockEa(comparisonQty - selfQty)} 높습니다. 입고 전 판매 속도와 잔량을 우선 확인하세요.`
      : '자사 판매가 비교 대상 대비 낮지 않습니다. 현재 오더 수량은 재고 여유와 이익률 중심으로 조정하면 됩니다.',
    `추천 수량은 ${formatMockEa(recommendedQty)}, 예상 원가는 약 ${formatMockWon(recommendedQty * Math.round(requireNumber(selfCol.avgCost, 'self avgCost')))}입니다.`,
    `${topSize.size} 사이즈 판매 비중이 커서 사이즈별 오더 조정 전 우선 확인이 필요합니다.`,
  ]
  const displayAnswerLines: string[] = primary.code === 'TEST-SHOE'
    ? [
        ...answerLines,
        '이 응답은 AI 코멘트 카드의 스크롤, 한번에 보기 버튼, 긴 문장 줄바꿈을 확인하기 위한 장문 mock 응답입니다.',
        '테스트 신발은 비교 대상과 자사 판매량 차이가 크지 않은 상품이므로 총 판매량 하나만으로는 오더 판단이 어렵습니다. 판매 속도, 현재 재고, 입고 잔량, 사이즈별 확정 수량을 함께 봐야 하며, 특히 상위 사이즈에 확정 수량이 집중될 때 품절과 과잉 재고가 동시에 발생할 수 있습니다.',
        '비교 대상의 사이즈 비중이 자사와 다르면 같은 총량이라도 실제 추천 수량은 달라져야 합니다. 자사 데이터에서 판매가 약한 사이즈라도 비교 대상에서 수요가 강하게 보이면 시연 화면에서는 해당 사이즈를 유지하거나 소폭 보강하는 판단을 검토할 수 있습니다.',
        '이 장문은 실제 운영 판단 문구라기보다 UI 검증용 데이터입니다. 카드 높이가 고정되고 본문만 스크롤되는지, 버튼이 필요한 경우에만 나타나는지, 한번에 보기 상태에서 아래 카드와 표가 밀리는지 확인하는 기준으로 사용합니다.',
      ]
    : answerLines

  return {
    prompt: [
      `${primary.brand} ${primary.productName} 2차 드로워 AI 코멘트를 작성하세요.`,
      `참조 기간 ${params.periodStart}~${params.periodEnd}, 예측 ${params.forecastMonths}개월, 비교 대상 ${subjectLabel}.`,
      params.candidateItemUuid ? `후보 아이템 UUID: ${params.candidateItemUuid}` : '후보 아이템 저장 전 live 요청입니다.',
    ].join('\n'),
    answer: displayAnswerLines.join('\n'),
    generatedAt: new Date().toISOString(),
  }
}
