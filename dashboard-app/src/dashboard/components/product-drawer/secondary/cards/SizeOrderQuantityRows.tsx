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

function QuantityTableRow({ row, sizeRows }: { row: QuantityRow; sizeRows: SecondarySizeOrderDisplayRow[] }): React.JSX.Element {
  return (
    <tr>
      <td><LabelWithHelp label={row.label} helpMark={row.helpMark} /></td>
      <td className={styles.num}>{formatQuantityValue(row.totalQty)}</td>
      {sizeRows.map((sizeRow: SecondarySizeOrderDisplayRow, index: number): React.JSX.Element => (
        <td key={sizeRow.size} className={styles.num}>{formatQuantityValue(row.valueForSize(sizeRow, index))}</td>
      ))}
    </tr>
  )
}

export function SizeOrderQuantityRows({ rows, sizeRows }: SizeOrderQuantityRowsProps): React.JSX.Element {
  return (
    <>
      {rows.map((row: QuantityRow): React.JSX.Element => (
        <QuantityTableRow key={row.label} row={row} sizeRows={sizeRows} />
      ))}
    </>
  )
}
