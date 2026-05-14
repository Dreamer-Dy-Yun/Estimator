import { useMemo, useRef } from 'react'
import { PortalHelpMark } from '../../../PortalHelpPopover'
import { formatGroupedNumber, formatRatioDecimalKo } from '../../../../../utils/format'
import commonStyles from '../../../common.module.css'
import { KO } from '../../ko'
import styles from '../secondaryDrawer.module.css'
import type { SecondaryHelpId } from '../secondaryDrawerTypes'
import { usePortalHelpPopover } from '../../../usePortalHelpPopover'

import { SizeOrderShareChartRow } from './SizeOrderShareChartRow'
import type { SizeOrderRow } from './sizeOrderCardTypes'

type Props = {
  sizeOrder: {
    channelLabel: string
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

function clampWeightPct(v: number): number {
  if (!Number.isFinite(v)) return 0
  return Math.max(0, Math.min(100, Math.round(v * 100) / 100))
}

function formatOptionalGroupedNumber(value: number | undefined): string {
  return value == null ? '-' : formatGroupedNumber(value)
}

export function SizeOrderCard({ sizeOrder, actions, help }: Props) {
  const {
    channelLabel,
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
  const competitorWeightPct = clampWeightPct(100 - selfWeightPct)
  const columnTotals = useMemo(() => {
    let weightedPct = 0
    let forecast = 0
    let rec = 0
    let confirm = 0
    for (const r of sizeRows) {
      weightedPct += r.blendedSharePct
      forecast += r.forecastQty
      rec += r.recommendedQty
      confirm += r.confirmQty
    }
    return { weightedPct, forecast, rec, confirm }
  }, [sizeRows])


  return (
    <div className={styles.card}>
      <h3 className={styles.sectionTitle}>{KO.sectionSizeOrder}</h3>
      <div className={styles.sliderRow}>
        <div className={styles.sliderSelfGroup}>
          <span className={styles.sliderRowLabel}>{KO.selfWeight}</span>
          <div className={styles.sliderPctBox}>
            <input
              type="number"
              className={styles.sliderPctInput}
              min={0}
              max={100}
              step={0.01}
              value={selfWeightPct}
              onChange={(e) => {
                const t = e.target.value.trim()
                if (t === '') {
                  actions.onSelfWeightPctChange(0)
                  return
                }
                const n = Number(t)
                if (!Number.isFinite(n)) return
                actions.onSelfWeightPctChange(clampWeightPct(n))
              }}
              aria-label={KO.selfWeight}
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
            const competitorWeight = clampWeightPct(Number(e.target.value))
            actions.onSelfWeightPctChange(clampWeightPct(100 - competitorWeight))
          }}
          aria-label={KO.ariaWeightSlider}
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
                const t = e.target.value.trim()
                if (t === '') {
                  actions.onSelfWeightPctChange(100)
                  return
                }
                const n = Number(t)
                if (!Number.isFinite(n)) return
                actions.onSelfWeightPctChange(clampWeightPct(100 - clampWeightPct(n)))
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
              sizeRows={sizeRows}
            />
            <tr data-chart-align-row="">
              <td>{KO.rowMetricAdjustReflectedSizeSharePct}</td>
              <td className={styles.num}>{formatRatioDecimalKo(columnTotals.weightedPct)}</td>
              {sizeRows.map((r) => (
                <td key={r.size} className={styles.num} data-chart-x="">
                  {formatRatioDecimalKo(r.blendedSharePct)}
                </td>
              ))}
            </tr>
            <tr>
              <td>{KO.rowCurrentStockQty}</td>
              <td className={styles.num}>{formatGroupedNumber(currentStockQty)}</td>
              {sizeRows.map((r, i) => (
                <td key={r.size} className={styles.num}>{formatOptionalGroupedNumber(currentStockQtyBySize[i])}</td>
              ))}
            </tr>
            <tr>
              <td>
                <span className={commonStyles.cardTitleWithHelp}>
                  {KO.rowTotalOrderBalance}
                  <PortalHelpMark
                    helpId="totalOrderBalance"
                    placement="above"
                    labelId={totalOrderBalanceHelpId}
                    markClassName={commonStyles.helpMark}
                    help={help}
                  />
                </span>
              </td>
              <td className={styles.num}>{formatGroupedNumber(totalOrderBalanceQty)}</td>
              {sizeRows.map((r, i) => (
                <td key={r.size} className={styles.num}>{formatOptionalGroupedNumber(totalOrderBalanceBySize[i])}</td>
              ))}
            </tr>
            <tr>
              <td>
                <span className={commonStyles.cardTitleWithHelp}>
                  {KO.rowExpectedInboundOrderBalance}
                  <PortalHelpMark
                    helpId="expectedInboundOrderBalance"
                    placement="above"
                    labelId={expectedInboundOrderBalanceHelpId}
                    markClassName={commonStyles.helpMark}
                    help={help}
                  />
                </span>
              </td>
              <td className={styles.num}>{formatGroupedNumber(expectedInboundOrderBalanceQty)}</td>
              {sizeRows.map((r, i) => (
                <td key={r.size} className={styles.num}>
                  {formatOptionalGroupedNumber(expectedInboundOrderBalanceBySize[i])}
                </td>
              ))}
            </tr>
            <tr>
              <td>
                <span className={commonStyles.cardTitleWithHelp}>
                  {KO.rowSalesForecast}
                  <PortalHelpMark
                    helpId="salesForecastSizeOrder"
                    placement="above"
                    labelId={salesForecastHelpId}
                    markClassName={commonStyles.helpMark}
                    help={help}
                  />
                </span>
              </td>
              <td className={styles.num}>{formatGroupedNumber(columnTotals.forecast)}</td>
              {sizeRows.map((r) => (
                <td key={r.size} className={styles.num}>{formatGroupedNumber(r.forecastQty)}</td>
              ))}
            </tr>
            <tr>
              <td>
                <span className={commonStyles.cardTitleWithHelp}>
                  {KO.thRecQty}
                  <PortalHelpMark
                    helpId="sizeRecQty"
                    placement="above"
                    labelId={sizeRecQtyHelpId}
                    markClassName={commonStyles.helpMark}
                    help={help}
                  />
                </span>
              </td>
              <td className={styles.num}>{formatGroupedNumber(columnTotals.rec)}</td>
              {sizeRows.map((r) => (
                <td key={r.size} className={styles.num}>{formatGroupedNumber(r.recommendedQty)}</td>
              ))}
            </tr>
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
                        onChange={(e) =>
                          actions.onConfirmQtyChange(
                            r.size,
                            Math.max(0, Number(e.target.value) || 0),
                            r.recommendedQty,
                          )}
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
