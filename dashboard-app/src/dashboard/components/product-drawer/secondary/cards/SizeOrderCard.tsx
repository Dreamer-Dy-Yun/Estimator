import { useMemo, useRef } from 'react'
import type { SecondaryStockOrderCalcResult } from '../../../../../api/types'
import { formatGroupedNumber } from '../../../../../utils/format'
import { PortalHelpMark } from '../../../PortalHelpPopover'
import commonStyles from '../../../common.module.css'
import { usePortalHelpPopover } from '../../../usePortalHelpPopover'
import { KO } from '../../ko'
import styles from '../secondaryDrawer.module.css'
import type { SecondaryHelpId, SecondaryHelpIds } from '../secondaryDrawerTypes'
import type { SecondarySizeOrderDisplayRow } from '../model/secondarySizeOrderRows'
import { SizeOrderShareChartRow } from './SizeOrderShareChartRow'
import {
  calculateSizeOrderColumnTotals,
  formatOptionalGroupedNumber,
  formatSharePct,
  getCompetitorWeightPct,
  getSelfWeightPctFromCompetitorInput,
  parseConfirmQtyInput,
  parseSelfWeightPctFromCompetitorInput,
  parseSelfWeightPctInput,
} from './sizeOrderCardModel'

type Props = {
  sizeOrder: {
    channelLabel: string
    selfCompanyLabel: string
    selfWeightPct: number
    sizeRows: SecondarySizeOrderDisplayRow[]
    helpIds: Pick<SecondaryHelpIds, 'totalOrderBalance' | 'expectedInboundOrderBalance' | 'sizeRecQty' | 'salesForecastSizeOrder'>
    stockOrderDisplay: SecondaryStockOrderCalcResult['display'] | null
    manualConfirmBySize: Readonly<Record<string, true>>
  }
  actions: {
    onSelfWeightPctChange: (next: number) => void
    onConfirmQtyChange: (size: string, next: number, recommendedQty: number) => void
  }
  help: ReturnType<typeof usePortalHelpPopover<SecondaryHelpId>>
}

type HelpMark = { helpId: SecondaryHelpId; labelId: string; help: Props['help'] }
type QuantityRow = {
  label: string
  totalQty: number
  valueForSize: (row: SecondarySizeOrderDisplayRow, index: number) => number | undefined
  helpMark?: HelpMark
}

function LabelWithHelp({ label, helpMark }: { label: string; helpMark?: HelpMark }) {
  if (!helpMark) return label
  return (
    <span className={commonStyles.cardTitleWithHelp}>
      {label}
      <PortalHelpMark helpId={helpMark.helpId} placement="above" labelId={helpMark.labelId} markClassName={commonStyles.helpMark} help={helpMark.help} />
    </span>
  )
}

function QuantityTableRow({ row, sizeRows }: { row: QuantityRow; sizeRows: SecondarySizeOrderDisplayRow[] }) {
  return (
    <tr>
      <td><LabelWithHelp label={row.label} helpMark={row.helpMark} /></td>
      <td className={styles.num}>{formatGroupedNumber(row.totalQty)}</td>
      {sizeRows.map((sizeRow, index) => (
        <td key={sizeRow.size} className={styles.num}>{formatOptionalGroupedNumber(row.valueForSize(sizeRow, index))}</td>
      ))}
    </tr>
  )
}

