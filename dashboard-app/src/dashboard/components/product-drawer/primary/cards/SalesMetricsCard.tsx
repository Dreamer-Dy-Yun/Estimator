import type { ReactNode } from 'react'
import type { SecondaryCompetitorChannel } from '../../../../../api'
import { ApiUnitErrorBadge } from '../../../../../components/ApiUnitErrorBadge'
import type { ApiUnitErrorInfo } from '../../../../../types'
import { displayNumber, formatGroupedNumber, formatPercent } from '../../../../../utils/format'
import type { SalesKpiColumn } from '../../../../../utils/salesKpiColumn'
import { KO } from '../../ko'
import styles from '../../secondary/secondaryDrawer.module.css'

type Props = {
  targetPeriodDays: { start: string; end: string }
  sales: {
    channelLabel: string
    self: SalesKpiColumn
    competitor: SalesKpiColumn
  }
  selfCompanyLabel: string
  channelFilter?: {
    channelId: string
    competitorChannels: SecondaryCompetitorChannel[]
    error: ApiUnitErrorInfo | null
    onChannelChange: (next: string) => void
  }
}

type MetricRow = { key: string; label: string; self: ReactNode; competitor: ReactNode; competitorUnavailable?: boolean }

const primaryValue = (value: string) => <span className={styles.salesMetricPrimaryValue}>{value}</span>
const formatRank = (rank: number | null, total: number) => (rank === null ? '-' : `${rank}/${total}${KO.rankSuffix}`)
const rankMetric = (value: string, rank: number, total: number) => <>{primaryValue(value)} ({formatRank(rank, total)})</>
const costMetric = (avgCost: number | null, costRatioPct: number | null) => (
  avgCost === null || costRatioPct === null ? '-' : <>{primaryValue(displayNumber.money(avgCost))} ({formatPercent(costRatioPct)})</>
)
const rateRank = (ratePct: number | null, rank: number | null, total: number) => (
  ratePct === null || rank === null ? '-' : <>{primaryValue(formatPercent(ratePct))} ({formatRank(rank, total)})</>
)

export function SalesMetricsCard({ targetPeriodDays, sales, selfCompanyLabel, channelFilter }: Props) {
  const { channelLabel, self, competitor } = sales
  const rows: MetricRow[] = [
    { key: 'avgPrice', label: KO.rowAvgPrice, self: primaryValue(displayNumber.money(self.avgPrice)), competitor: primaryValue(displayNumber.money(competitor.avgPrice)) },
    { key: 'qtyRank', label: KO.rowQtyRank, self: rankMetric(formatGroupedNumber(self.qty), self.qtyRank, self.rankTotal), competitor: rankMetric(formatGroupedNumber(competitor.qty), competitor.qtyRank, competitor.rankTotal) },
    { key: 'amountRank', label: KO.rowAmountRank, self: rankMetric(displayNumber.money(self.amount), self.amountRank, self.rankTotal), competitor: rankMetric(displayNumber.money(competitor.amount), competitor.amountRank, competitor.rankTotal) },
    { key: 'avgCost', label: KO.rowAvgCost, self: costMetric(self.avgCost, self.costRatioPct), competitor: costMetric(competitor.avgCost, competitor.costRatioPct), competitorUnavailable: competitor.avgCost === null },
    { key: 'fee', label: KO.rowFee, self: rateRank(self.feeRatePct, self.feeRank, self.rankTotal), competitor: rateRank(competitor.feeRatePct, competitor.feeRank, competitor.rankTotal), competitorUnavailable: competitor.feeRatePct === null || competitor.feeRank === null },
    { key: 'opMargin', label: KO.rowOpMargin, self: rateRank(self.opMarginRatePct, self.opMarginRank, self.rankTotal), competitor: rateRank(competitor.opMarginRatePct, competitor.opMarginRank, competitor.rankTotal), competitorUnavailable: competitor.opMarginRatePct === null || competitor.opMarginRank === null },
  ]

  return (
    <div className={`${styles.card} ${styles.gridColumnCard}`}>
      <div className={styles.salesMetricsHeader}>
        <div>
          <h3 className={styles.sectionTitle}>{KO.sectionSales}</h3>
          <p className={styles.salesMetricsPeriodLine}>{KO.salesMetricsTargetPeriod}: {targetPeriodDays.start} ~ {targetPeriodDays.end}</p>
        </div>
      </div>
      <div className={styles.cardTableScroll}>
        <table className={`${styles.table} ${styles.salesMetricsTightTable}`}>
          <thead>
            <tr>
              <th>{KO.thMetric}</th>
              <th className={`${styles.num} ${styles.salesMetricsSelfHeader}`}>{selfCompanyLabel}</th>
              <th className={`${styles.num} ${styles.salesMetricsCompetitorHeader}`}>
                {channelFilter ? (
                  <span className={styles.salesMetricsChannelHeaderControl}>
                    <select aria-label={KO.labelCompetitorChannel} value={channelFilter.channelId} onChange={(event) => channelFilter.onChannelChange(event.target.value)}>
                      {channelFilter.competitorChannels.map((channel) => <option key={channel.id} value={channel.id}>{channel.label}</option>)}
                    </select>
                    <ApiUnitErrorBadge error={channelFilter.error} />
                  </span>
                ) : channelLabel}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key}>
                <td>{row.label}</td>
                <td className={styles.num}>{row.self}</td>
                <td className={`${styles.num} ${row.competitorUnavailable ? styles.salesMetricUnavailable : ''}`}>{row.competitor}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
