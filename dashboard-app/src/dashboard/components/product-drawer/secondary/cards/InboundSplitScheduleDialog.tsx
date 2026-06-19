import { useId, useRef, useState } from 'react'
import { ApiUnitErrorBadge } from '../../../../../components/ApiUnitErrorBadge'
import { DialogCloseButton } from '../../../../../components/DialogCloseButton'
import { copyToClipboard } from '../../../../../utils/copyToClipboard'
import { PortalHelpMark } from '../../../PortalHelpPopover'
import type { usePortalHelpPopover } from '../../../usePortalHelpPopover'
import commonStyles from '../../../common.module.css'
import { useModalFocusTrap } from '../../../useModalFocusTrap'
import type { ApiUnitErrorInfo } from '../../../../../types'
import { KO } from '../../ko'
import type { SecondaryHelpId } from '../secondaryDrawerTypes'
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
  help?: {
    labelId: string
    portal: ReturnType<typeof usePortalHelpPopover<SecondaryHelpId>>
  }
  debugSourcePayload?: unknown
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
  const [debugCopyState, setDebugCopyState]: [string, React.Dispatch<React.SetStateAction<string>>] = useState<string>('')
  const handleKeyDown: (event: React.KeyboardEvent<HTMLElement>) => void = useModalFocusTrap({
    panelRef,
    active: open,
    onClose,
    initialFocusRef: countSelectRef,
  })
  const draft: UseInboundSplitScheduleDraftResult = useInboundSplitScheduleDraft({
    initialCount,
    initialRows,
    columns,
    buildRowsForCount,
    recalculateRows,
    onDraftError,
  })
  const hasInvalidDatePolicy: boolean = findInboundSplitDatePolicyIssue(currentOrderInboundDueDate, nextOrderInboundDueDate, draft.rows) != null
  const applyDisabled: boolean = draftError != null || draft.rows.length === 0 || hasInvalidDatePolicy
  const dateOrderErrorMessage: string = hasInvalidDatePolicy
    ? KO.msgInboundSplitInvalidDatePolicy
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
          <label className={styles.inboundSplitToolbarToggle}>
            <input
              type="checkbox"
              checked={draft.ignoreExistingOrderInboundAll}
              onChange={(event: React.ChangeEvent<HTMLInputElement>): void => draft.changeIgnoreExistingOrderInboundAll(event.target.checked)}
            />
            <span>{KO.labelInboundSplitIgnoreExistingOrderInbound}</span>
          </label>
        </div>
        {draftError && (
          <p className={styles.inboundSplitError} role="alert">
            <ApiUnitErrorBadge error={draftError} />
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
