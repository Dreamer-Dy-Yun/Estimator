import { Fragment, type CSSProperties } from 'react'
import { formatGroupedNumber } from '../../../../../utils/format'
import { KO } from '../../ko'
import { DateInputWithWeekday } from '../../../../../components/DateInputWithWeekday'
import styles from '../secondaryDrawer.module.css'
import { getInboundSplitSuggestedTotalQty, getInboundSplitTotalQty, type InboundSplitScheduleRow, type InboundSplitSizeColumn } from './inboundSplitScheduleModel'
import { getInboundSplitDateInterval, isInboundSplitDateOutsideCoverage, type InboundSplitDateInterval } from './inboundSplitScheduleDatePolicy'
import { sumInboundSplitColumnTotals, sumInboundSplitConfirmedBySize, sumInboundSplitSuggestedBySize } from './inboundSplitScheduleTotals'
import { ariaDiffLabel, cx, diffClass, qtyInputClassName, stickyDateClassName, stickyKindClassName, stickyRoundClassName, stickyTotalClassName } from './inboundSplitScheduleTableClasses'
import { aggregateInboundSplitSuggestionBasisBySize, formatInboundSplitDateInterval, formatInboundSplitSuggestionBasisTooltip } from './inboundSplitScheduleTableDisplay'
import type { InboundSplitScheduleTableProps } from './inboundSplitScheduleVariantTypes'

type InboundSplitTableStyle = CSSProperties & {
  '--inbound-split-size-col-count': number
  '--inbound-split-size-col-divisor': number
}

