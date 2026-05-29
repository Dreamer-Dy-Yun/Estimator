import type { ReactNode } from 'react'
import { PortalHelpMark } from '../../../PortalHelpPopover'
import { ApiUnitErrorBadge } from '../../../../../components/ApiUnitErrorBadge'
import { LoadingSpinner } from '../../../../../components/LoadingSpinner'
import type { OrderSnapshotStockOrderRequestV2 } from '../../../../../snapshot/orderSnapshotTypes'
import type { ApiUnitErrorInfo } from '../../../../../types'
import { displayNumber, formatGroupedNumber, formatGroupedOneDecimal } from '../../../../../utils/format'
import commonStyles from '../../../common.module.css'
import { usePortalHelpPopover } from '../../../usePortalHelpPopover'
import { KO } from '../../ko'
import styles from '../secondaryDrawer.module.css'
import type { SecondaryHelpId, SecondaryHelpIds } from '../secondaryDrawerTypes'

type SalesForecastDisplayInputs = {
  trendDailyMean: number | null
  dailyMean: number | null
  sigma: number | null
}
type SalesForecastInboundDateFields = Pick<OrderSnapshotStockOrderRequestV2, 'currentOrderInboundDueDate' | 'nextOrderInboundDueDate'>

type SalesForecastComputedTable = {
  recommendedOrderQtyTotal: number
  confirmedOrderQtyTotal: number
  forecastExpectedSales: number
  forecastOpProfit: number
  confirmedExpectedSales: number
  confirmedOpProfit: number
}
export type SalesForecastOrderInputFields = SalesForecastInboundDateFields & {
  minOrderDate: string
  bufferStock: number
  unitCost: number
  unitPrice: number
  expectedFeeRatePct: number
}
export type SalesForecastOrderInputActions = {
  onCurrentOrderInboundDueDateChange: (next: string) => void
  onNextOrderInboundDueDateChange: (next: string) => void
  onBufferStockChange: (next: number) => void
  onUnitCostChange: (next: number) => void
  onUnitPriceChange: (next: number) => void
  onExpectedFeeRatePctChange: (next: number) => void
}

type Props = {
  forecast: { inputs: SalesForecastDisplayInputs; loading: boolean; error: ApiUnitErrorInfo | null; calculationReady?: boolean; computed: SalesForecastComputedTable }
  orderInputFields: SalesForecastOrderInputFields
  actions: SalesForecastOrderInputActions
  help: { labelIds: Pick<SecondaryHelpIds, 'forecastQtyCalc' | 'expectedOpProfitRate'>; portal: ReturnType<typeof usePortalHelpPopover<SecondaryHelpId>> }
}
type HelpKey = 'forecastQtyCalc' | 'expectedOpProfitRate'

type NumberFieldProps = { label: string; value: number; onChange: (next: number) => void; unit: string; max?: number; step?: number }

const toNonNegativeNumber = (value: string) => Math.max(0, Number(value) || 0)
const rateText = (value: number | null) => displayNumber.percent(value)

function FieldCell({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className={styles.stockInputCell}>
      <span className={`${styles.inlineLabel} ${styles.stockCellLabel}`}>{label}</span>
      <span className={`${styles.inlineFieldInput} ${styles.stockCellInputWrap}`}>{children}</span>
    </div>
  )
}

function DateField({ label, value, min, onChange }: { label: string; value: string; min: string; onChange: (next: string) => void }) {
  return (
    <FieldCell label={label}>
      <input type="date" className={`${styles.stockDateInput} ${styles.stockFillInput}`} min={min} value={value} onChange={(e) => onChange(e.target.value)} aria-label={label} />
    </FieldCell>
  )
}

function NumberField({ label, value, onChange, unit, max, step = 1 }: NumberFieldProps) {
  return (
    <FieldCell label={label}>
      <input type="number" className={`${styles.stockNumberInput} ${styles.stockFillInput}`} min={0} max={max} step={step} value={value} onChange={(e) => onChange(toNonNegativeNumber(e.target.value))} aria-label={label} />
      <span className={styles.inlineUnit}>{unit}</span>
    </FieldCell>
  )
}

function ComputedField({ label, value }: { label: string; value: number | null }) {
  return (
    <FieldCell label={label}>
      <span className={`${styles.stockComputedValue} ${styles.stockFillInput}`}>{value == null ? KO.valueNotCalculated : formatGroupedOneDecimal(value)}</span>
      <span className={styles.inlineUnit}>EA/일</span>
    </FieldCell>
  )
}

function HelpLabel({ label, helpId, labelIds, portal }: { label: string; helpId: HelpKey; labelIds: Pick<SecondaryHelpIds, HelpKey>; portal: ReturnType<typeof usePortalHelpPopover<SecondaryHelpId>> }) {
  return (
    <span className={commonStyles.cardTitleWithHelp}>
      {label}
      <PortalHelpMark helpId={helpId} placement="above" labelId={labelIds[helpId]} markClassName={commonStyles.helpMark} help={portal} />
    </span>
  )
}

