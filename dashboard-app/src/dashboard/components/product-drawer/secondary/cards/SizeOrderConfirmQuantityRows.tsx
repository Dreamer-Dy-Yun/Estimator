import type { SecondarySizeOrderDisplayRow } from '../model/secondarySizeOrderRows'
import { formatGroupedNumber } from '../../../../../utils/format'
import { KO } from '../../ko'
import styles from '../secondaryDrawer.module.css'
import {
  getInboundSplitTotalQty,
  type InboundSplitScheduleRow,
  type InboundSplitSizeColumn,
} from './inboundSplitScheduleModel'
import { parseConfirmQtyInput } from './sizeOrderCardModel'

interface SizeOrderConfirmQuantityRowsProps {
  calculationReady: boolean
  splitRoundsControlDirectConfirm: boolean
  columnConfirmTotal: number
  splitRoundConfirmTotal: number
  sizeRows: SecondarySizeOrderDisplayRow[]
  manualConfirmBySize: Readonly<Record<string, true>>
  splitRoundConfirmBySize: Readonly<Record<string, number>>
  splitRoundRows: readonly InboundSplitScheduleRow[]
  inboundSplitColumns: readonly InboundSplitSizeColumn[]
  getCellClassName: (rowKey: string, columnKey: string, baseClassName?: string) => string
  onCellMouseEnter: (rowKey: string, columnKey: string) => void
  onClearConfirmedRounds: () => void
  onConfirmQtyChange: (size: string, next: number, recommendedQty: number) => void
}

export function SizeOrderConfirmQuantityRows({
  calculationReady,
  splitRoundsControlDirectConfirm,
  columnConfirmTotal,
  splitRoundConfirmTotal,
  sizeRows,
  manualConfirmBySize,
  splitRoundConfirmBySize,
  splitRoundRows,
  inboundSplitColumns,
  getCellClassName,
  onCellMouseEnter,
  onClearConfirmedRounds,
  onConfirmQtyChange,
}: SizeOrderConfirmQuantityRowsProps): React.JSX.Element {
  const confirmRowKey: string = 'confirm'
  return (
    <>
      <tr>
        <td className={getCellClassName(confirmRowKey, 'metric')} onMouseEnter={(): void => onCellMouseEnter(confirmRowKey, 'metric')}>{KO.thConfirmQty}</td>
        <td className={getCellClassName(confirmRowKey, 'total', styles.num)} onMouseEnter={(): void => onCellMouseEnter(confirmRowKey, 'total')}>{calculationReady ? formatGroupedNumber(splitRoundsControlDirectConfirm ? splitRoundConfirmTotal : columnConfirmTotal) : KO.valueNotCalculated}</td>
        {sizeRows.map((row: SecondarySizeOrderDisplayRow): React.JSX.Element => {
          const manual: boolean = Boolean(manualConfirmBySize[row.size])
          const lockedConfirmQty: number = splitRoundConfirmBySize[row.size] ?? 0
          return (
            <td key={row.size} className={getCellClassName(confirmRowKey, `size:${row.size}`, `${styles.num} ${styles.confirmQtyCell} ${manual && !splitRoundsControlDirectConfirm ? styles.confirmQtyCellManual : ''}`)} onMouseEnter={(): void => onCellMouseEnter(confirmRowKey, `size:${row.size}`)}>
              <span className={styles.confirmQtyInputWrap}>
                {calculationReady && splitRoundsControlDirectConfirm ? (
                  <span className={`${styles.stockComputedValue} ${styles.confirmQtyPlainComputedValue}`}>{formatGroupedNumber(lockedConfirmQty)}</span>
                ) : calculationReady ? (
                  <input
                    type="number"
                    min={0}
                    step={1}
                    className={styles.stockNumberInput}
                    value={row.confirmQty}
                    onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
                      const next: number | null = parseConfirmQtyInput(event.target.value)
                      if (next != null) {
                        onClearConfirmedRounds()
                        onConfirmQtyChange(row.size, next, row.recommendedQty)
                      }
                    }}
                    aria-label={`${row.size} ${KO.thConfirmQty}`}
                  />
                ) : (
                  <span className={styles.stockComputedValue}>{KO.valueNotCalculated}</span>
                )}
              </span>
            </td>
          )
        })}
      </tr>
      {calculationReady && splitRoundRows.map((row: InboundSplitScheduleRow): React.JSX.Element => {
        const rowKey: string = `split:${row.id}`
        return (
        <tr key={`applied-${row.id}`}>
          <td className={getCellClassName(rowKey, 'metric')} onMouseEnter={(): void => onCellMouseEnter(rowKey, 'metric')}>
            <span className={styles.sizeOrderSplitRoundLabel}>
              {row.round}{KO.optionInboundSplitRoundSuffix} ({row.inboundDate} {KO.labelInboundSplitArrival}) ({KO.unitEa})
            </span>
          </td>
          <td className={getCellClassName(rowKey, 'total', styles.num)} onMouseEnter={(): void => onCellMouseEnter(rowKey, 'total')}>{formatGroupedNumber(getInboundSplitTotalQty(row, inboundSplitColumns))}</td>
          {sizeRows.map((sizeRow: SecondarySizeOrderDisplayRow): React.JSX.Element => (
            <td key={sizeRow.size} className={getCellClassName(rowKey, `size:${sizeRow.size}`, styles.num)} onMouseEnter={(): void => onCellMouseEnter(rowKey, `size:${sizeRow.size}`)}>{formatGroupedNumber(row.quantitiesBySize[sizeRow.size] ?? 0)}</td>
          ))}
        </tr>
        )
      })}
    </>
  )
}
