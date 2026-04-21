import { PortalHelpMark } from '../../PortalHelpPopover'
import { ApiUnitErrorBadge } from '../../../../components/ApiUnitErrorBadge'
import type { ApiUnitErrorInfo } from '../../../../types'
import { c, won } from '../../../../utils/format'
import commonStyles from '../../common.module.css'
import { usePortalHelpPopover } from '../../usePortalHelpPopover'
import { KO } from '../ko'
import styles from '../productSecondaryPanel.module.css'
import type { SecondaryForecastInputs, SecondaryHelpId } from '../secondaryPanelTypes'

export type SalesForecastComputedTable = {
  /** 사이즈별 추천 수량 합 — 예상 열 */
  recommendedOrderQtyTotal: number
  /** 사이즈별 확정 수량 합 — 확정 열 */
  confirmedOrderQtyTotal: number
  forecastExpectedSales: number
  forecastOpProfit: number
  confirmedExpectedSales: number
  confirmedOpProfit: number
}

type Props = {
  forecast: {
    inputs: SecondaryForecastInputs
    error: ApiUnitErrorInfo | null
    /** 클라이언트 연산 표시값 — API 응답 금액 미사용 */
    computed: SalesForecastComputedTable
  }
  orderSettings: {
    currentOrderDate: string
    nextOrderDate: string
    minOrderDate: string
    bufferStock: number
    unitCost: number
    unitPrice: number
    expectedFeeRatePct: number
  }
  actions: {
    onCurrentOrderDateChange: (next: string) => void
    onNextOrderDateChange: (next: string) => void
    onBufferStockChange: (next: number) => void
    onUnitCostChange: (next: number) => void
    onUnitPriceChange: (next: number) => void
    onExpectedFeeRatePctChange: (next: number) => void
  }
  help: {
    labelIds: {
      forecastQtyCalc: string
    }
    portal: ReturnType<typeof usePortalHelpPopover<SecondaryHelpId>>
  }
}

