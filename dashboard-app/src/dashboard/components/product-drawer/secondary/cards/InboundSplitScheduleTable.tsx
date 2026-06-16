import { Fragment } from 'react'
import { daysBetweenIsoDates } from '../../../../../utils/date'
import { formatGroupedNumber } from '../../../../../utils/format'
import { KO } from '../../ko'
import styles from '../secondaryDrawer.module.css'
import { getInboundSplitSuggestedTotalQty, getInboundSplitTotalQty, type InboundSplitScheduleRow, type InboundSplitSizeColumn } from './inboundSplitScheduleModel'
import { ariaDiffLabel, cx, diffClass, qtyInputClassName, stickyDateClassName, stickyKindClassName, stickyRoundClassName, stickyTotalClassName } from './inboundSplitScheduleTableClasses'

export interface InboundSplitScheduleTableProps {
  workDate: string
  rows: InboundSplitScheduleRow[]
  columns: InboundSplitSizeColumn[]
  suggestedSizeTotals: Record<string, number>
  confirmedSizeTotals: Record<string, number>
  suggestedGrandTotal: number
  confirmedGrandTotal: number
  onDateChange: (rowIndex: number, value: string) => void
  onRowTotalChange: (rowIndex: number, value: string) => void
  onQtyChange: (rowIndex: number, size: string, value: string) => void
}

interface InboundSplitDateInterval {
  inboundDateInterval: string
  invalidDateOrder: boolean
}

function buildInboundSplitDateInterval(startDate: string, endDate: string): InboundSplitDateInterval {
  const days: number | null = daysBetweenIsoDates(startDate, endDate)
  if (days == null) return { inboundDateInterval: '-', invalidDateOrder: false }
  return {
    inboundDateInterval: `${days >= 0 ? '+' : ''}${formatGroupedNumber(days)}${KO.unitDays}`,
    invalidDateOrder: days <= 0,
  }
}

