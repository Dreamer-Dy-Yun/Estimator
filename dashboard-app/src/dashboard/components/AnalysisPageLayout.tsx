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
  listHeaderContent?: ReactNode
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
    listHeaderContent,
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
        <section className={`${styles.card} ${styles.analysisControlCard}`} aria-label="조회 조건">
          <div className={styles.analysisControlHeader}>
            <div className={styles.analysisControlTitle}>조회 조건</div>
          </div>
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
          />
        </section>
        <section className={`${styles.card} ${styles.analysisControlCard}`} aria-label="목록 필터">
          <div className={styles.analysisControlHeader}>
            <div className={styles.analysisControlTitle}>목록 필터</div>
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
          </div>
          <FilterFieldGrid fields={listFilterFields} filterClassName={styles.filterAnalysisGrid} />
        </section>
      </div>
      <div className={`${styles.twoCol} ${styles.selfTwoCol}`}>
        <div className={`${styles.leftCol} ${styles.selfLeftCol}`}>{leftPanel}</div>
        <div className={styles.analysisListColumn}>
          {listHeaderContent ? (
            <div className={styles.analysisListHeader}>
              <div className={styles.analysisListHeaderActions}>{listHeaderContent}</div>
            </div>
          ) : null}
          <AnalysisListRequestFrame initialLoading={initialLoading} refreshing={refreshing} initialLabel={initialLabel} refreshLabel={refreshLabel}>{listPanel}</AnalysisListRequestFrame>
        </div>
      </div>
    </>
  )
}
