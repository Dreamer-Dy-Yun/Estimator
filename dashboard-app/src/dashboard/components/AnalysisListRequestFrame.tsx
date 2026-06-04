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
  const loading: boolean = initialLoading || refreshing
  const loadingLabel: string = initialLoading ? initialLabel : refreshLabel

  return (
    <div className={styles.analysisListRequestFrame} aria-busy={loading || undefined}>
      {initialLoading ? null : children}
      {loading ? (
        <div className={styles.analysisListLoadingOverlay}>
          <LoadingSpinner label={loadingLabel} />
        </div>
      ) : null}
    </div>
  )
}