export function InboundSplitScheduleTable({
  workDate,
  rows,
  columns,
  suggestedSizeTotals,
  confirmedSizeTotals,
  suggestedGrandTotal,
  confirmedGrandTotal,
  onDateChange,
  onRowTotalChange,
  onQtyChange,
}: InboundSplitScheduleTableProps): React.JSX.Element {
  const summaryDiffClass: string = diffClass(confirmedGrandTotal, suggestedGrandTotal)
  const formattedConfirmedGrandTotal: string = formatGroupedNumber(confirmedGrandTotal)

  return (
    <table className={`${styles.table} ${styles.inboundSplitTable}`}>
      <thead>
        <tr>
          <th className={stickyRoundClassName}>{KO.thInboundSplitRound}</th>
          <th className={stickyDateClassName}>{KO.thInboundSplitInboundDate}</th>
          <th className={stickyKindClassName}>{KO.thMetric}</th>
          <th className={stickyTotalClassName}>{KO.thInboundSplitTotalQty}</th>
          {columns.map((column: InboundSplitSizeColumn): React.JSX.Element => (
            <th key={column.size} className={styles.num}>{column.size}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        <tr className={styles.inboundSplitSummaryRow}>
          <td className={cx(stickyRoundClassName, styles.inboundSplitSummarySpanCell)} rowSpan={2}>{KO.thInboundSplitTotalQty}</td>
          <td className={cx(stickyDateClassName, styles.inboundSplitSummarySpanCell)} rowSpan={2}>-</td>
          <td className={stickyKindClassName}>{KO.rowInboundSplitSuggestedQty}</td>
          <td className={stickyTotalClassName}>{formatGroupedNumber(suggestedGrandTotal)}</td>
          {columns.map((column: InboundSplitSizeColumn): React.JSX.Element => (
            <td key={column.size} className={styles.num}>{formatGroupedNumber(suggestedSizeTotals[column.size] ?? 0)}</td>
          ))}
        </tr>
        <tr className={`${styles.inboundSplitSummaryRow} ${styles.inboundSplitSummaryRowEnd}`}>
          <td className={stickyKindClassName}>{KO.rowInboundSplitConfirmedQty}</td>
          <td className={cx(stickyTotalClassName, summaryDiffClass)} aria-label={ariaDiffLabel(formattedConfirmedGrandTotal, summaryDiffClass)}>{formattedConfirmedGrandTotal}</td>
          {columns.map((column: InboundSplitSizeColumn): React.JSX.Element => {
            const confirmedQty: number = confirmedSizeTotals[column.size] ?? 0
            const diffClassName: string = diffClass(confirmedQty, suggestedSizeTotals[column.size] ?? 0)
            const formattedQty: string = formatGroupedNumber(confirmedQty)
            return <td key={column.size} className={cx(styles.num, diffClassName)} aria-label={ariaDiffLabel(formattedQty, diffClassName)}>{formattedQty}</td>
          })}
        </tr>
        {rows.map((row: InboundSplitScheduleRow, rowIndex: number): React.JSX.Element => {
          const suggestedTotalQty: number = getInboundSplitSuggestedTotalQty(row, columns)
          const confirmedTotalQty: number = getInboundSplitTotalQty(row, columns)
          const totalDiffClass: string = diffClass(confirmedTotalQty, suggestedTotalQty)
          const previousInboundDate: string = rowIndex === 0 ? workDate : (rows[rowIndex - 1]?.inboundDate ?? workDate)
          const dateInterval: InboundSplitDateInterval = buildInboundSplitDateInterval(previousInboundDate, row.inboundDate)

          return (
            <Fragment key={row.id}>
              <tr className={styles.inboundSplitSuggestedRow}>
                <td className={cx(stickyRoundClassName, styles.inboundSplitRowSpanCell)} rowSpan={2}>{row.round}{KO.optionInboundSplitRoundSuffix}</td>
                <td className={cx(stickyDateClassName, styles.inboundSplitRowSpanCell)} rowSpan={2}>
                  <div className={styles.inboundSplitDateStack}>
                    <input
                      type="date"
                      className={styles.stockDateInput}
                      value={row.inboundDate}
                      onChange={(event: React.ChangeEvent<HTMLInputElement>): void => onDateChange(rowIndex, event.target.value)}
                      aria-label={`${row.round}${KO.optionInboundSplitRoundSuffix} ${KO.thInboundSplitInboundDate}`}
                    />
                    <span
                      className={cx(styles.inboundSplitDateInterval, dateInterval.invalidDateOrder ? styles.inboundSplitDateIntervalInvalid : null)}
                      aria-label={`${row.round}${KO.optionInboundSplitRoundSuffix} ${KO.labelInboundSplitDateInterval} ${dateInterval.inboundDateInterval}`}
                    >
                      {dateInterval.inboundDateInterval}
                    </span>
                  </div>
                </td>
                <td className={stickyKindClassName}>{KO.rowInboundSplitSuggestedQty}</td>
                <td className={stickyTotalClassName}>{formatGroupedNumber(suggestedTotalQty)}</td>
                {columns.map((column: InboundSplitSizeColumn): React.JSX.Element => (
                  <td key={column.size} className={styles.num}>{formatGroupedNumber(row.suggestedQuantitiesBySize[column.size] ?? 0)}</td>
                ))}
              </tr>
              <tr className={`${styles.inboundSplitConfirmedRow} ${styles.inboundSplitRoundEndRow}`}>
                <td className={stickyKindClassName}>{KO.rowInboundSplitConfirmedQty}</td>
                <td className={cx(stickyTotalClassName, totalDiffClass)}>
                  <input
                    type="number"
                    className={cx(qtyInputClassName, totalDiffClass)}
                    min={0}
                    step={1}
                    value={confirmedTotalQty}
                    onChange={(event: React.ChangeEvent<HTMLInputElement>): void => onRowTotalChange(rowIndex, event.target.value)}
                    aria-label={ariaDiffLabel(`${row.round}${KO.optionInboundSplitRoundSuffix} ${KO.thInboundSplitTotalQty} ${KO.rowInboundSplitConfirmedQty}`, totalDiffClass)}
                  />
                </td>
                {columns.map((column: InboundSplitSizeColumn): React.JSX.Element => {
                  const confirmedQty: number = row.quantitiesBySize[column.size] ?? 0
                  const suggestedQty: number = row.suggestedQuantitiesBySize[column.size] ?? 0
                  const sizeDiffClass: string = diffClass(confirmedQty, suggestedQty)
                  return (
                    <td key={column.size} className={cx(styles.num, sizeDiffClass)}>
                      <input
                        type="number"
                        className={cx(qtyInputClassName, sizeDiffClass)}
                        min={0}
                        step={1}
                        value={confirmedQty}
                        onChange={(event: React.ChangeEvent<HTMLInputElement>): void => onQtyChange(rowIndex, column.size, event.target.value)}
                        aria-label={ariaDiffLabel(`${row.round}${KO.optionInboundSplitRoundSuffix} ${column.size} ${KO.rowInboundSplitConfirmedQty}`, sizeDiffClass)}
                      />
                    </td>
                  )
                })}
              </tr>
            </Fragment>
          )
        })}
      </tbody>
    </table>
  )
}
