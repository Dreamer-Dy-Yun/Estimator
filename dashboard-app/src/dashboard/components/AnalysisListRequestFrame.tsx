import type { ReactNode } from 'react'
import { LoadingSpinner } from '../../components/LoadingSpinner'
import styles from './common.module.css'

type AnalysisListRequestFrameProps = {
  children: ReactNode
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
}: AnalysisListRequestFrameProps) {
  if (initialLoading) {
    return (
      <div className={styles.analysisListLoading}>
        <LoadingSpinner label={initialLabel} />
      </div>
    )
  }

  return (
    <div className={styles.analysisListRequestFrame} aria-busy={refreshing || undefined}>
      {children}
      {refreshing ? (
        <div className={styles.analysisListRefreshOverlay}>
          <LoadingSpinner label={refreshLabel} />
        </div>
      ) : null}
    </div>
  )
}
