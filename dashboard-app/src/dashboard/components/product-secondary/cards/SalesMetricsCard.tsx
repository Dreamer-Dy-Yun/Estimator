import { c, pct, won } from '../../../../utils/format'
import { KO } from '../ko'
import styles from '../productSecondaryPanel.module.css'
import type { SalesKpiColumn } from '../secondaryPanelTypes'

type Props = {
  sales: {
    channelLabel: string
    self: SalesKpiColumn
    competitor: SalesKpiColumn
  }
}

export function SalesMetricsCard({ sales }: Props) {
  const { channelLabel, self: selfCol, competitor: compCol } = sales
  return (
    <div className={`${styles.card} ${styles.gridColumnCard}`}>
      <h3 className={styles.sectionTitle}>{KO.sectionSales}</h3>
      <div className={styles.cardTableScroll}>
        <table className={styles.table}>
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
              <td className={styles.num}>{won(selfCol.avgPrice)}</td>
              <td className={styles.num}>{won(compCol.avgPrice)}</td>
            </tr>
            <tr>
              <td>{KO.rowQtyRank}</td>
              <td className={styles.num}>{c(selfCol.qty)} ({selfCol.qtyRank}{KO.rankSuffix})</td>
              <td className={styles.num}>{c(compCol.qty)} ({compCol.qtyRank}{KO.rankSuffix})</td>
            </tr>
            <tr>
              <td>{KO.rowAmountRank}</td>
              <td className={styles.num}>{won(selfCol.amount)} ({selfCol.amountRank}{KO.rankSuffix})</td>
              <td className={styles.num}>{won(compCol.amount)} ({compCol.amountRank}{KO.rankSuffix})</td>
            </tr>
            <tr>
              <td>{KO.rowAvgCost}</td>
              <td className={styles.num}>{won(selfCol.avgCost)} ({pct(selfCol.costRatioPct)})</td>
              <td className={styles.num}>{won(compCol.avgCost)} ({pct(compCol.costRatioPct)})</td>
            </tr>
            <tr>
              <td>{KO.rowGrossMarginUnit}</td>
              <td className={styles.num}>{won(selfCol.grossMarginPerUnit)}</td>
              <td className={styles.num}>{won(compCol.grossMarginPerUnit)}</td>
            </tr>
            <tr>
              <td>{KO.rowFee}</td>
              <td className={styles.num}>{won(selfCol.feePerUnit)} ({pct(selfCol.feeRatePct)})</td>
              <td className={styles.num}>{won(compCol.feePerUnit)} ({pct(compCol.feeRatePct)})</td>
            </tr>
            <tr>
              <td>{KO.rowOpMargin}</td>
              <td className={styles.num}>{won(selfCol.opMarginPerUnit)} ({pct(selfCol.opMarginRatePct)})</td>
              <td className={styles.num}>{won(compCol.opMarginPerUnit)} ({pct(compCol.opMarginRatePct)})</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
