import type { ReactNode } from 'react'
import { FilterFieldGrid } from './FilterBar'
import { AnalysisListRequestFrame } from './AnalysisListRequestFrame'
import { AnalysisPeriodTools } from './AnalysisPeriodTools'
import styles from './common.module.css'
import type { FilterField } from '../model/filterField'

export type AnalysisPeriodFrameProps = {
  queryFields: FilterField[]
  listFilterFields: FilterField[]
  listFilterResetDisabled: boolean
  historicalMonths: string[]
  showPeriodBar: boolean
  periodStartIdx: number
  periodEndIdx: number
  startPct: number
  endPct: number
  initialLoading: boolean
  refreshing: boolean
  initialLabel: string
  refreshLabel: string
  leftPanel: ReactNode
  listPanel: ReactNode
  queryEndControl: ReactNode
  listFilterEndContent?: ReactNode
  listActionContent?: ReactNode
  hidePeriodPresetButtons?: boolean
  setPresetMonths: (months: number) => void
  setWholeRange: () => void
  onResetListFilters: () => void
  onTogglePeriodBar: () => void
  onPeriodBarStart: (value: number) => void
  onPeriodBarEnd: (value: number) => void
}

export function AnalysisPageLayout(props: AnalysisPeriodFrameProps) {
  const {
    queryFields,
    listFilterFields,
    listFilterResetDisabled,
    historicalMonths,
    showPeriodBar,
    periodStartIdx,
    periodEndIdx,
    startPct,
    endPct,
    initialLoading,
    refreshing,
    initialLabel,
    refreshLabel,
    leftPanel,
    listPanel,
    queryEndControl,
    listFilterEndContent,
    listActionContent,
    hidePeriodPresetButtons,
    setPresetMonths,
    setWholeRange,
    onResetListFilters,
    onTogglePeriodBar,
    onPeriodBarStart,
    onPeriodBarEnd,
  } = props

  return (
    <>
      <div className={styles.analysisControlsGrid}>
        <section className={`${styles.card} ${styles.analysisControlCard} ${styles.analysisQueryControlCard}`} aria-label="조회 조건">
          <FilterFieldGrid fields={queryFields} filterClassName={styles.filterAnalysisQueryGrid} />
          <AnalysisPeriodTools
            showPeriodBar={showPeriodBar}
            historicalMonths={historicalMonths}
            periodStartIdx={periodStartIdx}
            periodEndIdx={periodEndIdx}
            startPct={startPct}
            endPct={endPct}
            setPresetMonths={setPresetMonths}
            setWholeRange={setWholeRange}
            onTogglePeriodBar={onTogglePeriodBar}
            onPeriodBarStart={onPeriodBarStart}
            onPeriodBarEnd={onPeriodBarEnd}
            endControl={queryEndControl}
            hidePresetButtons={hidePeriodPresetButtons}
          />
        </section>
        <section className={`${styles.card} ${styles.analysisControlCard} ${styles.analysisListFilterCard}`} aria-label="목록 필터">
          <div className={styles.analysisControlActions}>
            {listFilterEndContent}
            <button
              type="button"
              className={styles.analysisFilterResetButton}
              onClick={onResetListFilters}
              disabled={listFilterResetDisabled}
            >
              필터 초기화
            </button>
          </div>
          <FilterFieldGrid fields={listFilterFields} filterClassName={styles.filterAnalysisGrid} />
        </section>
        {listActionContent ? (
          <section className={`${styles.card} ${styles.analysisListActionCard}`} aria-label="목록 액션">
            <div className={styles.analysisControlActions}>{listActionContent}</div>
          </section>
        ) : null}
      </div>
      <div className={`${styles.twoCol} ${styles.selfTwoCol}`}>
        <div className={`${styles.leftCol} ${styles.selfLeftCol}`}>{leftPanel}</div>
        <div className={styles.analysisListColumn}>
          <AnalysisListRequestFrame initialLoading={initialLoading} refreshing={refreshing} initialLabel={initialLabel} refreshLabel={refreshLabel}>{listPanel}</AnalysisListRequestFrame>
        </div>
      </div>
    </>
  )
}
