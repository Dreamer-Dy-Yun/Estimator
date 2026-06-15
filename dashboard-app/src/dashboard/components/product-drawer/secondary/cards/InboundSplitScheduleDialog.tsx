import { Fragment, useCallback, useId, useMemo, useRef, useState } from 'react'
import { DialogCloseButton } from '../../../../../components/DialogCloseButton'
import { useModalFocusTrap } from '../../../useModalFocusTrap'
import type { ApiUnitErrorInfo } from '../../../../../types'
import { formatGroupedNumber } from '../../../../../utils/format'
import { KO } from '../../ko'
import styles from '../secondaryDrawer.module.css'
import {
  MAX_INBOUND_SPLIT_COUNT,
  MIN_INBOUND_SPLIT_COUNT,
  allocateInboundSplitIntegerTotal,
  clampInboundSplitCount,
  cloneInboundSplitRows,
  getInboundSplitSuggestedTotalQty,
  getInboundSplitTotalQty,
  type InboundSplitScheduleRow,
  type InboundSplitSizeColumn,
} from './inboundSplitScheduleModel'

export interface InboundSplitScheduleDialogProps {
  open: boolean
  initialCount: number
  initialRows: InboundSplitScheduleRow[]
  columns: InboundSplitSizeColumn[]
  buildRowsForCount: (next: number) => InboundSplitScheduleRow[]
  recalculateRows: (rows: InboundSplitScheduleRow[]) => InboundSplitScheduleRow[]
  draftError?: ApiUnitErrorInfo | null
  onDraftError?: (err: unknown | null, request: string) => void
  onApply: (rows: InboundSplitScheduleRow[]) => void
  onClose: () => void
}

function toNonNegativeInteger(value: string): number {
  return Math.max(0, Math.round(Number(value) || 0))
}

