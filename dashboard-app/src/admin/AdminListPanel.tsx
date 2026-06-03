import { LoadingSpinner } from '../components/LoadingSpinner'
import styles from './AdminPage.module.css'

export interface AdminListPanelProps {
  title: string
  countLabel: string
  headerClassName: string
  columns: string[]
  loadingLabel: string
  isLoading: boolean
  errorMessage: string | null
  actions?: React.ReactNode
  children: React.ReactNode
}

export function AdminListPanel({
  title,
  countLabel,
  headerClassName,
  columns,
  loadingLabel,
  isLoading,
  errorMessage,
  actions,
  children,
}: AdminListPanelProps) : React.JSX.Element {
  return (
    <div className={styles.panel}>
      <div className={styles.panelHeader}>
        <div>
          <h2>{title}</h2>
          <p>{countLabel}</p>
        </div>
        {actions ? <div className={styles.panelHeaderActions}>{actions}</div> : null}
      </div>

      <div className={headerClassName} aria-hidden="true">
        {columns.map((column: string, index: number) : React.JSX.Element => (
          <span key={`${column}-${index}`}>{column}</span>
        ))}
      </div>

      {isLoading ? (
        <div className={styles.emptyState}>
          <LoadingSpinner label={loadingLabel} />
        </div>
      ) : null}
      {errorMessage ? <div className={styles.errorState}>{errorMessage}</div> : null}
      {!isLoading && !errorMessage ? <div className={styles.adminListBody}>{children}</div> : null}
    </div>
  )
}
