import type { SecondaryStockOrderDisplaySizeRow } from '../../../../../api/types/secondary'
import type { SizeOrderColumnTotals } from './sizeOrderCardModel'
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

export type Props = {
  sizeOrder: {
    channelLabel: string
    selfCompanyLabel: string
    selfWeightPct: number
    sizeRows: SecondarySizeOrderDisplayRow[]
    helpIds: Pick<SecondaryHelpIds, 'totalOrderBalance' | 'expectedInboundOrderBalance' | 'sizeRecQty' | 'salesForecastSizeOrder'>
    stockOrderDisplay: SecondaryStockOrderCalcResult['display'] | null
    calculationReady?: boolean
    manualConfirmBySize: Readonly<Record<string, true>>
  }
  actions: {
    onSelfWeightPctChange: (next: number) => void
    onConfirmQtyChange: (size: string, next: number, recommendedQty: number) => void
  }
  help: ReturnType<typeof usePortalHelpPopover<SecondaryHelpId>>
}

export type HelpMark = { helpId: SecondaryHelpId; labelId: string; help: Props['help'] }
export type QuantityRow = {
  label: string
  totalQty: number | null
  valueForSize: (row: SecondarySizeOrderDisplayRow, index: number) => number | null | undefined
  helpMark?: HelpMark
}

function LabelWithHelp({ label, helpMark }: { label: string; helpMark?: HelpMark }) : string | React.JSX.Element {
  if (!helpMark) return label
  return (
    <span className={commonStyles.cardTitleWithHelp}>
      {label}
      <PortalHelpMark helpId={helpMark.helpId} placement="above" labelId={helpMark.labelId} markClassName={commonStyles.helpMark} help={helpMark.help} />
    </span>
  )
}

function QuantityTableRow({ row, sizeRows }: { row: QuantityRow; sizeRows: SecondarySizeOrderDisplayRow[] }) : React.JSX.Element {
  return (
    <tr>
      <td><LabelWithHelp label={row.label} helpMark={row.helpMark} /></td>
      <td className={styles.num}>{formatQuantityValue(row.totalQty)}</td>
      {sizeRows.map((sizeRow: SecondarySizeOrderDisplayRow, index: number) : React.JSX.Element => (
        <td key={sizeRow.size} className={styles.num}>{formatQuantityValue(row.valueForSize(sizeRow, index))}</td>
      ))}
    </tr>
  )
}

function formatQuantityValue(value: number | null | undefined) : string {
  if (value == null) return KO.valueNotCalculated
  return formatOptionalGroupedNumber(value)
}