export function SalesForecastCard({ forecast, orderSettings, actions, help }: Props) {
  const { inputs, error, computed } = forecast
  const {
    currentOrderDate,
    nextOrderDate,
    minOrderDate,
    bufferStock,
    unitCost,
    unitPrice,
    expectedFeeRatePct,
  } = orderSettings
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
          <span className={`${styles.inlineLabel} ${styles.stockCellLabel}`}>{KO.labelCurrentOrderDate}</span>
          <span className={`${styles.inlineFieldInput} ${styles.stockCellInputWrap}`}>
            <input
              type="date"
              className={`${styles.stockDateInput} ${styles.stockFillInput}`}
              min={minOrderDate}
              value={currentOrderDate}
              onChange={(e) => actions.onCurrentOrderDateChange(e.target.value)}
              aria-label={KO.labelCurrentOrderDate}
            />
          </span>
        </div>
        <div className={styles.stockInputCell}>
          <span className={`${styles.inlineLabel} ${styles.stockCellLabel}`}>{KO.labelNextOrderDate}</span>
          <span className={`${styles.inlineFieldInput} ${styles.stockCellInputWrap}`}>
            <input
              type="date"
              className={`${styles.stockDateInput} ${styles.stockFillInput}`}
              min={currentOrderDate >= minOrderDate ? currentOrderDate : minOrderDate}
              value={nextOrderDate}
              onChange={(e) => actions.onNextOrderDateChange(e.target.value)}
              aria-label={KO.labelNextOrderDate}
            />
          </span>
        </div>
        <div className={styles.stockInputCell}>
          <span className={`${styles.inlineLabel} ${styles.stockCellLabel}`}>{KO.labelBufferStock}</span>
          <span className={`${styles.inlineFieldInput} ${styles.stockCellInputWrap}`}>
            <input
              type="number"
              className={`${styles.stockNumberInput} ${styles.stockFillInput}`}
              min={0}
              step={1}
              value={bufferStock}
              onChange={(e) => actions.onBufferStockChange(Math.max(0, Number(e.target.value) || 0))}
              aria-label={KO.labelBufferStock}
            />
            <span className={styles.inlineUnit}>{KO.unitBufferStockDays}</span>
          </span>
        </div>
        <div className={styles.stockInputCell}>
          <span className={`${styles.inlineLabel} ${styles.stockCellLabel}`}>{KO.labelUnitCost}</span>
          <span className={`${styles.inlineFieldInput} ${styles.stockCellInputWrap}`}>
            <input
              type="number"
              className={`${styles.stockNumberInput} ${styles.stockFillInput}`}
              min={0}
              step={1}
              value={unitCost}
              onChange={(e) => actions.onUnitCostChange(Math.max(0, Number(e.target.value) || 0))}
              aria-label={KO.labelUnitCost}
            />
          </span>
        </div>
        <div className={styles.stockInputCell}>
          <span className={`${styles.inlineLabel} ${styles.stockCellLabel}`}>{KO.labelUnitPrice}</span>
          <span className={`${styles.inlineFieldInput} ${styles.stockCellInputWrap}`}>
            <input
              type="number"
              className={`${styles.stockNumberInput} ${styles.stockFillInput}`}
              min={0}
              step={1}
              value={unitPrice}
              onChange={(e) => actions.onUnitPriceChange(Math.max(0, Number(e.target.value) || 0))}
              aria-label={KO.labelUnitPrice}
            />
          </span>
        </div>
        <div className={styles.stockInputCell}>
          <span className={`${styles.inlineLabel} ${styles.stockCellLabel}`}>{KO.labelExpectedFeeRate}</span>
          <span className={`${styles.inlineFieldInput} ${styles.stockCellInputWrap}`}>
            <input
              type="number"
              className={`${styles.stockNumberInput} ${styles.stockFillInput}`}
              min={0}
              max={100}
              step={0.1}
              value={expectedFeeRatePct}
              onChange={(e) => actions.onExpectedFeeRatePctChange(Math.max(0, Number(e.target.value) || 0))}
              aria-label={KO.labelExpectedFeeRate}
            />
            <span className={styles.inlineUnit}>%</span>
          </span>
        </div>
        <div className={styles.stockInputCell}>
          <span className={`${styles.inlineLabel} ${styles.stockCellLabel}`}>{KO.labelDailyMeanSales}</span>
          <span className={`${styles.inlineFieldInput} ${styles.stockCellInputWrap}`}>
            <span className={`${styles.stockComputedValue} ${styles.stockFillInput}`}>
              {c(inputs.trendDailyMean)}
            </span>
            <span className={styles.inlineUnit}>EA/일</span>
          </span>
        </div>
        <div className={styles.stockInputCell}>
          <span className={`${styles.inlineLabel} ${styles.stockCellLabel}`}>{KO.labelDailyMeanExpectedSales}</span>
          <span className={`${styles.inlineFieldInput} ${styles.stockCellInputWrap}`}>
            <span className={`${styles.stockComputedValue} ${styles.stockFillInput}`}>
              {c(inputs.dailyMean)}
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
                <span className={`${commonStyles.cardTitleWithHelp} ${styles.forecastColumnHeaderWithRadio}`}>
                  {KO.thSizeIntegratedColExpected}
                  <PortalHelpMark
                    helpId="forecastQtyCalc"
                    placement="above"
                    labelId={labelIds.forecastQtyCalc}
                    markClassName={commonStyles.helpMark}
                    help={portal}
                  />
                </span>
              </th>
              <th className={styles.num}>
                <span className={`${commonStyles.cardTitleWithHelp} ${styles.forecastColumnHeaderWithRadio}`}>
                  {KO.thSizeIntegratedColConfirm}
                </span>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>{KO.rowOrderQty}</td>
              <td className={styles.num}>{c(computed.recommendedOrderQtyTotal)}</td>
              <td className={styles.num}>{c(computed.confirmedOrderQtyTotal)}</td>
            </tr>
            <tr>
              <td>{KO.rowExpectedSales}</td>
              <td className={styles.num}>{won(computed.forecastExpectedSales)}</td>
              <td className={styles.num}>{won(computed.confirmedExpectedSales)}</td>
            </tr>
            <tr>
              <td>{KO.rowExpectedOpProfit}</td>
              <td className={styles.num}>{won(computed.forecastOpProfit)}</td>
              <td className={styles.num}>{won(computed.confirmedOpProfit)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
