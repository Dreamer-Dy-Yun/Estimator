import { LoadingSpinner } from '../components/LoadingSpinner'
import { DialogCloseButton } from '../components/DialogCloseButton'
import styles from './AdminPage.module.css'

export interface AdminCreateDialogShellProps {
  eyebrow: string
  title: string
  formId: string
  submitLabel: string
  submittingLabel: string
  isSubmitting: boolean
  errorMessage: string | null
  onClose: () => void
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void
  children: React.ReactNode
}

export function AdminCreateDialogShell({
  eyebrow,
  title,
  formId,
  submitLabel,
  submittingLabel,
  isSubmitting,
  errorMessage,
  onClose,
  onSubmit,
  children,
}: AdminCreateDialogShellProps) : React.JSX.Element {
  const handleClose: () => void = () : void => {
    if (!isSubmitting) onClose()
  }

  return (
    <div className={styles.gptKeyDialogBackdrop} role="presentation" onMouseDown={handleClose}>
      <section
        className={styles.gptKeyDialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${formId}-title`}
        onMouseDown={(event: React.MouseEvent<HTMLElement, MouseEvent>) : void => event.stopPropagation()}
      >
        <header className={styles.gptKeyDialogHeader}>
          <div>
            <span>{eyebrow}</span>
            <h3 id={`${formId}-title`}>{title}</h3>
          </div>
          <DialogCloseButton className={styles.gptKeyDialogCloseButton} disabled={isSubmitting} onClose={handleClose} />
        </header>

        <form id={formId} className={styles.gptKeyDialogForm} onSubmit={onSubmit}>
          {children}
        </form>

        {errorMessage ? <p className={styles.rowError}>{errorMessage}</p> : null}

        <div className={styles.gptKeyDialogActions}>
          <button className={styles.secondaryButton} type="button" onClick={handleClose} disabled={isSubmitting}>
            닫기
          </button>
          <button className={styles.createButton} type="submit" form={formId} disabled={isSubmitting}>
            {isSubmitting ? <LoadingSpinner size="inline" label={submittingLabel} /> : submitLabel}
          </button>
        </div>
      </section>
    </div>
  )
}
