import { useMemo, useRef } from 'react'
import { formatGroupedNumber } from '../../../../../utils/format'
import { PortalHelpMark } from '../../../PortalHelpPopover'
import commonStyles from '../../../common.module.css'
import { KO } from '../../ko'
import styles from '../secondaryDrawer.module.css'
import type { SecondaryHelpId } from '../secondaryDrawerTypes'
import { usePortalHelpPopover } from '../../../usePortalHelpPopover'

import { SizeOrderShareChartRow } from './SizeOrderShareChartRow'
import { calculateSizeOrderColumnTotals, formatOptionalGroupedNumber, formatSharePct, getCompetitorWeightPct, getSelfWeightPctFromCompetitorInput, parseConfirmQtyInput, parseSelfWeightPctFromCompetitorInput, parseSelfWeightPctInput } from './sizeOrderCardModel'
import type { SizeOrderRow } from './sizeOrderCardTypes'

type Props = {
  sizeOrder: {
    channelLabel: string
    selfCompanyLabel: string
    selfWeightPct: number
    sizeRows: SizeOrderRow[]
    totalOrderBalanceHelpId: string
    expectedInboundOrderBalanceHelpId: string
    sizeRecQtyHelpId: string
    salesForecastHelpId: string
    currentStockQty: number
    totalOrderBalanceQty: number
    expectedInboundOrderBalanceQty: number
    currentStockQtyBySize: number[]
    totalOrderBalanceBySize: number[]
    expectedInboundOrderBalanceBySize: number[]
    /** 사용자가 직접 수정한 확정 수량 표시 */
    manualConfirmBySize: Readonly<Record<string, true>>
  }
  actions: {
    onSelfWeightPctChange: (next: number) => void
    /** recommendedQty와 같아지면 수동 표시를 해제한다. */
    onConfirmQtyChange: (size: string, next: number, recommendedQty: number) => void
  }
  help: ReturnType<typeof usePortalHelpPopover<SecondaryHelpId>>
}

type QuantityRowHelpMark = { helpId: SecondaryHelpId; labelId: string; help: Props['help'] }

type QuantityRowProps = {
  label: string
  totalQty: number
  sizeRows: SizeOrderRow[]
  valueForSize: (row: SizeOrderRow, index: number) => number | undefined
  helpMark?: QuantityRowHelpMark
}

function QuantityRow({ label, totalQty, sizeRows, valueForSize, helpMark }: QuantityRowProps) {
  const labelNode = helpMark ? (
    <span className={commonStyles.cardTitleWithHelp}>
      {label}
      <PortalHelpMark helpId={helpMark.helpId} placement="above" labelId={helpMark.labelId} markClassName={commonStyles.helpMark} help={helpMark.help} />
    </span>
  ) : (
    label
  )

  return (
    <tr>
      <td>{labelNode}</td>
      <td className={styles.num}>{formatGroupedNumber(totalQty)}</td>
      {sizeRows.map((r, i) => (
        <td key={r.size} className={styles.num}>{formatOptionalGroupedNumber(valueForSize(r, i))}</td>
      ))}
    </tr>
  )
}

