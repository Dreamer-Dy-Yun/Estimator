import { ApiUnitErrorBadge } from '../../../../components/ApiUnitErrorBadge'
import type { SecondaryCompetitorChannel } from '../../../../api'
import type { ApiUnitErrorInfo } from '../../../../types'
import { formatGroupedNumber, formatPercent } from '../../../../utils/format'
import { KO } from '../ko'
import styles from '../productSecondaryPanel.module.css'
import type { SalesKpiColumn } from '../secondaryPanelTypes'

type Props = {
  /** 분석 구간 — 월 키를 해당 월 1일~말일(일 단위)로 표시 */
  targetPeriodDays: { start: string; end: string }
  sales: {
    channelLabel: string
    self: SalesKpiColumn
    competitor: SalesKpiColumn
  }
  channelFilter?: {
    channelId: string
    competitorChannels: SecondaryCompetitorChannel[]
    error: ApiUnitErrorInfo | null
    onChannelChange: (next: string) => void
  }
}

export function SalesMetricsCard({ targetPeriodDays, sales, channelFilter }: Props) {
  const { channelLabel, self: selfCol, competitor: compCol } = sales
  const formatRank = (rank: number | null, total: number) =>
    rank === null ? '-' : `${rank}/${total}${KO.rankSuffix}`
  const formatRateRank = (ratePct: number | null, rank: number | null, total: number) =>
    ratePct === null || rank === null ? '-' : `${formatPercent(ratePct)}, ${formatRank(rank, total)}`

  return (
    <div className={`${styles.card} ${styles.gridColumnCard}`}>
      <div className={styles.salesMetricsHeader}>
        <div>
          <h3 className={styles.sectionTitle}>{KO.sectionSales}</h3>
          <p className={styles.salesMetricsPeriodLine}>
            {KO.salesMetricsTargetPeriod}: {targetPeriodDays.start} ~ {targetPeriodDays.end}
          </p>
        </div>
        {channelFilter && (
          <label className={styles.salesMetricsChannelControl}>
            <select
              aria-label={KO.labelCompetitorChannel}
              value={channelFilter.channelId}
              onChange={(e) => channelFilter.onChannelChange(e.target.value)}
            >
              {channelFilter.competitorChannels.map((ch) => (
                <option key={ch.id} value={ch.id}>{ch.label}</option>
              ))}
            </select>
            <ApiUnitErrorBadge error={channelFilter.error} />
          </label>
        )}
      </div>
      <div className={styles.cardTableScroll}>
        <table className={`${styles.table} ${styles.salesMetricsTightTable}`}>
          <thead>
            <tr>
              <th>{KO.thMetric}</th>
              <th className={styles.num}>{KO.thSelf}</th>
              <th className={styles.num}>{channelLabel}</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>{KO.rowAvgPrice}</td>
              <td className={styles.num}>{formatGroupedNumber(selfCol.avgPrice)}</td>
              <td className={styles.num}>{formatGroupedNumber(compCol.avgPrice)}</td>
            </tr>
            <tr>
              <td>{KO.rowQtyRank}</td>
              <td className={styles.num}>{formatGroupedNumber(selfCol.qty)} ({formatRank(selfCol.qtyRank, selfCol.rankTotal)})</td>
              <td className={styles.num}>{formatGroupedNumber(compCol.qty)} ({formatRank(compCol.qtyRank, compCol.rankTotal)})</td>
            </tr>
            <tr>
              <td>{KO.rowAmountRank}</td>
              <td className={styles.num}>{formatGroupedNumber(selfCol.amount)} ({formatRank(selfCol.amountRank, selfCol.rankTotal)})</td>
              <td className={styles.num}>{formatGroupedNumber(compCol.amount)} ({formatRank(compCol.amountRank, compCol.rankTotal)})</td>
            </tr>
            <tr>
              <td>{KO.rowAvgCost}</td>
              <td className={styles.num}>
                {formatGroupedNumber(selfCol.avgCost!)} ({formatPercent(selfCol.costRatioPct!)})
              </td>
              <td
                className={`${styles.num} ${compCol.avgCost === null ? styles.salesMetricUnavailable : ''}`}
              >
                {compCol.avgCost === null ? '-' : `${formatGroupedNumber(compCol.avgCost)} (${formatPercent(compCol.costRatioPct!)})`}
              </td>
            </tr>
            <tr>
              <td>{KO.rowFee}</td>
              <td className={styles.num}>
                {formatGroupedNumber(selfCol.feePerUnit!)} ({formatRateRank(selfCol.feeRatePct, selfCol.feeRank, selfCol.rankTotal)})
              </td>
              <td
                className={`${styles.num} ${compCol.feePerUnit === null ? styles.salesMetricUnavailable : ''}`}
              >
                {compCol.feePerUnit === null
                  ? '-'
                  : `${formatGroupedNumber(compCol.feePerUnit)} (${formatRateRank(compCol.feeRatePct, compCol.feeRank, compCol.rankTotal)})`}
              </td>
            </tr>
            <tr>
              <td>{KO.rowOpMargin}</td>
              <td className={styles.num}>
                {formatGroupedNumber(selfCol.opMarginPerUnit!)} ({formatRateRank(selfCol.opMarginRatePct, selfCol.opMarginRank, selfCol.rankTotal)})
              </td>
              <td
                className={`${styles.num} ${compCol.opMarginPerUnit === null ? styles.salesMetricUnavailable : ''}`}
              >
                {compCol.opMarginPerUnit === null
                  ? '-'
                  : `${formatGroupedNumber(compCol.opMarginPerUnit)} (${formatRateRank(compCol.opMarginRatePct, compCol.opMarginRank, compCol.rankTotal)})`}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
