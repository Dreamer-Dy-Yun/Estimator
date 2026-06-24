import { useCallback, useId, useMemo, useRef, useState } from 'react'
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
import { resolveSplitSourceWindowEndDate } from './inboundSplitSourceWindow'
import { InboundSplitScheduleTableV1 } from './InboundSplitScheduleTableV1'
import { InboundSplitSourceSummaryTableV1 } from './InboundSplitSourceSummaryTableV1'
import type { InboundSplitScheduleDialogProps } from './inboundSplitScheduleVariantTypes'
import { useInboundSplitScheduleDraft, type UseInboundSplitScheduleDraftResult } from './useInboundSplitScheduleDraft'

export function InboundSplitScheduleDialogV1({
  open,
  currentOrderInboundDueDate,
  nextOrderInboundDueDate,
  calculationBaseDate,
  initialCount,
  initialRows = [],
  columns,
  inboundSplitSource,
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
  const descriptionId: string = useId()
  const panelRef: React.RefObject<HTMLElement | null> = useRef<HTMLElement | null>(null)
  const countSelectRef: React.RefObject<HTMLSelectElement | null> = useRef<HTMLSelectElement | null>(null)
  const sourceTableScrollRef: React.RefObject<HTMLDivElement | null> = useRef<HTMLDivElement | null>(null)
  const scheduleTableScrollRef: React.RefObject<HTMLDivElement | null> = useRef<HTMLDivElement | null>(null)
  const syncingHorizontalScrollRef: React.RefObject<boolean> = useRef<boolean>(false)
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
  const splitSourceWindowEndDate: string = useMemo((): string => (
    resolveSplitSourceWindowEndDate(draft.rows, nextOrderInboundDueDate)
  ), [draft.rows, nextOrderInboundDueDate])
  const dateWarningMessage: string = draftError == null
    ? (draft.draftWarning ?? (hasInvalidDatePolicy ? KO.msgInboundSplitInvalidDatePolicy : ''))
    : ''
  const handleCopyDebugSourcePayload: () => Promise<void> = async (): Promise<void> => {
    const debugText: string = JSON.stringify(debugSourcePayload ?? null, null, 2) ?? 'null'
    const copied: boolean = await copyToClipboard(debugText)
    setDebugCopyState(copied ? KO.msgInboundSplitDebugSourceCopied : KO.msgInboundSplitDebugSourceCopyFailed)
  }
  const syncHorizontalScroll: (source: HTMLDivElement | null, target: HTMLDivElement | null) => void = useCallback((source: HTMLDivElement | null, target: HTMLDivElement | null): void => {
    if (source == null || target == null || syncingHorizontalScrollRef.current) return
    if (source.scrollLeft === target.scrollLeft) return
    syncingHorizontalScrollRef.current = true
    target.scrollLeft = source.scrollLeft
    window.requestAnimationFrame((): void => {
      syncingHorizontalScrollRef.current = false
    })
  }, [])
  const handleSourceTableScroll: () => void = useCallback((): void => {
    syncHorizontalScroll(sourceTableScrollRef.current, scheduleTableScrollRef.current)
  }, [syncHorizontalScroll])
  const handleScheduleTableScroll: () => void = useCallback((): void => {
    syncHorizontalScroll(scheduleTableScrollRef.current, sourceTableScrollRef.current)
  }, [syncHorizontalScroll])

  if (!open) return null

  return (
    <div className={styles.inboundSplitDialogBackdrop} role="presentation" onClick={onClose}>
      <section
        ref={panelRef}
        className={`${styles.inboundSplitDialog} ${styles.inboundSplitDialogV1}`}
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
            <div className={commonStyles.cardTitleWithHelp}>
              <h3 id={titleId} className={styles.inboundSplitDialogTitle}>{KO.dialogInboundSplitTitle}</h3>
              {help ? <PortalHelpMark helpId="inboundSplitSchedule" placement="below" labelId={help.labelId} markClassName={commonStyles.helpMark} help={help.portal} stopMouseDownPropagation /> : null}
            </div>
            <p id={descriptionId} className={styles.inboundSplitDialogHint}>{KO.msgInboundSplitDraftOnly}</p>
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
                checked={draft.ignoreExistingOrderInboundAll}
                onChange={(event: React.ChangeEvent<HTMLInputElement>): void => draft.changeIgnoreExistingOrderInboundAll(event.target.checked)}
              />
              <span>{KO.labelInboundSplitIgnoreExistingOrderInbound}</span>
            </label>
          </div>
        </div>
        <div className={styles.inboundSplitTableFrame}>
          {inboundSplitSource ? (
            <div ref={sourceTableScrollRef} className={styles.inboundSplitSourceSummaryViewport} onScroll={handleSourceTableScroll}>
              <InboundSplitSourceSummaryTableV1
                source={inboundSplitSource}
                columns={columns}
                calculationBaseDate={calculationBaseDate}
                currentOrderInboundDueDate={currentOrderInboundDueDate}
                nextOrderInboundDueDate={nextOrderInboundDueDate}
                splitSourceWindowEndDate={splitSourceWindowEndDate}
                excludeCurrentToNextExistingOrderInbound={draft.ignoreExistingOrderInboundAll && draft.rows.length > 1}
              />
            </div>
          ) : null}
          <div ref={scheduleTableScrollRef} className={styles.inboundSplitScheduleTableViewport} onScroll={handleScheduleTableScroll}>
            <InboundSplitScheduleTableV1
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
