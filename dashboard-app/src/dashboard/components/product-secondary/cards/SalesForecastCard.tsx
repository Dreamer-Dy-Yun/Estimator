import { PortalHelpMark } from '../../PortalHelpPopover'
import { ApiUnitErrorBadge } from '../../../../components/ApiUnitErrorBadge'
import type { ApiUnitErrorInfo } from '../../../../types'
import { c, won } from '../../../../utils/format'
import commonStyles from '../../common.module.css'
import { usePortalHelpPopover } from '../../usePortalHelpPopover'
import { KO } from '../ko'
import styles from '../productSecondaryPanel.module.css'
import type {
  SecondaryForecastCalc,
  SecondaryForecastInputs,
  SecondaryHelpId,
} from '../secondaryPanelTypes'

type Props = {
  forecast: {
    inputs: SecondaryForecastInputs
    calc: SecondaryForecastCalc | null
    error: ApiUnitErrorInfo | null
  }
  help: {
    labelIds: {
      periodMeanColumn: string
      forecastQtyCalc: string
    }
    portal: ReturnType<typeof usePortalHelpPopover<SecondaryHelpId>>
  }
}

export function SalesForecastCard({ forecast, help }: Props) {
  const { inputs, calc, error } = forecast
  const { labelIds, portal } = help

  return (
    <div className={`${styles.card} ${styles.gridColumnCard}`}>
      <div className={styles.stockTitleRow}>
        <h3 className={styles.sectionTitle}>
          {KO.sectionSalesForecastIntegrated}
          <ApiUnitErrorBadge error={error} />
        </h3>
      </div>
      <div className={styles.stockInputList}>
        <div className={styles.stockInputCell}>
          <span className={`${styles.inlineLabel} ${styles.stockCellLabel}`}>{KO.labelDailyMeanSales}</span>
          <span className={`${styles.inlineFieldInput} ${styles.stockCellInputWrap}`}>
            <span className={`${styles.stockComputedValue} ${styles.stockFillInput}`}>
              {c(inputs.trendDailyMean)}
            </span>
            <span className={styles.inlineUnit}>EA/일</span>
          </span>
        </div>
      </div>
      <div className={styles.cardTableScroll}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>{KO.thMetric}</th>
              <th className={styles.num}>
                <span className={commonStyles.cardTitleWithHelp}>
                  {KO.thPeriodArithmeticMean}
                  <PortalHelpMark
                    helpId="stockCalcColumn"
                    placement="above"
                    labelId={labelIds.periodMeanColumn}
                    markClassName={commonStyles.helpMark}
                    help={portal}
                  />
                </span>
              </th>
              <th className={styles.num}>
                <span className={commonStyles.cardTitleWithHelp}>
                  {KO.thForecastQtyCalc}
                  <PortalHelpMark
                    helpId="forecastQtyCalc"
                    placement="above"
                    labelId={labelIds.forecastQtyCalc}
                    markClassName={commonStyles.helpMark}
                    help={portal}
                  />
                </span>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <div className={styles.stockMetricCell}>
                  <span>{KO.rowDailyMeanExpectedSales}</span>
                </div>
              </td>
              <td className={styles.num}>{c(inputs.trendDailyMean)}</td>
              <td className={styles.num}>{c(calc?.dailyMean ?? 0)}</td>
            </tr>
            <tr>
              <td>{KO.rowExpectedSales}</td>
              <td className={styles.num}>{won(calc?.safetyStockCalc.expectedSalesAmount ?? 0)}</td>
              <td className={styles.num}>{won(calc?.forecastQtyCalc.expectedSalesAmount ?? 0)}</td>
            </tr>
            <tr>
              <td>{KO.rowExpectedOpProfit}</td>
              <td className={styles.num}>{won(calc?.safetyStockCalc.expectedOpProfit ?? 0)}</td>
              <td className={styles.num}>{won(calc?.forecastQtyCalc.expectedOpProfit ?? 0)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
