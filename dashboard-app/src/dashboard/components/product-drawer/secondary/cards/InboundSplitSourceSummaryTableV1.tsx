import type { CSSProperties } from 'react'
import type { SecondaryInboundSplitExpectationPoint, SecondaryInboundSplitSource } from '../../../../../api/types/secondary'
import { formatGroupedNumber } from '../../../../../utils/format'
import { KO } from '../../ko'
import styles from '../secondaryDrawer.module.css'
import type { InboundSplitSizeColumn } from './inboundSplitScheduleModel'
import { cx } from './inboundSplitScheduleTableClasses'

interface InboundSplitSourceSummaryTableV1Props {
  source: SecondaryInboundSplitSource
  columns: InboundSplitSizeColumn[]
  calculationBaseDate: string
  currentOrderInboundDueDate: string
  nextOrderInboundDueDate: string
  splitSourceWindowEndDate: string
  excludeCurrentToNextExistingOrderInbound: boolean
}

interface SourceSummaryRow {
  key: string
  label: string
  qtyBySize: Record<string, number | null>
  openingStock?: boolean
  periodInboundTotal?: boolean
}

type SourceSummaryTableStyle = CSSProperties & {
  '--inbound-split-size-col-count': number
  '--inbound-split-size-col-divisor': number
}

const sourceDateClassName: string = cx(styles.inboundSplitSourceDateCell, styles.inboundSplitStickyCol, styles.inboundSplitStickyColSourceDate)
const sourceTotalClassName: string = cx(styles.num, styles.inboundSplitSourceTotalCell, styles.inboundSplitStickyCol, styles.inboundSplitStickyColSourceTotal)

function normalizeQty(value: number | null | undefined): number | null {
  if (value == null || !Number.isFinite(value)) return null
  return Math.max(0, Math.round(value))
}

function getRowTotal(row: SourceSummaryRow, columns: readonly InboundSplitSizeColumn[]): number {
  return columns.reduce((sum: number, column: InboundSplitSizeColumn): number => sum + (row.qtyBySize[column.size] ?? 0), 0)
}

function getExpectationPoints(
  source: SecondaryInboundSplitSource,
  size: string,
  splitSourceWindowEndDate: string,
): SecondaryInboundSplitExpectationPoint[] {
  return (source.expectation[size] ?? [])
    .filter((point: SecondaryInboundSplitExpectationPoint): boolean => point.date < splitSourceWindowEndDate)
}

function buildSourceSummaryRows(
  source: SecondaryInboundSplitSource,
  columns: readonly InboundSplitSizeColumn[],
  calculationBaseDate: string,
  currentOrderInboundDueDate: string,
  nextOrderInboundDueDate: string,
  splitSourceWindowEndDate: string,
  excludeCurrentToNextExistingOrderInbound: boolean,
): SourceSummaryRow[] {
  const openingQtyBySize: Record<string, number | null> = {}
  const periodInboundQtyBySize: Record<string, number> = {}
  const inboundQtyByDate: Map<string, Record<string, number>> = new Map<string, Record<string, number>>()

  columns.forEach((column: InboundSplitSizeColumn): void => {
    openingQtyBySize[column.size] = normalizeQty(source.sizeInfo[column.size]?.baseStock)
    periodInboundQtyBySize[column.size] = 0

    const expectationPoints: SecondaryInboundSplitExpectationPoint[] = getExpectationPoints(
      source,
      column.size,
      splitSourceWindowEndDate,
    )
    expectationPoints.forEach((point: SecondaryInboundSplitExpectationPoint): void => {
      if (excludeCurrentToNextExistingOrderInbound && point.date >= currentOrderInboundDueDate && point.date < nextOrderInboundDueDate) return
      const inboundQty: number | null = normalizeQty(point.inbound)
      if (inboundQty == null || inboundQty <= 0) return
      periodInboundQtyBySize[column.size] = (periodInboundQtyBySize[column.size] ?? 0) + inboundQty
      const dateRow: Record<string, number> = inboundQtyByDate.get(point.date) ?? {}
      dateRow[column.size] = (dateRow[column.size] ?? 0) + inboundQty
      inboundQtyByDate.set(point.date, dateRow)
    })
  })

  const inboundRows: SourceSummaryRow[] = Array.from(inboundQtyByDate.entries())
    .sort(([leftDate]: [string, Record<string, number>], [rightDate]: [string, Record<string, number>]): number => leftDate.localeCompare(rightDate))
    .map(([date, qtyBySize]: [string, Record<string, number>]): SourceSummaryRow => ({
      key: `inbound-${date}`,
      label: date,
      qtyBySize,
    }))

  const openingStockRow: SourceSummaryRow = {
    key: 'opening-stock',
    label: `${KO.rowInboundSplitOpeningStock} (${calculationBaseDate})`,
    qtyBySize: openingQtyBySize,
    openingStock: true,
  }

  return [openingStockRow, {
    key: 'period-inbound-total',
    label: KO.rowInboundSplitPeriodInboundTotal,
    qtyBySize: periodInboundQtyBySize,
    periodInboundTotal: true,
  }, ...inboundRows]
}

function formatQty(value: number | null | undefined): string {
  if (value == null) return '-'
  return formatGroupedNumber(value)
}

export function InboundSplitSourceSummaryTableV1({
  source,
  columns,
  calculationBaseDate,
  currentOrderInboundDueDate,
  nextOrderInboundDueDate,
  splitSourceWindowEndDate,
  excludeCurrentToNextExistingOrderInbound,
}: InboundSplitSourceSummaryTableV1Props): React.JSX.Element {
  const rows: SourceSummaryRow[] = buildSourceSummaryRows(
    source,
    columns,
    calculationBaseDate,
    currentOrderInboundDueDate,
    nextOrderInboundDueDate,
    splitSourceWindowEndDate,
    excludeCurrentToNextExistingOrderInbound,
  )
  const tableStyle: SourceSummaryTableStyle = {
    '--inbound-split-size-col-count': columns.length,
    '--inbound-split-size-col-divisor': Math.max(columns.length, 1),
  }

  return (
    <table className={`${styles.table} ${styles.inboundSplitTable} ${styles.inboundSplitSourceSummaryTable}`} style={tableStyle}>
      <thead>
        <tr>
          <th className={sourceDateClassName}>{KO.thInboundSplitSourceDate}</th>
          <th className={sourceTotalClassName}>{KO.thInboundSplitTotalQty}</th>
          {columns.map((column: InboundSplitSizeColumn): React.JSX.Element => (
            <th key={column.size} className={styles.num}>{column.size}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row: SourceSummaryRow): React.JSX.Element => (
          <tr
            key={row.key}
            className={cx(
              styles.inboundSplitSourceSummaryRow,
              row.openingStock ? styles.inboundSplitSourceOpeningStockRow : null,
              row.periodInboundTotal ? styles.inboundSplitSourcePeriodInboundTotalRow : null,
            )}
          >
            <td className={sourceDateClassName}>{row.label}</td>
            <td className={sourceTotalClassName}>{formatGroupedNumber(getRowTotal(row, columns))}</td>
            {columns.map((column: InboundSplitSizeColumn): React.JSX.Element => {
              const qty: number | null | undefined = row.openingStock ? row.qtyBySize[column.size] : (row.qtyBySize[column.size] ?? 0)
              return <td key={column.size} className={styles.num}>{formatQty(qty)}</td>
            })}
          </tr>
        ))}
      </tbody>
    </table>
  )
}
