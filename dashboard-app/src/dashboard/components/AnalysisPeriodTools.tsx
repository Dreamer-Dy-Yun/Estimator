import type { ReactNode } from 'react'
import styles from './common.module.css'

type AnalysisPeriodToolsProps = {
  showPeriodBar: boolean
  historicalMonths: string[]
  periodStartIdx: number
  periodEndIdx: number
  startPct: number
  endPct: number
  setPresetMonths: (months: number) => void
  setWholeRange: () => void
  onTogglePeriodBar: () => void
  onPeriodBarStart: (value: number) => void
  onPeriodBarEnd: (value: number) => void
  endControl?: ReactNode
}

export function AnalysisPeriodTools({
  showPeriodBar,
  historicalMonths,
  periodStartIdx,
  periodEndIdx,
  startPct,
  endPct,
  setPresetMonths,
  setWholeRange,
  onTogglePeriodBar,
  onPeriodBarStart,
  onPeriodBarEnd,
  endControl,
}: AnalysisPeriodToolsProps) {
  return (
    <div className={styles.periodTools}>
      <div className={styles.periodPresetRow}>
        <button type="button" onClick={() => setPresetMonths(1)}>최근 1개월</button>
        <button type="button" onClick={() => setPresetMonths(3)}>최근 3개월</button>
        <button type="button" onClick={() => setPresetMonths(6)}>최근 6개월</button>
        <button type="button" onClick={() => setPresetMonths(12)}>최근 1년</button>
        <button type="button" onClick={setWholeRange}>전체</button>
        <button type="button" onClick={onTogglePeriodBar}>
          {showPeriodBar ? '기간 바 닫기' : '기간 바 열기'}
        </button>
        {endControl}
      </div>
      {showPeriodBar && historicalMonths.length > 1 && (
        <div className={styles.periodBarWrap}>
          <div className={styles.periodBarLabel}>
            <span>{historicalMonths[0]}</span>
            <span>{historicalMonths[historicalMonths.length - 1]}</span>
          </div>
          <div className={styles.periodDualRange}>
            <div className={styles.periodTrack} />
            <div
              className={styles.periodSelected}
              style={{ left: `${startPct}%`, width: `${Math.max(0, endPct - startPct)}%` }}
            />
            <input
              className={`${styles.periodRange} ${styles.periodRangeStart}`}
              type="range"
              min={0}
              max={historicalMonths.length - 1}
              value={periodStartIdx}
              onChange={(event) => onPeriodBarStart(Number(event.target.value))}
            />
            <input
              className={`${styles.periodRange} ${styles.periodRangeEnd}`}
              type="range"
              min={0}
              max={historicalMonths.length - 1}
              value={periodEndIdx}
              onChange={(event) => onPeriodBarEnd(Number(event.target.value))}
            />
          </div>
        </div>
      )}
    </div>
  )
}
