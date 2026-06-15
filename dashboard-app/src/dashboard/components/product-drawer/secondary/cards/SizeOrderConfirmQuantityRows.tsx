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
  inboundSplitConfirmedRoundsLocked: boolean
  columnConfirmTotal: number
  appliedInboundSplitConfirmTotal: number
  sizeRows: SecondarySizeOrderDisplayRow[]
  manualConfirmBySize: Readonly<Record<string, true>>
  appliedInboundSplitConfirmBySize: Readonly<Record<string, number>>
  appliedInboundSplitRows: readonly InboundSplitScheduleRow[]
  inboundSplitColumns: readonly InboundSplitSizeColumn[]
  onClearConfirmedRounds: () => void
  onConfirmQtyChange: (size: string, next: number, recommendedQty: number) => void
}

export function SizeOrderConfirmQuantityRows({
  calculationReady,
  inboundSplitConfirmedRoundsLocked,
  columnConfirmTotal,
  appliedInboundSplitConfirmTotal,
  sizeRows,
  manualConfirmBySize,
  appliedInboundSplitConfirmBySize,
  appliedInboundSplitRows,
  inboundSplitColumns,
  onClearConfirmedRounds,
  onConfirmQtyChange,
}: SizeOrderConfirmQuantityRowsProps): React.JSX.Element {
  return (
    <>
      <tr>
        <td>{KO.thConfirmQty}</td>
        <td className={styles.num}>{calculationReady ? formatGroupedNumber(inboundSplitConfirmedRoundsLocked ? appliedInboundSplitConfirmTotal : columnConfirmTotal) : KO.valueNotCalculated}</td>
        {sizeRows.map((row: SecondarySizeOrderDisplayRow): React.JSX.Element => {
          const manual: boolean = Boolean(manualConfirmBySize[row.size])
          const lockedConfirmQty: number = appliedInboundSplitConfirmBySize[row.size] ?? 0
          return (
            <td key={row.size} className={`${styles.num} ${styles.confirmQtyCell} ${manual && !inboundSplitConfirmedRoundsLocked ? styles.confirmQtyCellManual : ''}`}>
              <span className={styles.confirmQtyInputWrap}>
                {calculationReady && inboundSplitConfirmedRoundsLocked ? (
                  <span className={styles.stockComputedValue}>{formatGroupedNumber(lockedConfirmQty)}</span>
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
      {calculationReady && appliedInboundSplitRows.map((row: InboundSplitScheduleRow): React.JSX.Element => (
        <tr key={`applied-${row.id}`}>
          <td>{row.round}{KO.optionInboundSplitRoundSuffix} ({row.inboundDate} {KO.labelInboundSplitArrival}) (EA)</td>
          <td className={styles.num}>{formatGroupedNumber(getInboundSplitTotalQty(row, inboundSplitColumns))}</td>
          {sizeRows.map((sizeRow: SecondarySizeOrderDisplayRow): React.JSX.Element => (
            <td key={sizeRow.size} className={styles.num}>{formatGroupedNumber(row.quantitiesBySize[sizeRow.size] ?? 0)}</td>
          ))}
        </tr>
      ))}
    </>
  )
}