export function InboundSplitScheduleDialog({
  open,
  initialCount,
  initialRows = [],
  columns,
  buildRowsForCount,
  recalculateRows,
  draftError = null,
  onDraftError,
  onApply,
  onClose,
}: InboundSplitScheduleDialogProps): React.JSX.Element | null {
  const titleId: string = useId()
  const descriptionId: string = useId()
  const panelRef: React.RefObject<HTMLElement | null> = useRef<HTMLElement | null>(null)
  const [count, setCount]: [number, React.Dispatch<React.SetStateAction<number>>] = useState<number>(initialCount)
  const [rows, setRows]: [InboundSplitScheduleRow[], React.Dispatch<React.SetStateAction<InboundSplitScheduleRow[]>>] = useState<InboundSplitScheduleRow[]>((): InboundSplitScheduleRow[] => cloneInboundSplitRows(initialRows))
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
    setRows((currentRows: InboundSplitScheduleRow[]): InboundSplitScheduleRow[] => {
      const nextRows: InboundSplitScheduleRow[] = currentRows.map((row: InboundSplitScheduleRow, index: number): InboundSplitScheduleRow => (
        index === rowIndex ? { ...row, inboundDate: value } : row
      ))
      try {
        const recalculatedRows: InboundSplitScheduleRow[] = recalculateRows(nextRows)
        onDraftError?.(null, 'recalculateInboundSplitScheduleRows')
        return recalculatedRows
      } catch (err: unknown) {
        onDraftError?.(err, 'recalculateInboundSplitScheduleRows')
        return currentRows
      }
    })
  }, [onDraftError, recalculateRows])

  const handleCountChange: (value: string) => void = useCallback((value: string): void => {
    const nextCount: number = clampInboundSplitCount(Number(value))
    try {
      const nextRows: InboundSplitScheduleRow[] = buildRowsForCount(nextCount)
      setCount(nextCount)
      setRows(nextRows)
      onDraftError?.(null, 'buildInboundSplitScheduleRows')
    } catch (err: unknown) {
      onDraftError?.(err, 'buildInboundSplitScheduleRows')
    }
  }, [buildRowsForCount, onDraftError])

  const suggestedSizeTotals: Record<string, number> = useMemo((): Record<string, number> => {
    const totals: Record<string, number> = {}
    columns.forEach((column: InboundSplitSizeColumn): void => {
      totals[column.size] = rows.reduce((sum: number, row: InboundSplitScheduleRow): number => sum + Math.max(0, Math.round(row.suggestedQuantitiesBySize[column.size] ?? 0)), 0)
    })
    return totals
  }, [columns, rows])

  const confirmedSizeTotals: Record<string, number> = useMemo((): Record<string, number> => {
    const totals: Record<string, number> = {}
    columns.forEach((column: InboundSplitSizeColumn): void => {
      totals[column.size] = rows.reduce((sum: number, row: InboundSplitScheduleRow): number => sum + Math.max(0, Math.round(row.quantitiesBySize[column.size] ?? 0)), 0)
    })
    return totals
  }, [columns, rows])

  const suggestedGrandTotal: number = useMemo(
    (): number => columns.reduce((sum: number, column: InboundSplitSizeColumn): number => sum + (suggestedSizeTotals[column.size] ?? 0), 0),
    [columns, suggestedSizeTotals],
  )
  const confirmedGrandTotal: number = useMemo(
    (): number => columns.reduce((sum: number, column: InboundSplitSizeColumn): number => sum + (confirmedSizeTotals[column.size] ?? 0), 0),
    [columns, confirmedSizeTotals],
  )

  const handleRowTotalChange: (rowIndex: number, value: string) => void = useCallback((rowIndex: number, value: string): void => {
    setRows((currentRows: InboundSplitScheduleRow[]): InboundSplitScheduleRow[] => {
      const currentRow: InboundSplitScheduleRow | undefined = currentRows[rowIndex]
      if (!currentRow) return currentRows

      const distributed: number[] = allocateInboundSplitIntegerTotal({
        total: toNonNegativeInteger(value),
        weights: columns.map((column: InboundSplitSizeColumn): number => currentRow.suggestedQuantitiesBySize[column.size] ?? currentRow.quantitiesBySize[column.size] ?? 0),
      }).values
      return currentRows.map((row: InboundSplitScheduleRow, index: number): InboundSplitScheduleRow => {
        if (index !== rowIndex) return row
        const quantitiesBySize: Record<string, number> = { ...row.quantitiesBySize }
        columns.forEach((column: InboundSplitSizeColumn, columnIndex: number): void => {
          quantitiesBySize[column.size] = distributed[columnIndex] ?? 0
        })
        return { ...row, quantitiesBySize }
      })
    })
  }, [columns])

  const handleQtyChange: (rowIndex: number, size: string, value: string) => void = useCallback((rowIndex: number, size: string, value: string): void => {
    const nextQty: number = toNonNegativeInteger(value)
    setRows((currentRows: InboundSplitScheduleRow[]): InboundSplitScheduleRow[] => currentRows.map((row: InboundSplitScheduleRow, index: number): InboundSplitScheduleRow => (
      index === rowIndex
        ? { ...row, quantitiesBySize: { ...row.quantitiesBySize, [size]: nextQty } }
        : row
    )))
  }, [])

  const diffClass: (confirmed: number, suggested: number) => string = useCallback((confirmed: number, suggested: number): string => (
    Math.max(0, Math.round(confirmed)) === Math.max(0, Math.round(suggested)) ? '' : styles.inboundSplitConfirmedDiff
  ), [])

  if (!open) return null

  return (
    <div className={styles.inboundSplitDialogBackdrop} role="presentation" onClick={onClose}>
      <section
        ref={panelRef}
        className={styles.inboundSplitDialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        tabIndex={-1}
        onClick={(event: React.MouseEvent<HTMLElement, MouseEvent>): void => event.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <header className={styles.inboundSplitDialogHeader}>
          <div>
            <h3 id={titleId} className={styles.inboundSplitDialogTitle}>{KO.dialogInboundSplitTitle}</h3>
            <p id={descriptionId} className={styles.inboundSplitDialogHint}>{KO.msgInboundSplitDraftOnly}</p>
          </div>
          <DialogCloseButton onClose={onClose} />
        </header>
        <div className={styles.inboundSplitDialogToolbar}>
          <label className={styles.inboundSplitCountLabel}>
            <span>{KO.labelInboundSplitCount}</span>
            <select
              className={styles.inboundSplitCountSelect}
              value={count}
              onChange={(event: React.ChangeEvent<HTMLSelectElement>): void => handleCountChange(event.target.value)}
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
        {draftError && (
          <p className={styles.inboundSplitSourceError} role="alert">
            {draftError.error}
          </p>
        )}
        <div className={styles.inboundSplitTableFrame}>
          <div className={styles.inboundSplitTableWrap}>
            <table className={`${styles.table} ${styles.inboundSplitTable}`}>
            <thead>
              <tr>
                <th className={`${styles.inboundSplitRoundCell} ${styles.inboundSplitStickyCol} ${styles.inboundSplitStickyColRound}`}>{KO.thInboundSplitRound}</th>
                <th className={`${styles.inboundSplitDateCell} ${styles.inboundSplitStickyCol} ${styles.inboundSplitStickyColDate}`}>{KO.thInboundSplitInboundDate}</th>
                <th className={`${styles.inboundSplitKindCell} ${styles.inboundSplitStickyCol} ${styles.inboundSplitStickyColKind}`}>{KO.thMetric}</th>
                <th className={`${styles.num} ${styles.inboundSplitTotalCell} ${styles.inboundSplitStickyCol} ${styles.inboundSplitStickyColTotal}`}>{KO.thInboundSplitTotalQty}</th>
                {columns.map((column: InboundSplitSizeColumn): React.JSX.Element => (
                  <th key={column.size} className={styles.num}>{column.size}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className={styles.inboundSplitSummaryRow}>
                <td className={`${styles.inboundSplitRoundCell} ${styles.inboundSplitStickyCol} ${styles.inboundSplitStickyColRound} ${styles.inboundSplitSummarySpanCell}`} rowSpan={2}>{KO.thInboundSplitTotalQty}</td>
                <td className={`${styles.inboundSplitDateCell} ${styles.inboundSplitStickyCol} ${styles.inboundSplitStickyColDate} ${styles.inboundSplitSummarySpanCell}`} rowSpan={2}>-</td>
                <td className={`${styles.inboundSplitKindCell} ${styles.inboundSplitStickyCol} ${styles.inboundSplitStickyColKind}`}>{KO.rowInboundSplitSuggestedQty}</td>
                <td className={`${styles.num} ${styles.inboundSplitTotalCell} ${styles.inboundSplitStickyCol} ${styles.inboundSplitStickyColTotal}`}>{formatGroupedNumber(suggestedGrandTotal)}</td>
                {columns.map((column: InboundSplitSizeColumn): React.JSX.Element => (
                  <td key={column.size} className={styles.num}>{formatGroupedNumber(suggestedSizeTotals[column.size] ?? 0)}</td>
                ))}
              </tr>
              <tr className={`${styles.inboundSplitSummaryRow} ${styles.inboundSplitSummaryRowEnd}`}>
                <td className={`${styles.inboundSplitKindCell} ${styles.inboundSplitStickyCol} ${styles.inboundSplitStickyColKind}`}>{KO.rowInboundSplitConfirmedQty}</td>
                <td className={`${styles.num} ${styles.inboundSplitTotalCell} ${styles.inboundSplitStickyCol} ${styles.inboundSplitStickyColTotal} ${diffClass(confirmedGrandTotal, suggestedGrandTotal)}`}>{formatGroupedNumber(confirmedGrandTotal)}</td>
                {columns.map((column: InboundSplitSizeColumn): React.JSX.Element => (
                  <td key={column.size} className={`${styles.num} ${diffClass(confirmedSizeTotals[column.size] ?? 0, suggestedSizeTotals[column.size] ?? 0)}`}>{formatGroupedNumber(confirmedSizeTotals[column.size] ?? 0)}</td>
                ))}
              </tr>
              {rows.map((row: InboundSplitScheduleRow, rowIndex: number): React.JSX.Element => {
                const suggestedTotalQty: number = getInboundSplitSuggestedTotalQty(row, columns)
                const confirmedTotalQty: number = getInboundSplitTotalQty(row, columns)
                const totalDiffClass: string = diffClass(confirmedTotalQty, suggestedTotalQty)

                return (
                <Fragment key={row.id}>
                  <tr className={styles.inboundSplitSuggestedRow}>
                    <td className={`${styles.inboundSplitRoundCell} ${styles.inboundSplitStickyCol} ${styles.inboundSplitStickyColRound} ${styles.inboundSplitRoundSpanCell}`} rowSpan={2}>{row.round}{KO.optionInboundSplitRoundSuffix}</td>
                    <td className={`${styles.inboundSplitDateCell} ${styles.inboundSplitStickyCol} ${styles.inboundSplitStickyColDate} ${styles.inboundSplitRoundSpanCell}`} rowSpan={2}>
                      <input
                        type="date"
                        className={styles.stockDateInput}
                        value={row.inboundDate}
                        onChange={(event: React.ChangeEvent<HTMLInputElement>): void => handleDateChange(rowIndex, event.target.value)}
                        aria-label={`${row.round}${KO.optionInboundSplitRoundSuffix} ${KO.thInboundSplitInboundDate}`}
                      />
                    </td>
                    <td className={`${styles.inboundSplitKindCell} ${styles.inboundSplitStickyCol} ${styles.inboundSplitStickyColKind}`}>{KO.rowInboundSplitSuggestedQty}</td>
                    <td className={`${styles.num} ${styles.inboundSplitTotalCell} ${styles.inboundSplitStickyCol} ${styles.inboundSplitStickyColTotal}`}>{formatGroupedNumber(suggestedTotalQty)}</td>
                    {columns.map((column: InboundSplitSizeColumn): React.JSX.Element => (
                      <td key={column.size} className={styles.num}>{formatGroupedNumber(row.suggestedQuantitiesBySize[column.size] ?? 0)}</td>
                    ))}
                  </tr>
                  <tr className={`${styles.inboundSplitConfirmedRow} ${styles.inboundSplitRoundEndRow}`}>
                    <td className={`${styles.inboundSplitKindCell} ${styles.inboundSplitStickyCol} ${styles.inboundSplitStickyColKind}`}>{KO.rowInboundSplitConfirmedQty}</td>
                    <td className={`${styles.num} ${styles.inboundSplitTotalCell} ${styles.inboundSplitStickyCol} ${styles.inboundSplitStickyColTotal} ${totalDiffClass}`}>
                      <input
                        type="number"
                        className={`${styles.stockNumberInput} ${styles.inboundSplitQtyInput} ${totalDiffClass}`}
                        min={0}
                        step={1}
                        value={confirmedTotalQty}
                        onChange={(event: React.ChangeEvent<HTMLInputElement>): void => handleRowTotalChange(rowIndex, event.target.value)}
                        aria-label={`${row.round}${KO.optionInboundSplitRoundSuffix} ${KO.thInboundSplitTotalQty} ${KO.rowInboundSplitConfirmedQty}`}
                      />
                    </td>
                    {columns.map((column: InboundSplitSizeColumn): React.JSX.Element => {
                      const confirmedQty: number = row.quantitiesBySize[column.size] ?? 0
                      const suggestedQty: number = row.suggestedQuantitiesBySize[column.size] ?? 0
                      const sizeDiffClass: string = diffClass(confirmedQty, suggestedQty)
                      return (
                      <td key={column.size} className={`${styles.num} ${sizeDiffClass}`}>
                        <input
                          type="number"
                          className={`${styles.stockNumberInput} ${styles.inboundSplitQtyInput} ${sizeDiffClass}`}
                          min={0}
                          step={1}
                          value={confirmedQty}
                          onChange={(event: React.ChangeEvent<HTMLInputElement>): void => handleQtyChange(rowIndex, column.size, event.target.value)}
                          aria-label={`${row.round}${KO.optionInboundSplitRoundSuffix} ${column.size} ${KO.rowInboundSplitConfirmedQty}`}
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
          </div>
        </div>
        <footer className={styles.inboundSplitDialogActions}>
          <button type="button" className={`${styles.btn} ${styles.btnSecondary}`} onClick={onClose}>{KO.btnCloseInboundSplitDialog}</button>
          <button type="button" className={styles.btn} onClick={(): void => onApply(cloneInboundSplitRows(rows))}>{KO.btnApplyInboundSplitSchedule}</button>
        </footer>
      </section>
    </div>
  )
}
