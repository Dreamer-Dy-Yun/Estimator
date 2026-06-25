import { useState, type CSSProperties } from 'react'
import type { SecondaryExistingOrderInboundSupplyBySize, SecondaryInboundSplitSource } from '../../../../../api/types/secondary'
import { formatGroupedNumber } from '../../../../../utils/format'
import { KO } from '../../ko'
import styles from '../secondaryDrawer.module.css'
import type { InboundSplitSizeColumn } from './inboundSplitScheduleModel'
import { cx } from './inboundSplitScheduleTableClasses'
import {
  EMPTY_INBOUND_SPLIT_SOURCE_SUMMARY_EXPANDED_SECTIONS,
  buildInboundSplitSourceSummaryRowsV1,
  getInboundSplitSourceSummaryRowTotal,
  type InboundSplitExistingInboundSectionKey,
  type InboundSplitSourceSummaryExpandedSections,
  type InboundSplitSourceSummaryRowV1,
} from './inboundSplitSourceSummaryV1Model'

interface InboundSplitSourceSummaryTableV1Props {
  source: SecondaryInboundSplitSource
  columns: InboundSplitSizeColumn[]
  existingOrderInboundSupplyBySize?: SecondaryExistingOrderInboundSupplyBySize | null
  calculationBaseDate: string
  currentOrderInboundDueDate: string
  nextOrderInboundDueDate: string
}

type SourceSummaryTableStyle = CSSProperties & {
  '--inbound-split-size-col-count': number
  '--inbound-split-size-col-divisor': number
}

const sourceDateClassName: string = cx(styles.inboundSplitSourceDateCell, styles.inboundSplitStickyCol, styles.inboundSplitStickyColSourceDate)
const sourceTotalClassName: string = cx(styles.num, styles.inboundSplitSourceTotalCell, styles.inboundSplitStickyCol, styles.inboundSplitStickyColSourceTotal)

function formatQty(value: number | null | undefined): string {
  if (value == null) return '-'
  return formatGroupedNumber(value)
}

const SECTION_LABELS: Record<InboundSplitExistingInboundSectionKey, string> = {
  beforeCurrent: KO.rowTotalOrderBalanceBeforeCurrent,
  inPeriod: KO.rowTotalOrderBalanceInPeriod,
  afterNext: KO.rowTotalOrderBalanceAfterNext,
}

function getRowLabel(row: InboundSplitSourceSummaryRowV1): string {
  if (row.kind === 'opening-stock') return `${KO.rowInboundSplitOpeningStock} (${row.date ?? '-'})`
  if (row.kind === 'balance-total') return KO.rowTotalOrderBalance
  if (row.kind === 'balance-section' && row.sectionKey) return SECTION_LABELS[row.sectionKey]
  if (row.kind === 'balance-detail') return row.date ?? '-'
  return '-'
}

export function InboundSplitSourceSummaryTableV1({
  source,
  columns,
  existingOrderInboundSupplyBySize,
  calculationBaseDate,
  currentOrderInboundDueDate,
  nextOrderInboundDueDate,
}: InboundSplitSourceSummaryTableV1Props): React.JSX.Element {
  const [expandedSections, setExpandedSections] = useState<InboundSplitSourceSummaryExpandedSections>(
    EMPTY_INBOUND_SPLIT_SOURCE_SUMMARY_EXPANDED_SECTIONS,
  )
  const rows: InboundSplitSourceSummaryRowV1[] = buildInboundSplitSourceSummaryRowsV1(
    source,
    columns,
    existingOrderInboundSupplyBySize,
    calculationBaseDate,
    currentOrderInboundDueDate,
    nextOrderInboundDueDate,
    expandedSections,
  )
  const tableStyle: SourceSummaryTableStyle = {
    '--inbound-split-size-col-count': columns.length,
    '--inbound-split-size-col-divisor': Math.max(columns.length, 1),
  }
  const toggleSection: (sectionKey: InboundSplitExistingInboundSectionKey) => void = (sectionKey: InboundSplitExistingInboundSectionKey): void => {
    setExpandedSections((current: InboundSplitSourceSummaryExpandedSections): InboundSplitSourceSummaryExpandedSections => ({
      ...current,
      [sectionKey]: !current[sectionKey],
    }))
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
        {rows.map((row: InboundSplitSourceSummaryRowV1): React.JSX.Element => (
          <tr
            key={row.key}
            className={cx(
              styles.inboundSplitSourceSummaryRow,
              row.kind === 'opening-stock' ? styles.inboundSplitSourceOpeningStockRow : null,
              row.kind === 'balance-total' ? styles.inboundSplitSourceBalanceTotalRow : null,
              row.kind === 'balance-section' ? styles.inboundSplitSourceBalanceSectionRow : null,
              row.kind === 'balance-detail' ? styles.inboundSplitSourceBalanceDetailRow : null,
            )}
          >
            <td className={sourceDateClassName}>
              <span className={cx(styles.inboundSplitSourceRowLabel, row.kind === 'balance-detail' ? styles.inboundSplitSourceRowLabelIndented : null)}>
                {row.kind === 'balance-section' && row.sectionKey ? (
                  <button
                    type="button"
                    className={styles.inboundSplitSourceToggleButton}
                    aria-expanded={expandedSections[row.sectionKey]}
                    onClick={(): void => toggleSection(row.sectionKey!)}
                  >
                    {expandedSections[row.sectionKey] ? '-' : '+'}
                  </button>
                ) : null}
                <span>{getRowLabel(row)}</span>
              </span>
            </td>
            <td className={sourceTotalClassName}>{formatGroupedNumber(getInboundSplitSourceSummaryRowTotal(row, columns))}</td>
            {columns.map((column: InboundSplitSizeColumn): React.JSX.Element => {
              const qty: number | null | undefined = row.kind === 'opening-stock' ? row.qtyBySize[column.size] : (row.qtyBySize[column.size] ?? 0)
              return <td key={column.size} className={styles.num}>{formatQty(qty)}</td>
            })}
          </tr>
        ))}
      </tbody>
    </table>
  )
}
