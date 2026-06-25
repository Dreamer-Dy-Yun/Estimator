import { formatGroupedNumber } from '../../../../../utils/format'
import { KO } from '../../ko'
import styles from '../secondaryDrawer.module.css'
import type { InboundSplitSizeColumn } from './inboundSplitScheduleModel'
import type { InboundSplitDetailRow, InboundSplitDetailSection } from './inboundSplitScheduleDetailRows'
import { cx, stickyDateClassName, stickyKindClassName, stickyRoundClassName, stickyTotalClassName } from './inboundSplitScheduleTableClasses'

const DAY_MS = 86_400_000 as const

function formatExclusiveEndDate(endDate: string): string {
  const endMs: number = Date.parse(`${endDate}T00:00:00.000Z`)
  if (!Number.isFinite(endMs)) return `${endDate} ${KO.labelPreviousDay}`
  return new Date(endMs - DAY_MS).toISOString().slice(0, 10)
}

function formatPeriodLabel(startDate: string, endDate: string): string {
  if (startDate >= endDate) return `${startDate}~${startDate}`
  return `${startDate}~${formatExclusiveEndDate(endDate)}`
}

function getDetailDateLabel(row: InboundSplitDetailRow): string {
  if (row.date != null) return row.date
  return formatPeriodLabel(row.startDate, row.endDate)
}

function getDetailTotal(row: InboundSplitDetailRow, columns: readonly InboundSplitSizeColumn[]): number {
  return columns.reduce((sum: number, column: InboundSplitSizeColumn): number => sum + Math.max(0, Math.round(row.qtyBySize[column.size] ?? 0)), 0)
}

function formatDetailQty(value: number | null | undefined): string {
  if (value == null) return '-'
  return formatGroupedNumber(Math.max(0, Math.round(value)))
}

export function InboundSplitScheduleDetailRowsV2({
  section,
  columns,
}: {
  section: InboundSplitDetailSection
  columns: readonly InboundSplitSizeColumn[]
}): React.JSX.Element {
  return (
    <>
      {section.rows.map((row: InboundSplitDetailRow, rowIndex: number): React.JSX.Element => {
        const isLast: boolean = rowIndex === section.rows.length - 1
        const isTotal: boolean = row.kind === 'period-inbound-total'
        const isOpeningStock: boolean = row.kind === 'opening-stock'
        const mergedLabel: string | null = isOpeningStock
          ? KO.rowInboundSplitOpeningStock
          : isTotal
            ? section.periodInboundSummaryLabel ?? KO.rowInboundSplitPeriodInboundSummary
            : null
        return (
          <tr
            key={row.key}
            className={cx(
              styles.inboundSplitDetailRowV2,
              isTotal ? styles.inboundSplitDetailTotalRowV2 : null,
              isLast ? styles.inboundSplitDetailLastRowV2 : null,
            )}
          >
            <td className={cx(stickyRoundClassName, styles.inboundSplitDetailRoundBlankCellV2)} aria-hidden="true" />
            {mergedLabel != null ? (
              <td className={cx(stickyDateClassName, styles.inboundSplitDetailMergedLabelCellV2)} colSpan={2}>{mergedLabel}</td>
            ) : (
              <>
                <td className={stickyDateClassName}>{getDetailDateLabel(row)}</td>
                <td className={stickyKindClassName}>{KO.rowInboundSplitScheduledInbound}</td>
              </>
            )}
            <td className={stickyTotalClassName}>{formatGroupedNumber(getDetailTotal(row, columns))}</td>
            {columns.map((column: InboundSplitSizeColumn): React.JSX.Element => (
              <td key={column.size} className={styles.num}>{formatDetailQty(row.qtyBySize[column.size])}</td>
            ))}
          </tr>
        )
      })}
    </>
  )
}