export function SalesForecastCard({ forecast, orderInputFields, actions, help }: Props) {
  const { inputs, error, computed } = forecast
  const calculationReady = forecast.calculationReady ?? true
  const { currentOrderInboundDueDate, nextOrderInboundDueDate, minOrderDate, bufferStock, unitCost, unitPrice, expectedFeeRatePct } = orderInputFields
  const { labelIds, portal } = help
  const calcRate = (expectedSales: number, expectedQty: number): number | null => {
    if (!Number.isFinite(expectedSales) || expectedSales <= 0) return null
    return (((expectedSales * (1 - Math.max(0, expectedFeeRatePct) / 100)) - (unitCost * expectedQty)) / expectedSales) * 100
  }
  const forecastRate = calculationReady ? calcRate(computed.forecastExpectedSales, computed.recommendedOrderQtyTotal) : null
  const confirmedRate = calculationReady ? calcRate(computed.confirmedExpectedSales, computed.confirmedOrderQtyTotal) : null
  const metricRows: Array<{ key: string; label: string; expected: string; confirmed: string; helpId?: HelpKey }> = [
    { key: 'orderQty', label: KO.rowOrderQty, helpId: 'forecastQtyCalc', expected: calculationReady ? formatGroupedNumber(computed.recommendedOrderQtyTotal) : KO.valueNotCalculated, confirmed: calculationReady ? formatGroupedNumber(computed.confirmedOrderQtyTotal) : KO.valueNotCalculated },
    { key: 'expectedSales', label: KO.rowExpectedSales, expected: calculationReady ? displayNumber.money(computed.forecastExpectedSales) : KO.valueNotCalculated, confirmed: calculationReady ? displayNumber.money(computed.confirmedExpectedSales) : KO.valueNotCalculated },
    { key: 'expectedOpProfit', label: KO.rowExpectedOpProfit, expected: calculationReady ? displayNumber.money(computed.forecastOpProfit) : KO.valueNotCalculated, confirmed: calculationReady ? displayNumber.money(computed.confirmedOpProfit) : KO.valueNotCalculated },
    { key: 'expectedOpProfitRate', label: KO.rowExpectedOpProfitRate, helpId: 'expectedOpProfitRate', expected: calculationReady ? rateText(forecastRate) : KO.valueNotCalculated, confirmed: calculationReady ? rateText(confirmedRate) : KO.valueNotCalculated },
  ]

  return (
    <div className={`${styles.card} ${styles.gridColumnCard}`}>
      <div className={styles.stockTitleRow}>
        <h3 className={styles.sectionTitle}>{KO.sectionSalesForecastIntegrated}<ApiUnitErrorBadge error={error} /></h3>
      </div>
      {!calculationReady && !error && (
        <p className={styles.metaFilterActionHint} role="status" aria-live="polite">
          {KO.msgStockOrderCalcRequired}
        </p>
      )}
      <div className={`${styles.stockInputList} ${styles.salesForecastInputList}`}>
        <DateField label={KO.labelCurrentOrderInboundDueDate} min={minOrderDate} value={currentOrderInboundDueDate} onChange={actions.onCurrentOrderInboundDueDateChange} />
        <DateField label={KO.labelNextOrderInboundDueDate} min={currentOrderInboundDueDate >= minOrderDate ? currentOrderInboundDueDate : minOrderDate} value={nextOrderInboundDueDate} onChange={actions.onNextOrderInboundDueDateChange} />
        <NumberField label={KO.labelBufferStock} value={bufferStock} onChange={actions.onBufferStockChange} unit={KO.unitBufferStockDays} />
        <NumberField label={KO.labelUnitCost} value={unitCost} onChange={actions.onUnitCostChange} unit={KO.unitWonPerEa} />
        <NumberField label={KO.labelUnitPrice} value={unitPrice} onChange={actions.onUnitPriceChange} unit={KO.unitWonPerEa} />
        <NumberField label={KO.labelExpectedFeeRate} value={expectedFeeRatePct} onChange={actions.onExpectedFeeRatePctChange} unit="%" max={100} step={0.1} />
        <ComputedField label={KO.labelDailyMeanSales} value={inputs.trendDailyMean} />
        <ComputedField label={KO.labelDailyMeanExpectedSales} value={inputs.dailyMean} />
      </div>
      {forecast.loading ? (
        <LoadingSpinner label={`${KO.sectionSalesForecastIntegrated} 계산 중`} />
      ) : (
        <div className={styles.cardTableScroll}>
          <table className={`${styles.table} ${styles.salesForecastTable}`}>
            <thead>
              <tr>
                <th>{KO.thMetric}</th>
                <th className={styles.num}>
                  <span className={`${commonStyles.cardTitleWithHelp} ${styles.forecastColumnHeaderWithRadio}`}>
                    {KO.thSizeIntegratedColExpected}
                    <PortalHelpMark helpId="forecastQtyCalc" placement="above" labelId={labelIds.forecastQtyCalc} markClassName={commonStyles.helpMark} help={portal} />
                  </span>
                </th>
                <th className={styles.num}><span className={`${commonStyles.cardTitleWithHelp} ${styles.forecastColumnHeaderWithRadio}`}>{KO.thSizeIntegratedColConfirm}</span></th>
              </tr>
            </thead>
            <tbody>
              {metricRows.map((row) => (
                <tr key={row.key}>
                  <td>{row.helpId ? <HelpLabel label={row.label} helpId={row.helpId} labelIds={labelIds} portal={portal} /> : row.label}</td>
                  <td className={styles.num}>{row.expected}</td>
                  <td className={styles.num}>{row.confirmed}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
