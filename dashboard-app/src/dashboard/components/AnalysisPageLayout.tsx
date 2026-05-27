import type { ReactNode } from 'react'
import { FilterBar } from './FilterBar'
import { AnalysisListRequestFrame } from './AnalysisListRequestFrame'
import { AnalysisPeriodTools } from './AnalysisPeriodTools'
import styles from './common.module.css'
import type { FilterField } from '../model/filterField'

export type AnalysisPeriodFrameProps = {
  filterFields: FilterField[]
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
  endControl: ReactNode
  setPresetMonths: (months: number) => void
  setWholeRange: () => void
  onTogglePeriodBar: () => void
  onPeriodBarStart: (value: number) => void
  onPeriodBarEnd: (value: number) => void
}

export function AnalysisPageLayout(props: AnalysisPeriodFrameProps) {
  const {
    filterFields,
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
    endControl,
    setPresetMonths,
    setWholeRange,
    onTogglePeriodBar,
    onPeriodBarStart,
    onPeriodBarEnd,
  } = props

  return (
    <>
      <FilterBar
        title=""
        filterClassName={styles.filterAnalysisGrid}
        fields={filterFields}
        extraContent={(
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
            endControl={endControl}
          />
        )}
      />
      <div className={`${styles.twoCol} ${styles.selfTwoCol}`}>
        <div className={`${styles.leftCol} ${styles.selfLeftCol}`}>{leftPanel}</div>
        <AnalysisListRequestFrame initialLoading={initialLoading} refreshing={refreshing} initialLabel={initialLabel} refreshLabel={refreshLabel}>{listPanel}</AnalysisListRequestFrame>
      </div>
    </>
  )
}