export function InboundSplitScheduleTableV0({
  currentOrderInboundDueDate,
  nextOrderInboundDueDate,
  rows,
  columns,
  datesLocked,
  onDatesLockedToggle,
  onDateChange,
  onRowTotalChange,
  onQtyChange,
}: InboundSplitScheduleTableProps): React.JSX.Element {
  const visibleRows: Array<{ row: InboundSplitScheduleRow; index: number }> = rows
    .map((row: InboundSplitScheduleRow, index: number): { row: InboundSplitScheduleRow; index: number } => ({ row, index }))
    .filter((entry: { row: InboundSplitScheduleRow; index: number }): boolean => entry.row.inboundDate < nextOrderInboundDueDate)
  const visibleRowValues: InboundSplitScheduleRow[] = visibleRows.map((entry: { row: InboundSplitScheduleRow; index: number }): InboundSplitScheduleRow => entry.row)

  const suggestedSizeTotals: Record<string, number> = sumInboundSplitSuggestedBySize(visibleRowValues, columns)
  const confirmedSizeTotals: Record<string, number> = sumInboundSplitConfirmedBySize(visibleRowValues, columns)
  const suggestedGrandTotal: number = sumInboundSplitColumnTotals(columns, suggestedSizeTotals)
  const confirmedGrandTotal: number = sumInboundSplitColumnTotals(columns, confirmedSizeTotals)
  const summaryDiffClass: string = diffClass(confirmedGrandTotal, suggestedGrandTotal)
  const formattedConfirmedGrandTotal: string = formatGroupedNumber(confirmedGrandTotal)
  const tableStyle: InboundSplitTableStyle = {
    '--inbound-split-size-col-count': columns.length,
    '--inbound-split-size-col-divisor': Math.max(columns.length, 1),
  }

  return (
    <table className={`${styles.table} ${styles.inboundSplitTable}`} style={tableStyle}>
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
          <td className={cx(stickyRoundClassName, styles.inboundSplitSummarySpanCell)} rowSpan={2}>{KO.labelAll}</td>
          <td className={cx(stickyDateClassName, styles.inboundSplitSummarySpanCell)} rowSpan={2}>
            <button
              type="button"
              className={styles.inboundSplitDateLockButton}
              aria-pressed={datesLocked}
              onClick={onDatesLockedToggle}
            >
              {datesLocked ? KO.btnInboundSplitUnlockDates : KO.btnInboundSplitLockDates}
            </button>
          </td>
          <td className={stickyKindClassName}>{KO.rowInboundSplitSuggestedQty}</td>
          <td className={stickyTotalClassName}>
            <div className={styles.inboundSplitSummaryTotalCell}>
              <span>{formatGroupedNumber(suggestedGrandTotal)}</span>
            </div>
          </td>
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
        {visibleRows.map((entry: { row: InboundSplitScheduleRow; index: number }, visibleRowIndex: number): React.JSX.Element => {
          const row: InboundSplitScheduleRow = entry.row
          const rowIndex: number = entry.index
          const previousInboundDate: string = visibleRowIndex === 0 ? currentOrderInboundDueDate : (visibleRows[visibleRowIndex - 1]?.row.inboundDate ?? currentOrderInboundDueDate)
          const suggestedTotalQty: number = getInboundSplitSuggestedTotalQty(row, columns)
          const confirmedTotalQty: number = getInboundSplitTotalQty(row, columns)
          const totalDiffClass: string = diffClass(confirmedTotalQty, suggestedTotalQty)
          const dateInterval: InboundSplitDateInterval = getInboundSplitDateInterval(previousInboundDate, row.inboundDate, { allowSameDate: visibleRowIndex === 0 })
          const invalidDatePolicy: boolean = dateInterval.invalidDateOrder || isInboundSplitDateOutsideCoverage(currentOrderInboundDueDate, nextOrderInboundDueDate, row.inboundDate)
          const dateIntervalText: string = formatInboundSplitDateInterval(dateInterval)
          const dateIntervalId: string = `inbound-split-date-interval-${rowIndex}`
          const suggestedTotalBasisTooltip: string | undefined = formatInboundSplitSuggestionBasisTooltip(aggregateInboundSplitSuggestionBasisBySize(row, columns))

          return (
            <Fragment key={row.id}>
              <tr className={styles.inboundSplitSuggestedRow}>
                <td className={cx(stickyRoundClassName, styles.inboundSplitRowSpanCell)} rowSpan={2}>{row.round}{KO.optionInboundSplitRoundSuffix}</td>
                <td className={cx(stickyDateClassName, styles.inboundSplitRowSpanCell)} rowSpan={2}>
                  <div className={styles.inboundSplitDateStack}>
                    <DateInputWithWeekday
                      ariaLabel={`${row.round}${KO.optionInboundSplitRoundSuffix} ${KO.thInboundSplitInboundDate}`}
                      value={row.inboundDate}
                      onChange={(value: string): void => onDateChange(rowIndex, value)}
                      inputClassName={styles.stockDateInput}
                      disabled={datesLocked}
                      ariaDescribedBy={dateIntervalId}
                      ariaInvalid={invalidDatePolicy ? true : undefined}
                    />
                    <span
                      id={dateIntervalId}
                      className={cx(styles.inboundSplitDateInterval, invalidDatePolicy ? styles.inboundSplitDateIntervalInvalid : null)}
                      aria-label={`${row.round}${KO.optionInboundSplitRoundSuffix} ${KO.labelInboundSplitDateInterval} ${dateIntervalText}`}
                    >
                      {dateIntervalText}
                    </span>
                  </div>
                </td>
                <td className={stickyKindClassName}>{KO.rowInboundSplitSuggestedQty}</td>
                <td className={stickyTotalClassName}>
                  <span className={suggestedTotalBasisTooltip ? styles.inboundSplitSuggestedBasisCell : undefined} data-tooltip={suggestedTotalBasisTooltip} tabIndex={suggestedTotalBasisTooltip ? 0 : undefined}>
                    {formatGroupedNumber(suggestedTotalQty)}
                  </span>
                </td>
                {columns.map((column: InboundSplitSizeColumn): React.JSX.Element => {
                  const suggestedBasisTooltip: string | undefined = formatInboundSplitSuggestionBasisTooltip(row.suggestionBasisBySize?.[column.size] ?? null)
                  return (
                    <td key={column.size} className={styles.num}>
                      <span className={suggestedBasisTooltip ? styles.inboundSplitSuggestedBasisCell : undefined} data-tooltip={suggestedBasisTooltip} tabIndex={suggestedBasisTooltip ? 0 : undefined}>
                        {formatGroupedNumber(row.suggestedQuantitiesBySize[column.size] ?? 0)}
                      </span>
                    </td>
                  )
                })}
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
                    disabled={!datesLocked}
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
                        disabled={!datesLocked}
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
