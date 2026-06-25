import type * as React from 'react'
import { PortalHelpMark } from '../../../PortalHelpPopover'
import commonStyles from '../../../common.module.css'
import type { usePortalHelpPopover } from '../../../usePortalHelpPopover'
import { KO } from '../../ko'
import styles from '../secondaryDrawer.module.css'
import type { SecondaryHelpId } from '../secondaryDrawerTypes'
import type { SecondarySizeOrderDisplayRow } from '../model/secondarySizeOrderRows'
import { formatOptionalGroupedNumber } from './sizeOrderCardModel'

export type HelpMark = {
  helpId: SecondaryHelpId
  labelId: string
  help: ReturnType<typeof usePortalHelpPopover<SecondaryHelpId>>
}

export type QuantityRow = {
  keyId?: string
  label: string
  totalQty: number | null
  valueForSize: (row: SecondarySizeOrderDisplayRow, index: number) => number | null | undefined
  indent?: boolean
  strongValues?: boolean
  toggle?: {
    expanded: boolean
    ariaLabel: string
    onToggle: () => void
  }
  helpMark?: HelpMark
}

export type SizeOrderQuantityRowsProps = {
  rows: QuantityRow[]
  sizeRows: SecondarySizeOrderDisplayRow[]
  getCellClassName: (rowKey: string, columnKey: string, baseClassName?: string) => string
  onCellMouseEnter: (rowKey: string, columnKey: string) => void
}

function LabelWithHelp({ label, helpMark }: { label: string; helpMark?: HelpMark }): string | React.JSX.Element {
  if (!helpMark) return label
  return (
    <span className={commonStyles.cardTitleWithHelp}>
      {label}
      <PortalHelpMark helpId={helpMark.helpId} placement="above" labelId={helpMark.labelId} markClassName={commonStyles.helpMark} help={helpMark.help} />
    </span>
  )
}

function formatQuantityValue(value: number | null | undefined): string {
  if (value == null) return KO.valueNotCalculated
  return formatOptionalGroupedNumber(value)
}

function QuantityRowLabel({ row }: { row: QuantityRow }): React.JSX.Element {
  return (
    <span className={`${styles.sizeOrderQuantityLabel} ${row.indent ? styles.sizeOrderQuantityLabelIndented : ''}`}>
      {row.toggle ? (
        <button
          type="button"
          className={styles.sizeOrderQuantityToggleButton}
          aria-label={row.toggle.ariaLabel}
          aria-expanded={row.toggle.expanded}
          onClick={row.toggle.onToggle}
        >
          {row.toggle.expanded ? '-' : '+'}
        </button>
      ) : null}
      <LabelWithHelp label={row.label} helpMark={row.helpMark} />
    </span>
  )
}

function QuantityTableRow({ row, sizeRows, getCellClassName, onCellMouseEnter }: { row: QuantityRow; sizeRows: SecondarySizeOrderDisplayRow[]; getCellClassName: (rowKey: string, columnKey: string, baseClassName?: string) => string; onCellMouseEnter: (rowKey: string, columnKey: string) => void }): React.JSX.Element {
  const rowKey: string = `quantity:${row.keyId ?? row.label}`
  const valueClassName: string = `${styles.num} ${row.strongValues ? styles.sizeOrderStrongValueCell : ''}`
  return (
    <tr>
      <td className={getCellClassName(rowKey, 'metric')} onMouseEnter={(): void => onCellMouseEnter(rowKey, 'metric')}><QuantityRowLabel row={row} /></td>
      <td className={getCellClassName(rowKey, 'total', valueClassName)} onMouseEnter={(): void => onCellMouseEnter(rowKey, 'total')}>{formatQuantityValue(row.totalQty)}</td>
      {sizeRows.map((sizeRow: SecondarySizeOrderDisplayRow, index: number): React.JSX.Element => (
        <td key={sizeRow.size} className={getCellClassName(rowKey, `size:${sizeRow.size}`, valueClassName)} onMouseEnter={(): void => onCellMouseEnter(rowKey, `size:${sizeRow.size}`)}>{formatQuantityValue(row.valueForSize(sizeRow, index))}</td>
      ))}
    </tr>
  )
}

export function SizeOrderQuantityRows({ rows, sizeRows, getCellClassName, onCellMouseEnter }: SizeOrderQuantityRowsProps): React.JSX.Element {
  return (
    <>
      {rows.map((row: QuantityRow): React.JSX.Element => (
        <QuantityTableRow key={row.keyId ?? row.label} row={row} sizeRows={sizeRows} getCellClassName={getCellClassName} onCellMouseEnter={onCellMouseEnter} />
      ))}
    </>
  )
}