export function SizeOrderCard({ sizeOrder, actions, help }: Props) {
  const {
    channelLabel,
    selfCompanyLabel,
    selfWeightPct,
    sizeRows,
    totalOrderBalanceHelpId,
    expectedInboundOrderBalanceHelpId,
    sizeRecQtyHelpId,
    salesForecastHelpId,
    currentStockQty,
    totalOrderBalanceQty,
    expectedInboundOrderBalanceQty,
    currentStockQtyBySize,
    totalOrderBalanceBySize,
    expectedInboundOrderBalanceBySize,
    manualConfirmBySize,
  } = sizeOrder
  const tableRef = useRef<HTMLTableElement | null>(null)
  const competitorWeightPct = getCompetitorWeightPct(selfWeightPct)
  const columnTotals = useMemo(() => calculateSizeOrderColumnTotals(sizeRows), [sizeRows])

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
              onChange={(e) => {
                const next = parseSelfWeightPctInput(e.target.value)
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
          onChange={(e) => {
            actions.onSelfWeightPctChange(getSelfWeightPctFromCompetitorInput(Number(e.target.value)))
          }}
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
                onChange={(e) => {
                  const next = parseSelfWeightPctFromCompetitorInput(e.target.value)
                  if (next != null) actions.onSelfWeightPctChange(next)
                }}
                aria-label={`${channelLabel} ${KO.competitorWeightApprox}`}
              />
            <span className={styles.sliderPctSuffix}>%</span>
          </div>
          <span
            className={styles.sliderRowLabel}
            title={`${channelLabel} ${KO.competitorWeightApprox}`}
          >
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
              {sizeRows.map((r) => (
                <th key={r.size} className={styles.num}>{r.size}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <SizeOrderShareChartRow
              tableRef={tableRef}
              channelLabel={channelLabel}
              selfCompanyLabel={selfCompanyLabel}
              sizeRows={sizeRows}
            />
            <tr data-chart-align-row="">
              <td>{KO.rowMetricAdjustReflectedSizeSharePct}</td>
              <td className={styles.num}>{formatSharePct(columnTotals.weightedPct)}</td>
              {sizeRows.map((r) => (
                <td key={r.size} className={styles.num} data-chart-x="">
                  {formatSharePct(r.blendedSharePct)}
                </td>
              ))}
            </tr>
            <QuantityRow
              label={KO.rowCurrentStockQty}
              totalQty={currentStockQty}
              sizeRows={sizeRows}
              valueForSize={(_, i) => currentStockQtyBySize[i]}
            />
            <QuantityRow
              label={KO.rowTotalOrderBalance}
              totalQty={totalOrderBalanceQty}
              sizeRows={sizeRows}
              valueForSize={(_, i) => totalOrderBalanceBySize[i]}
              helpMark={{ helpId: 'totalOrderBalance', labelId: totalOrderBalanceHelpId, help }}
            />
            <QuantityRow
              label={KO.rowExpectedInboundOrderBalance}
              totalQty={expectedInboundOrderBalanceQty}
              sizeRows={sizeRows}
              valueForSize={(_, i) => expectedInboundOrderBalanceBySize[i]}
              helpMark={{
                helpId: 'expectedInboundOrderBalance',
                labelId: expectedInboundOrderBalanceHelpId,
                help,
              }}
            />
            <QuantityRow
              label={KO.rowSalesForecast}
              totalQty={columnTotals.forecast}
              sizeRows={sizeRows}
              valueForSize={(r) => r.forecastQty}
              helpMark={{ helpId: 'salesForecastSizeOrder', labelId: salesForecastHelpId, help }}
            />
            <QuantityRow
              label={KO.thRecQty}
              totalQty={columnTotals.rec}
              sizeRows={sizeRows}
              valueForSize={(r) => r.recommendedQty}
              helpMark={{ helpId: 'sizeRecQty', labelId: sizeRecQtyHelpId, help }}
            />
            <tr>
              <td>{KO.thConfirmQty}</td>
              <td className={styles.num}>{formatGroupedNumber(columnTotals.confirm)}</td>
              {sizeRows.map((r) => {
                const manual = Boolean(manualConfirmBySize[r.size])
                return (
                  <td
                    key={r.size}
                    className={`${styles.num} ${styles.confirmQtyCell} ${manual ? styles.confirmQtyCellManual : ''}`}
                  >
                    <span className={styles.confirmQtyInputWrap}>
                      <input
                        type="number"
                        min={0}
                        step={1}
                        className={styles.stockNumberInput}
                        value={r.confirmQty}
                        onChange={(e) => {
                          const next = parseConfirmQtyInput(e.target.value)
                          if (next != null) actions.onConfirmQtyChange(r.size, next, r.recommendedQty)
                        }}
                        aria-label={`${r.size} ${KO.thConfirmQty}`}
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
