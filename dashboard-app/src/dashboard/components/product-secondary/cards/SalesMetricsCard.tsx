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
}

export function SalesMetricsCard({ targetPeriodDays, sales }: Props) {
  const { channelLabel, self: selfCol, competitor: compCol } = sales
  return (
    <div className={`${styles.card} ${styles.gridColumnCard}`}>
      <h3 className={styles.sectionTitle}>{KO.sectionSales}</h3>
      <p className={styles.salesMetricsPeriodLine}>
        {KO.salesMetricsTargetPeriod}: {targetPeriodDays.start} ~ {targetPeriodDays.end}
      </p>
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
              <td className={styles.num}>{formatGroupedNumber(selfCol.qty)} ({selfCol.qtyRank}{KO.rankSuffix})</td>
              <td className={styles.num}>{formatGroupedNumber(compCol.qty)} ({compCol.qtyRank}{KO.rankSuffix})</td>
            </tr>
            <tr>
              <td>{KO.rowAmountRank}</td>
              <td className={styles.num}>{formatGroupedNumber(selfCol.amount)} ({selfCol.amountRank}{KO.rankSuffix})</td>
              <td className={styles.num}>{formatGroupedNumber(compCol.amount)} ({compCol.amountRank}{KO.rankSuffix})</td>
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
              <td>{KO.rowGrossMarginUnit}</td>
              <td className={styles.num}>{formatGroupedNumber(selfCol.grossMarginPerUnit!)}</td>
              <td
                className={`${styles.num} ${compCol.grossMarginPerUnit === null ? styles.salesMetricUnavailable : ''}`}
              >
                {compCol.grossMarginPerUnit === null ? '-' : formatGroupedNumber(compCol.grossMarginPerUnit)}
              </td>
            </tr>
            <tr>
              <td>{KO.rowFee}</td>
              <td className={styles.num}>
                {formatGroupedNumber(selfCol.feePerUnit!)} ({formatPercent(selfCol.feeRatePct!)})
              </td>
              <td
                className={`${styles.num} ${compCol.feePerUnit === null ? styles.salesMetricUnavailable : ''}`}
              >
                {compCol.feePerUnit === null ? '-' : `${formatGroupedNumber(compCol.feePerUnit)} (${formatPercent(compCol.feeRatePct!)})`}
              </td>
            </tr>
            <tr>
              <td>{KO.rowOpMargin}</td>
              <td className={styles.num}>
                {formatGroupedNumber(selfCol.opMarginPerUnit!)} ({formatPercent(selfCol.opMarginRatePct!)})
              </td>
              <td
                className={`${styles.num} ${compCol.opMarginPerUnit === null ? styles.salesMetricUnavailable : ''}`}
              >
                {compCol.opMarginPerUnit === null
                  ? '-'
                  : `${formatGroupedNumber(compCol.opMarginPerUnit)} (${formatPercent(compCol.opMarginRatePct!)})`}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
