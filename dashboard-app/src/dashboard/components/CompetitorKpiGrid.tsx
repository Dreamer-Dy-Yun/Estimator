import { formatGroupedNumber } from '../../utils/format'
import { KpiGrid } from './KpiGrid'
import styles from './common.module.css'

export type Props = {
  competitorLabel: string
  selfCompanyLabel: string
  totalCompetitorAmount: number
  totalSelfAmount: number | null
  totalCompetitorQty: number
  totalSelfQty: number | null
}

const kpiValue: (value: number | null) => string = (value: number | null) : string => (value == null ? '-' : formatGroupedNumber(value))

const competitorName: (label: string) => React.JSX.Element = (label: string) : React.JSX.Element => <span className={styles.analysisCompetitorSeriesLabel}>{label}</span>
const selfName: (label: string) => React.JSX.Element = (label: string) : React.JSX.Element => <span className={styles.analysisSelfSeriesLabel}>{label}</span>

export function CompetitorKpiGrid({
  competitorLabel,
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
        { id: 'competitor-amount', label: <>{competitorName(competitorLabel)} 총 판매액</>, value: formatGroupedNumber(totalCompetitorAmount), unit: '원' },
        { id: 'self-amount', label: <>{selfName(selfCompanyLabel)} 총 판매액</>, value: kpiValue(totalSelfAmount), unit: totalSelfAmount == null ? '' : '원' },
        { id: 'competitor-qty', label: <>{competitorName(competitorLabel)} 총 판매량</>, value: formatGroupedNumber(totalCompetitorQty), unit: 'EA' },
        { id: 'self-qty', label: <>{selfName(selfCompanyLabel)} 총 판매량</>, value: kpiValue(totalSelfQty), unit: totalSelfQty == null ? '' : 'EA' },
      ]}
    />
  )
}
