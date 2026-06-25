import { useCallback, useId, useRef, useState } from 'react'
import { ApiUnitErrorBadge } from '../../../../../components/ApiUnitErrorBadge'
import { DialogCloseButton } from '../../../../../components/DialogCloseButton'
import { copyToClipboard } from '../../../../../utils/copyToClipboard'
import { PortalHelpMark } from '../../../PortalHelpPopover'
import commonStyles from '../../../common.module.css'
import { useModalFocusTrap } from '../../../useModalFocusTrap'
import { KO } from '../../ko'
import styles from '../secondaryDrawer.module.css'
import { cloneInboundSplitRows, type InboundSplitScheduleRow } from './inboundSplitScheduleModel'
import { findInboundSplitDatePolicyIssue } from './inboundSplitScheduleDatePolicy'
import { InboundSplitScheduleTableV0 } from './InboundSplitScheduleTableV0'
import type { InboundSplitScheduleDialogProps } from './inboundSplitScheduleVariantTypes'
import { useInboundSplitScheduleDraft, type UseInboundSplitScheduleDraftResult } from './useInboundSplitScheduleDraft'

export function InboundSplitScheduleDialogV0({
  open,
  currentOrderInboundDueDate,
  nextOrderInboundDueDate,
  initialCount,
  initialRows = [],
  columns,
  buildRowsForCount,
  recalculateRows,
  draftError = null,
  help,
  debugSourcePayload,
  onDraftError,
  onApply,
  onClose,
}: InboundSplitScheduleDialogProps): React.JSX.Element | null {
  const titleId: string = useId()
  const panelRef: React.RefObject<HTMLElement | null> = useRef<HTMLElement | null>(null)
  const countSelectRef: React.RefObject<HTMLSelectElement | null> = useRef<HTMLSelectElement | null>(null)
  const [debugCopyState, setDebugCopyState]: [string, React.Dispatch<React.SetStateAction<string>>] = useState<string>('')
  const handleKeyDown: (event: React.KeyboardEvent<HTMLElement>) => void = useModalFocusTrap({
    panelRef,
    active: open,
    onClose,
    initialFocusRef: countSelectRef,
  })
  const validateDraftRows: (rows: readonly InboundSplitScheduleRow[]) => string | null = useCallback((rows: readonly InboundSplitScheduleRow[]): string | null => (
    findInboundSplitDatePolicyIssue(currentOrderInboundDueDate, nextOrderInboundDueDate, rows) == null
      ? null
      : KO.msgInboundSplitInvalidDatePolicy
  ), [currentOrderInboundDueDate, nextOrderInboundDueDate])
  const draft: UseInboundSplitScheduleDraftResult = useInboundSplitScheduleDraft({
    initialCount,
    initialRows,
    columns,
    buildRowsForCount,
    recalculateRows,
    validateRows: validateDraftRows,
    onDraftError,
  })
  const hasInvalidDatePolicy: boolean = findInboundSplitDatePolicyIssue(currentOrderInboundDueDate, nextOrderInboundDueDate, draft.rows) != null
  const applyDisabled: boolean = draftError != null || draft.rows.length === 0 || hasInvalidDatePolicy || !draft.datesLocked
  const dateWarningMessage: string = draftError == null
    ? (draft.draftWarning ?? (hasInvalidDatePolicy ? KO.msgInboundSplitInvalidDatePolicy : ''))
    : ''
  const handleCopyDebugSourcePayload: () => Promise<void> = async (): Promise<void> => {
    const debugText: string = JSON.stringify(debugSourcePayload ?? null, null, 2) ?? 'null'
    const copied: boolean = await copyToClipboard(debugText)
    setDebugCopyState(copied ? KO.msgInboundSplitDebugSourceCopied : KO.msgInboundSplitDebugSourceCopyFailed)
  }

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
            <div className={commonStyles.cardTitleWithHelp}>
              <h3 id={titleId} className={styles.inboundSplitDialogTitle}>{KO.dialogInboundSplitTitle}</h3>
              {help ? <PortalHelpMark helpId="inboundSplitSchedule" placement="below" labelId={help.labelId} markClassName={commonStyles.helpMark} help={help.portal} stopMouseDownPropagation /> : null}
            </div>
          </div>
          <div className={styles.inboundSplitDialogHeaderActions}>
            {debugSourcePayload != null ? (
              <button
                type="button"
                className={`${styles.btn} ${styles.btnSecondary} ${styles.inboundSplitDebugCopyButton}`}
                onClick={handleCopyDebugSourcePayload}
                title={debugCopyState}
              >
                {debugCopyState || KO.btnInboundSplitDebugCopySource}
              </button>
            ) : null}
            <DialogCloseButton onClose={onClose} />
          </div>
        </header>
        <div className={styles.inboundSplitDialogToolbar}>
          <div className={styles.inboundSplitCountPanel}>
            <label className={styles.inboundSplitCountLabel}>
              <span>{KO.labelInboundSplitCount}</span>
              <select
                ref={countSelectRef}
                className={styles.inboundSplitCountSelect}
                value={draft.count}
                disabled={draft.datesLocked}
                onChange={(event: React.ChangeEvent<HTMLSelectElement>): void => draft.changeCount(event.target.value)}
                aria-label={KO.ariaInboundSplitCount}
              >
                {draft.countOptions.map((option: number): React.JSX.Element => (
                  <option key={option} value={option}>{option}{KO.optionInboundSplitRoundSuffix}</option>
                ))}
              </select>
            </label>
            {(dateWarningMessage || draftError) && (
              <span className={styles.inboundSplitCountFeedback} role={draftError ? 'alert' : 'status'}>
                {dateWarningMessage && <span className={styles.inboundSplitCountWarning}>{dateWarningMessage}</span>}
                <ApiUnitErrorBadge error={draftError} />
              </span>
            )}
          </div>
          <div className={styles.inboundSplitToolbarActions}>
            <button
              type="button"
              className={`${styles.btn} ${styles.btnSecondary} ${styles.inboundSplitResetConfirmButton}`}
              onClick={draft.resetConfirmedToSuggested}
              disabled={!draft.datesLocked}
            >
              {KO.btnInboundSplitResetConfirmed}
            </button>
            <label className={styles.inboundSplitToolbarToggle}>
              <input
                type="checkbox"
                checked={draft.excludeSegmentExistingOrderInboundAll}
                onChange={(event: React.ChangeEvent<HTMLInputElement>): void => draft.changeExcludeSegmentExistingOrderInboundAll(event.target.checked)}
              />
              <span>{KO.labelInboundSplitExcludeSegmentExistingOrderInbound}</span>
            </label>
          </div>
        </div>
        <div className={styles.inboundSplitTableFrame}>
          <div className={styles.inboundSplitTableWrap}>
            <InboundSplitScheduleTableV0
              currentOrderInboundDueDate={currentOrderInboundDueDate}
              nextOrderInboundDueDate={nextOrderInboundDueDate}
              rows={draft.rows}
              columns={columns}
              datesLocked={draft.datesLocked}
              onDatesLockedToggle={draft.toggleDatesLocked}
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