export function SizeOrderCard({ sizeOrder, actions, help }: Props) : React.JSX.Element {
  const { channelLabel, selfCompanyLabel, selfWeightPct, sizeRows, helpIds, stockOrderDisplay, calculationReady = true, manualConfirmBySize }: { channelLabel: string; selfCompanyLabel: string; selfWeightPct: number; sizeRows: SecondarySizeOrderDisplayRow[]; helpIds: Pick<SecondaryHelpIds, 'totalOrderBalance' | 'expectedInboundOrderBalance' | 'sizeRecQty' | 'salesForecastSizeOrder'>; stockOrderDisplay: SecondaryStockOrderCalcResult['display'] | null; calculationReady?: boolean; manualConfirmBySize: Readonly<Record<string, true>>; } = sizeOrder
  const tableRef: React.RefObject<HTMLTableElement | null> = useRef<HTMLTableElement | null>(null)
  const competitorWeightPct: number = getCompetitorWeightPct(selfWeightPct)
  const columnTotals: SizeOrderColumnTotals = useMemo(() : SizeOrderColumnTotals => calculateSizeOrderColumnTotals(sizeRows), [sizeRows])
  const stockOrderSizeRowBySize: Map<string, SecondaryStockOrderDisplaySizeRow> = useMemo(
    () : Map<string, SecondaryStockOrderDisplaySizeRow> => new Map((stockOrderDisplay?.sizeRows ?? []).map((row: SecondaryStockOrderDisplaySizeRow) : [string, SecondaryStockOrderDisplaySizeRow] => [row.size, row])),
    [stockOrderDisplay],
  )
  const quantityRows: QuantityRow[] = [
    { label: KO.rowCurrentStockQty, totalQty: stockOrderDisplay?.currentStockQtyTotal ?? null, valueForSize: (row: SecondarySizeOrderDisplayRow) : number | undefined => stockOrderSizeRowBySize.get(row.size)?.currentStockQty },
    { label: KO.rowTotalOrderBalance, totalQty: stockOrderDisplay?.totalOrderBalanceTotal ?? null, valueForSize: (row: SecondarySizeOrderDisplayRow) : number | undefined => stockOrderSizeRowBySize.get(row.size)?.totalOrderBalance, helpMark: { helpId: 'totalOrderBalance', labelId: helpIds.totalOrderBalance, help } },
    { label: KO.rowExpectedInboundOrderBalance, totalQty: stockOrderDisplay?.expectedInboundOrderBalanceTotal ?? null, valueForSize: (row: SecondarySizeOrderDisplayRow) : number | undefined => stockOrderSizeRowBySize.get(row.size)?.expectedInboundOrderBalance, helpMark: { helpId: 'expectedInboundOrderBalance', labelId: helpIds.expectedInboundOrderBalance, help } },
    { label: KO.rowSalesForecast, totalQty: calculationReady ? columnTotals.forecast : null, valueForSize: (row: SecondarySizeOrderDisplayRow) : number | null => (calculationReady ? row.forecastQty : null), helpMark: { helpId: 'salesForecastSizeOrder', labelId: helpIds.salesForecastSizeOrder, help } },
    { label: KO.thRecQty, totalQty: calculationReady ? columnTotals.rec : null, valueForSize: (row: SecondarySizeOrderDisplayRow) : number | null => (calculationReady ? row.recommendedQty : null), helpMark: { helpId: 'sizeRecQty', labelId: helpIds.sizeRecQty, help } },
  ]

  return (
    <div className={styles.card}>
      <h3 className={styles.sectionTitle}>{KO.sectionSizeOrder}</h3>
      {!calculationReady && (
        <p className={styles.metaFilterActionHint} role="status" aria-live="polite">
          {KO.msgStockOrderCalcRequired}
        </p>
      )}
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
              onChange={(event: React.ChangeEvent<HTMLInputElement, HTMLInputElement>) : void => {
                const next: number | null = parseSelfWeightPctInput(event.target.value)
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
          onChange={(event: React.ChangeEvent<HTMLInputElement, HTMLInputElement>) : void => actions.onSelfWeightPctChange(getSelfWeightPctFromCompetitorInput(Number(event.target.value)))}
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
              onChange={(event: React.ChangeEvent<HTMLInputElement, HTMLInputElement>) : void => {
                const next: number | null = parseSelfWeightPctFromCompetitorInput(event.target.value)
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
              {sizeRows.map((row: SecondarySizeOrderDisplayRow) : React.JSX.Element => <th key={row.size} className={styles.num}>{row.size}</th>)}
            </tr>
          </thead>
          <tbody>
            <SizeOrderShareChartRow tableRef={tableRef} channelLabel={channelLabel} selfCompanyLabel={selfCompanyLabel} sizeRows={sizeRows} />
            <tr data-chart-align-row="">
              <td>{KO.rowMetricAdjustReflectedSizeSharePct}</td>
              <td className={styles.num}>{formatSharePct(columnTotals.weightedPct)}</td>
              {sizeRows.map((row: SecondarySizeOrderDisplayRow) : React.JSX.Element => <td key={row.size} className={styles.num} data-chart-x="">{formatSharePct(row.blendedSharePct)}</td>)}
            </tr>
            {quantityRows.map((row: QuantityRow) : React.JSX.Element => <QuantityTableRow key={row.label} row={row} sizeRows={sizeRows} />)}
            <tr>
              <td>{KO.thConfirmQty}</td>
              <td className={styles.num}>{calculationReady ? formatGroupedNumber(columnTotals.confirm) : KO.valueNotCalculated}</td>
              {sizeRows.map((row: SecondarySizeOrderDisplayRow) : React.JSX.Element => {
                const manual: boolean = Boolean(manualConfirmBySize[row.size])
                return (
                  <td key={row.size} className={`${styles.num} ${styles.confirmQtyCell} ${manual ? styles.confirmQtyCellManual : ''}`}>
                    <span className={styles.confirmQtyInputWrap}>
                      {calculationReady ? (
                        <input
                          type="number"
                          min={0}
                          step={1}
                          className={styles.stockNumberInput}
                          value={row.confirmQty}
                          onChange={(event: React.ChangeEvent<HTMLInputElement, HTMLInputElement>) : void => {
                            const next: number | null = parseConfirmQtyInput(event.target.value)
                            if (next != null) actions.onConfirmQtyChange(row.size, next, row.recommendedQty)
                          }}
                          aria-label={`${row.size} ${KO.thConfirmQty}`}
                        />
                      ) : (
                        <span className={styles.stockComputedValue}>{KO.valueNotCalculated}</span>
                      )}
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
