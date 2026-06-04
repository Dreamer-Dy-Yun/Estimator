import { formatGroupedNumber } from '../../utils/format'
import { KpiGrid } from './KpiGrid'

export type Props = {
  selfCompanyLabel: string
  totalCompetitorAmount: number
  totalSelfAmount: number | null
  totalCompetitorQty: number
  totalSelfQty: number | null
}

const kpiValue: (value: number | null) => string = (value: number | null) : string => (value == null ? '-' : formatGroupedNumber(value))

export function CompetitorKpiGrid({
  selfCompanyLabel,
  totalCompetitorAmount,
  totalSelfAmount,
  totalCompetitorQty,
  totalSelfQty,
}: Props) : React.JSX.Element {
  return (
    <KpiGrid
      stacked
      items={[
        { label: '경쟁사 총 판매액', value: formatGroupedNumber(totalCompetitorAmount), unit: '원' },
        { label: `${selfCompanyLabel} 총 판매액`, value: kpiValue(totalSelfAmount), unit: totalSelfAmount == null ? '' : '원' },
        { label: '경쟁사 총 판매량', value: formatGroupedNumber(totalCompetitorQty), unit: 'EA' },
        { label: `${selfCompanyLabel} 총 판매량`, value: kpiValue(totalSelfQty), unit: totalSelfQty == null ? '' : 'EA' },
      ]}
    />
  )
}
