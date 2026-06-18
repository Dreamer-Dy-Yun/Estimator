import { useId, useRef } from 'react'
import { DialogCloseButton } from '../../../../../components/DialogCloseButton'
import { useModalFocusTrap } from '../../../useModalFocusTrap'
import type { ApiUnitErrorInfo } from '../../../../../types'
import { formatGroupedNumber } from '../../../../../utils/format'
import { KO } from '../../ko'
import styles from '../secondaryDrawer.module.css'
import { cloneInboundSplitRows, type InboundSplitScheduleRow, type InboundSplitSizeColumn } from './inboundSplitScheduleModel'
import { findInboundSplitDatePolicyIssue } from './inboundSplitScheduleDatePolicy'
import type { InboundSplitDraftRequest } from './inboundSplitScheduleTypes'
import { InboundSplitScheduleTable } from './InboundSplitScheduleTable'
import { useInboundSplitScheduleDraft, type UseInboundSplitScheduleDraftResult } from './useInboundSplitScheduleDraft'

export type { InboundSplitDraftRequest } from './inboundSplitScheduleTypes'

export interface InboundSplitScheduleDialogProps {
  open: boolean
  currentOrderInboundDueDate: string
  nextOrderInboundDueDate: string
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
  currentOrderInboundDueDate,
  nextOrderInboundDueDate,
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
  const currentConfirmedTotal: number = columns.reduce((sum: number, column: InboundSplitSizeColumn): number => sum + column.confirmedQty, 0)
  const hasInvalidDatePolicy: boolean = findInboundSplitDatePolicyIssue(currentOrderInboundDueDate, nextOrderInboundDueDate, draft.rows) != null
  const applyDisabled: boolean = draftError != null || draft.rows.length === 0 || hasInvalidDatePolicy
  const dateOrderErrorMessage: string = hasInvalidDatePolicy
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
            {hasInvalidDatePolicy && <span className={styles.inboundSplitCountValidation}>{dateOrderErrorMessage}</span>}
          </div>
          <span className={styles.inboundSplitSummary}>
            {KO.thTotal} {formatGroupedNumber(currentConfirmedTotal)} EA
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
              currentOrderInboundDueDate={currentOrderInboundDueDate}
              nextOrderInboundDueDate={nextOrderInboundDueDate}
              rows={draft.rows}
              columns={columns}
              onDateChange={draft.changeDate}
              onIgnoreExistingOrderInboundChange={draft.changeIgnoreExistingOrderInbound}
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
