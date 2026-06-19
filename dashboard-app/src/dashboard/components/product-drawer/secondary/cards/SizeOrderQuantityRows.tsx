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
  label: string
  totalQty: number | null
  valueForSize: (row: SecondarySizeOrderDisplayRow, index: number) => number | null | undefined
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

function QuantityTableRow({ row, sizeRows, getCellClassName, onCellMouseEnter }: { row: QuantityRow; sizeRows: SecondarySizeOrderDisplayRow[]; getCellClassName: (rowKey: string, columnKey: string, baseClassName?: string) => string; onCellMouseEnter: (rowKey: string, columnKey: string) => void }): React.JSX.Element {
  const rowKey: string = `quantity:${row.label}`
  return (
    <tr>
      <td className={getCellClassName(rowKey, 'metric')} onMouseEnter={(): void => onCellMouseEnter(rowKey, 'metric')}><LabelWithHelp label={row.label} helpMark={row.helpMark} /></td>
      <td className={getCellClassName(rowKey, 'total', styles.num)} onMouseEnter={(): void => onCellMouseEnter(rowKey, 'total')}>{formatQuantityValue(row.totalQty)}</td>
      {sizeRows.map((sizeRow: SecondarySizeOrderDisplayRow, index: number): React.JSX.Element => (
        <td key={sizeRow.size} className={getCellClassName(rowKey, `size:${sizeRow.size}`, styles.num)} onMouseEnter={(): void => onCellMouseEnter(rowKey, `size:${sizeRow.size}`)}>{formatQuantityValue(row.valueForSize(sizeRow, index))}</td>
      ))}
    </tr>
  )
}

export function SizeOrderQuantityRows({ rows, sizeRows, getCellClassName, onCellMouseEnter }: SizeOrderQuantityRowsProps): React.JSX.Element {
  return (
    <>
      {rows.map((row: QuantityRow): React.JSX.Element => (
        <QuantityTableRow key={row.label} row={row} sizeRows={sizeRows} getCellClassName={getCellClassName} onCellMouseEnter={onCellMouseEnter} />
      ))}
    </>
  )
}
