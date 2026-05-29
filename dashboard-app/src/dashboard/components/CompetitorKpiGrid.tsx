import { formatGroupedNumber } from '../../utils/format'
import { KpiGrid } from './KpiGrid'

type Props = {
  selfCompanyLabel: string
  totalCompetitorAmount: number
  totalSelfAmount: number | null
  totalCompetitorQty: number
  totalSelfQty: number | null
}

const kpiValue = (value: number | null) => (value == null ? '-' : formatGroupedNumber(value))

export function CompetitorKpiGrid({
  selfCompanyLabel,
  totalCompetitorAmount,
  totalSelfAmount,
  totalCompetitorQty,
  totalSelfQty,
}: Props) {
  return (
    <KpiGrid
      stacked
      items={[
        { label: '총 경쟁사 판매액', value: formatGroupedNumber(totalCompetitorAmount), unit: '원' },
        { label: `총 ${selfCompanyLabel} 판매액`, value: kpiValue(totalSelfAmount), unit: totalSelfAmount == null ? '' : '원' },
        { label: '총 경쟁사 판매량', value: formatGroupedNumber(totalCompetitorQty), unit: 'EA' },
        { label: `총 ${selfCompanyLabel} 판매량`, value: kpiValue(totalSelfQty), unit: totalSelfQty == null ? '' : 'EA' },
      ]}
    />
  )
}
