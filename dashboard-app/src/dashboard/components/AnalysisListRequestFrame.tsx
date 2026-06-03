import { LoadingSpinner } from '../../components/LoadingSpinner'
import styles from './common.module.css'

export type AnalysisListRequestFrameProps = {
  children: React.ReactNode
  initialLoading: boolean
  refreshing: boolean
  initialLabel: string
  refreshLabel: string
}

export function AnalysisListRequestFrame({
  children,
  initialLoading,
  refreshing,
  initialLabel,
  refreshLabel,
}: AnalysisListRequestFrameProps) : React.JSX.Element {
  if (initialLoading) {
    return (
      <div className={styles.analysisListLoading}>
        <LoadingSpinner label={initialLabel} />
      </div>
    )
  }

  return (
    <div className={styles.analysisListRequestFrame} aria-busy={refreshing || undefined}>
      {refreshing ? (
        <div className={styles.analysisListRefreshStatus}>
          <LoadingSpinner size="inline" label={refreshLabel} />
        </div>
      ) : null}
      {children}
    </div>
  )
}
