import { useId, useRef } from 'react'
import { DialogCloseButton } from '../../../../../components/DialogCloseButton'
import { useModalFocusTrap } from '../../../useModalFocusTrap'
import type { ApiUnitErrorInfo } from '../../../../../types'
import { formatGroupedNumber } from '../../../../../utils/format'
import { daysBetweenIsoDates } from '../../../../../utils/date'
import { KO } from '../../ko'
import styles from '../secondaryDrawer.module.css'
import { cloneInboundSplitRows, type InboundSplitScheduleRow, type InboundSplitSizeColumn } from './inboundSplitScheduleModel'
import type { InboundSplitDraftRequest } from './inboundSplitScheduleTypes'
import { InboundSplitScheduleTable } from './InboundSplitScheduleTable'
import { useInboundSplitScheduleDraft, type UseInboundSplitScheduleDraftResult } from './useInboundSplitScheduleDraft'

export type { InboundSplitDraftRequest } from './inboundSplitScheduleTypes'

function hasInvalidInboundDateOrder(workDate: string, rows: readonly InboundSplitScheduleRow[]): boolean {
  return rows.some((row: InboundSplitScheduleRow, index: number): boolean => {
    const previousInboundDate: string = index === 0 ? workDate : (rows[index - 1]?.inboundDate ?? workDate)
    const days: number | null = daysBetweenIsoDates(previousInboundDate, row.inboundDate)
    return days != null && days <= 0
  })
}

export interface InboundSplitScheduleDialogProps {
  open: boolean
  workDate: string
  initialCount: number
  initialRows: InboundSplitScheduleRow[]
  columns: InboundSplitSizeColumn[]
  buildRowsForCount: (next: number) => InboundSplitScheduleRow[]
  recalculateRows: (rows: InboundSplitScheduleRow[]) => InboundSplitScheduleRow[]
  draftError?: ApiUnitErrorInfo | null
  onDraftError?: (err: unknown | null, request: InboundSplitDraftRequest) => void
  onApply: (rows: InboundSplitScheduleRow[]) => void
  onClose: () => void
}

export function InboundSplitScheduleDialog({
  open,
  workDate,
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
  const handleKeyDown: (event: React.KeyboardEvent<HTMLElement>) => void = useModalFocusTrap({
    panelRef,
    active: open,
    onClose,
  })
  const draft: UseInboundSplitScheduleDraftResult = useInboundSplitScheduleDraft({
    initialCount,
    initialRows,
    columns,
    buildRowsForCount,
    recalculateRows,
    onDraftError,
  })
  const confirmedSourceTotal: number = columns.reduce((sum: number, column: InboundSplitSizeColumn): number => sum + column.confirmedQty, 0)
  const hasInvalidDateOrder: boolean = hasInvalidInboundDateOrder(workDate, draft.rows)
  const applyDisabled: boolean = draftError != null || draft.rows.length === 0 || hasInvalidDateOrder
  const dateOrderErrorMessage: string = hasInvalidDateOrder
    ? `${KO.labelInboundSplitDateInterval}이 0일 이하입니다. 이전 차수보다 빠르거나 같은 입고일은 사용할 수 없습니다.`
    : ''

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
          <div className={styles.inboundSplitCountPanel}>
            <label className={styles.inboundSplitCountLabel}>
              <span>{KO.labelInboundSplitCount}</span>
              <select
                className={styles.inboundSplitCountSelect}
                value={draft.count}
                onChange={(event: React.ChangeEvent<HTMLSelectElement>): void => draft.changeCount(event.target.value)}
                aria-label={KO.ariaInboundSplitCount}
              >
                {draft.countOptions.map((option: number): React.JSX.Element => (
                  <option key={option} value={option}>{option}{KO.optionInboundSplitRoundSuffix}</option>
                ))}
              </select>
            </label>
            {hasInvalidDateOrder && <span className={styles.inboundSplitCountValidation}>{dateOrderErrorMessage}</span>}
          </div>
          <span className={styles.inboundSplitSummary}>
            {KO.thTotal} {formatGroupedNumber(confirmedSourceTotal)} EA
          </span>
        </div>
        {draftError && (
          <p className={styles.inboundSplitError} role="alert">
            {draftError.error}
          </p>
        )}
        <div className={styles.inboundSplitTableFrame}>
          <div className={styles.inboundSplitTableWrap}>
            <InboundSplitScheduleTable
              workDate={workDate}
              rows={draft.rows}
              columns={columns}
              suggestedSizeTotals={draft.suggestedSizeTotals}
              confirmedSizeTotals={draft.confirmedSizeTotals}
              suggestedGrandTotal={draft.suggestedGrandTotal}
              confirmedGrandTotal={draft.confirmedGrandTotal}
              onDateChange={draft.changeDate}
              onRowTotalChange={draft.changeRowTotal}
              onQtyChange={draft.changeQty}
            />
          </div>
        </div>
        <footer className={styles.inboundSplitDialogActions}>
          <button type="button" className={`${styles.btn} ${styles.btnSecondary}`} onClick={onClose}>{KO.btnCloseInboundSplitDialog}</button>
          <button type="button" className={styles.btn} onClick={(): void => onApply(cloneInboundSplitRows(draft.rows))} disabled={applyDisabled}>{KO.btnApplyInboundSplitSchedule}</button>
        </footer>
      </section>
    </div>
  )
}