export function SizeOrderCard({ sizeOrder, actions, help }: Props) {
  const { channelLabel, selfCompanyLabel, selfWeightPct, sizeRows, helpIds, stockOrderDisplay, manualConfirmBySize } = sizeOrder
  const tableRef = useRef<HTMLTableElement | null>(null)
  const competitorWeightPct = getCompetitorWeightPct(selfWeightPct)
  const columnTotals = useMemo(() => calculateSizeOrderColumnTotals(sizeRows), [sizeRows])
  const quantityRows: QuantityRow[] = [
    { label: KO.rowCurrentStockQty, totalQty: stockOrderDisplay?.currentStockQtyTotal ?? 0, valueForSize: (_, i) => stockOrderDisplay?.currentStockQtyBySize[i] },
    { label: KO.rowTotalOrderBalance, totalQty: stockOrderDisplay?.totalOrderBalanceTotal ?? 0, valueForSize: (_, i) => stockOrderDisplay?.totalOrderBalanceBySize[i], helpMark: { helpId: 'totalOrderBalance', labelId: helpIds.totalOrderBalance, help } },
    { label: KO.rowExpectedInboundOrderBalance, totalQty: stockOrderDisplay?.expectedInboundOrderBalanceTotal ?? 0, valueForSize: (_, i) => stockOrderDisplay?.expectedInboundOrderBalanceBySize[i], helpMark: { helpId: 'expectedInboundOrderBalance', labelId: helpIds.expectedInboundOrderBalance, help } },
    { label: KO.rowSalesForecast, totalQty: columnTotals.forecast, valueForSize: (row) => row.forecastQty, helpMark: { helpId: 'salesForecastSizeOrder', labelId: helpIds.salesForecastSizeOrder, help } },
    { label: KO.thRecQty, totalQty: columnTotals.rec, valueForSize: (row) => row.recommendedQty, helpMark: { helpId: 'sizeRecQty', labelId: helpIds.sizeRecQty, help } },
  ]

  return (
    <div className={styles.card}>
      <h3 className={styles.sectionTitle}>{KO.sectionSizeOrder}</h3>
      <div className={styles.sliderRow}>
        <div className={styles.sliderSelfGroup}>
          <span className={styles.sliderRowLabel}>{selfCompanyLabel} 가중치</span>
          <div className={styles.sliderPctBox}>
            <input
              type="number"
              className={styles.sliderPctInput}
              min={0}
              max={100}
              step={0.01}
              value={selfWeightPct}
              onChange={(event) => {
                const next = parseSelfWeightPctInput(event.target.value)
                if (next != null) actions.onSelfWeightPctChange(next)
              }}
              aria-label={`${selfCompanyLabel} 가중치`}
            />
            <span className={styles.sliderPctSuffix}>%</span>
          </div>
        </div>
        <input
          type="range"
          className={`${styles.sliderRowRange} ${styles.sliderWeightRange}`}
          min={0}
          max={100}
          step={0.01}
          value={competitorWeightPct}
          onChange={(event) => actions.onSelfWeightPctChange(getSelfWeightPctFromCompetitorInput(Number(event.target.value)))}
          aria-label={`${selfCompanyLabel} 대 ${channelLabel} 가중치`}
        />
        <div className={styles.sliderCompGroup}>
          <div className={styles.sliderPctBox}>
            <input
              type="number"
              className={styles.sliderPctInput}
              min={0}
              max={100}
              step={0.01}
              value={competitorWeightPct}
              onChange={(event) => {
                const next = parseSelfWeightPctFromCompetitorInput(event.target.value)
                if (next != null) actions.onSelfWeightPctChange(next)
              }}
              aria-label={`${channelLabel} ${KO.competitorWeightApprox}`}
            />
            <span className={styles.sliderPctSuffix}>%</span>
          </div>
          <span className={styles.sliderRowLabel} title={`${channelLabel} ${KO.competitorWeightApprox}`}>
            {channelLabel} {KO.competitorWeightApprox}
          </span>
        </div>
      </div>
      <div className={styles.sizeOrderTableWrap}>
        <table ref={tableRef} className={`${styles.table} ${styles.sizeOrderTable} ${styles.sizeOrderLargeTable}`}>
          <thead>
            <tr>
              <th>{KO.thMetric}</th>
              <th className={styles.num}>{KO.thTotal}</th>
              {sizeRows.map((row) => <th key={row.size} className={styles.num}>{row.size}</th>)}
            </tr>
          </thead>
          <tbody>
            <SizeOrderShareChartRow tableRef={tableRef} channelLabel={channelLabel} selfCompanyLabel={selfCompanyLabel} sizeRows={sizeRows} />
            <tr data-chart-align-row="">
              <td>{KO.rowMetricAdjustReflectedSizeSharePct}</td>
              <td className={styles.num}>{formatSharePct(columnTotals.weightedPct)}</td>
              {sizeRows.map((row) => <td key={row.size} className={styles.num} data-chart-x="">{formatSharePct(row.blendedSharePct)}</td>)}
            </tr>
            {quantityRows.map((row) => <QuantityTableRow key={row.label} row={row} sizeRows={sizeRows} />)}
            <tr>
              <td>{KO.thConfirmQty}</td>
              <td className={styles.num}>{formatGroupedNumber(columnTotals.confirm)}</td>
              {sizeRows.map((row) => {
                const manual = Boolean(manualConfirmBySize[row.size])
                return (
                  <td key={row.size} className={`${styles.num} ${styles.confirmQtyCell} ${manual ? styles.confirmQtyCellManual : ''}`}>
                    <span className={styles.confirmQtyInputWrap}>
                      <input
                        type="number"
                        min={0}
                        step={1}
                        className={styles.stockNumberInput}
                        value={row.confirmQty}
                        onChange={(event) => {
                          const next = parseConfirmQtyInput(event.target.value)
                          if (next != null) actions.onConfirmQtyChange(row.size, next, row.recommendedQty)
                        }}
                        aria-label={`${row.size} ${KO.thConfirmQty}`}
                      />
                    </span>
                  </td>
                )
              })}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
