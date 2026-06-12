import { useCallback, useId, useMemo, useRef } from 'react'
import { DialogCloseButton } from '../../../../../components/DialogCloseButton'
import { useModalFocusTrap } from '../../../useModalFocusTrap'
import { formatGroupedNumber } from '../../../../../utils/format'
import { KO } from '../../ko'
import styles from '../secondaryDrawer.module.css'
import {
  MAX_INBOUND_SPLIT_COUNT,
  MIN_INBOUND_SPLIT_COUNT,
  clampInboundSplitCount,
  getInboundSplitTotalQty,
  type InboundSplitScheduleRow,
  type InboundSplitSizeColumn,
} from './inboundSplitScheduleModel'

export interface InboundSplitScheduleDialogProps {
  open: boolean
  count: number
  rows: InboundSplitScheduleRow[]
  columns: InboundSplitSizeColumn[]
  onCountChange: (next: number) => void
  onRowsChange: (next: InboundSplitScheduleRow[]) => void
  onClose: () => void
}

function toNonNegativeInteger(value: string): number {
  return Math.max(0, Math.round(Number(value) || 0))
}

export function InboundSplitScheduleDialog({
  open,
  count,
  rows,
  columns,
  onCountChange,
  onRowsChange,
  onClose,
}: InboundSplitScheduleDialogProps): React.JSX.Element | null {
  const titleId: string = useId()
  const panelRef: React.RefObject<HTMLElement | null> = useRef<HTMLElement | null>(null)
  const countOptions: number[] = useMemo(
    (): number[] => Array.from({ length: MAX_INBOUND_SPLIT_COUNT - MIN_INBOUND_SPLIT_COUNT + 1 }, (_: unknown, index: number): number => MIN_INBOUND_SPLIT_COUNT + index),
    [],
  )
  const handleKeyDown: (event: React.KeyboardEvent<HTMLElement>) => void = useModalFocusTrap({
    panelRef,
    active: open,
    onClose,
  })

  const handleDateChange: (rowIndex: number, value: string) => void = useCallback((rowIndex: number, value: string): void => {
    onRowsChange(rows.map((row: InboundSplitScheduleRow, index: number): InboundSplitScheduleRow => (
      index === rowIndex ? { ...row, inboundDate: value } : row
    )))
  }, [onRowsChange, rows])

  const handleQtyChange: (rowIndex: number, size: string, value: string) => void = useCallback((rowIndex: number, size: string, value: string): void => {
    const nextQty: number = toNonNegativeInteger(value)
    onRowsChange(rows.map((row: InboundSplitScheduleRow, index: number): InboundSplitScheduleRow => (
      index === rowIndex
        ? { ...row, quantitiesBySize: { ...row.quantitiesBySize, [size]: nextQty } }
        : row
    )))
  }, [onRowsChange, rows])

  if (!open) return null

  return (
    <div className={styles.inboundSplitDialogBackdrop} role="presentation" onClick={onClose}>
      <section
        ref={panelRef}
        className={styles.inboundSplitDialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onClick={(event: React.MouseEvent<HTMLElement, MouseEvent>): void => event.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <header className={styles.inboundSplitDialogHeader}>
          <div>
            <h3 id={titleId} className={styles.inboundSplitDialogTitle}>{KO.dialogInboundSplitTitle}</h3>
            <p className={styles.inboundSplitDialogHint}>{KO.msgInboundSplitDraftOnly}</p>
          </div>
          <DialogCloseButton onClose={onClose} />
        </header>
        <div className={styles.inboundSplitDialogToolbar}>
          <label className={styles.inboundSplitCountLabel}>
            <span>{KO.labelInboundSplitCount}</span>
            <select
              className={styles.inboundSplitCountSelect}
              value={count}
              onChange={(event: React.ChangeEvent<HTMLSelectElement, HTMLSelectElement>): void => onCountChange(clampInboundSplitCount(Number(event.target.value)))}
              aria-label={KO.ariaInboundSplitCount}
            >
              {countOptions.map((option: number): React.JSX.Element => (
                <option key={option} value={option}>{option}{KO.optionInboundSplitRoundSuffix}</option>
              ))}
            </select>
          </label>
          <span className={styles.inboundSplitSummary}>
            {KO.thTotal} {formatGroupedNumber(columns.reduce((sum: number, column: InboundSplitSizeColumn): number => sum + column.confirmedQty, 0))} EA
          </span>
        </div>
        <div className={styles.inboundSplitTableWrap}>
          <div className={styles.inboundSplitFixedPane}>
            <table className={`${styles.table} ${styles.inboundSplitTable} ${styles.inboundSplitFixedTable}`}>
              <thead>
                <tr>
                  <th className={styles.inboundSplitRoundCell}>{KO.thInboundSplitRound}</th>
                  <th className={styles.inboundSplitDateCell}>{KO.thInboundSplitInboundDate}</th>
                  <th className={`${styles.num} ${styles.inboundSplitTotalCell}`}>{KO.thInboundSplitTotalQty}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row: InboundSplitScheduleRow): React.JSX.Element => (
                  <tr key={row.id}>
                    <td className={styles.inboundSplitRoundCell}>{row.round}{KO.optionInboundSplitRoundSuffix}</td>
                    <td className={styles.inboundSplitDateCell}>
                      <input
                        type="date"
                        className={styles.stockDateInput}
                        value={row.inboundDate}
                        onChange={(event: React.ChangeEvent<HTMLInputElement, HTMLInputElement>): void => handleDateChange(rowIndex, event.target.value)}
                        aria-label={`${row.round}${KO.optionInboundSplitRoundSuffix} ${KO.thInboundSplitInboundDate}`}
                      />
                    </td>
                    <td className={`${styles.num} ${styles.inboundSplitTotalCell}`}>{formatGroupedNumber(getInboundSplitTotalQty(row, columns))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className={styles.inboundSplitSizePane}>
            <table className={`${styles.table} ${styles.inboundSplitTable} ${styles.inboundSplitSizeTable}`}>
              <thead>
                <tr>
                  {columns.map((column: InboundSplitSizeColumn): React.JSX.Element => (
                    <th key={column.size} className={styles.num}>{column.size}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row: InboundSplitScheduleRow, rowIndex: number): React.JSX.Element => (
                  <tr key={row.id}>
                    {columns.map((column: InboundSplitSizeColumn): React.JSX.Element => (
                      <td key={column.size} className={styles.num}>
                        <input
                          type="number"
                          className={`${styles.stockNumberInput} ${styles.inboundSplitQtyInput}`}
                          min={0}
                          step={1}
                          value={row.quantitiesBySize[column.size] ?? 0}
                          onChange={(event: React.ChangeEvent<HTMLInputElement, HTMLInputElement>): void => handleQtyChange(rowIndex, column.size, event.target.value)}
                          aria-label={`${row.round}${KO.optionInboundSplitRoundSuffix} ${column.size} ${KO.thConfirmQty}`}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <footer className={styles.inboundSplitDialogActions}>
          <button type="button" className={`${styles.btn} ${styles.btnSecondary}`} onClick={onClose}>{KO.btnCloseInboundSplitDialog}</button>
          <button type="button" className={styles.btn} onClick={onClose}>{KO.btnApplyInboundSplitSchedule}</button>
        </footer>
      </section>
    </div>
  )
}
