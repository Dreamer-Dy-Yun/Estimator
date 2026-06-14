import type * as React from 'react'
import { KO } from '../../ko'
import styles from '../secondaryDrawer.module.css'

export type SizeOrderWeightControlsProps = {
  selfCompanyLabel: string
  comparisonLabel: string
  selfWeightPct: number
  comparisonWeightPct: number
  onSelfWeightInputChange: (rawValue: string) => void
  onComparisonWeightRangeChange: (rawValue: string) => void
  onComparisonWeightInputChange: (rawValue: string) => void
}

export function SizeOrderWeightControls({
  selfCompanyLabel,
  comparisonLabel,
  selfWeightPct,
  comparisonWeightPct,
  onSelfWeightInputChange,
  onComparisonWeightRangeChange,
  onComparisonWeightInputChange,
}: SizeOrderWeightControlsProps): React.JSX.Element {
  const selfWeightLabel: string = `${selfCompanyLabel} ${KO.comparisonWeightApprox}`
  const comparisonWeightLabel: string = `${comparisonLabel} ${KO.comparisonWeightApprox}`

  return (
    <div className={styles.sliderRow}>
      <div className={styles.sliderSelfGroup}>
        <span className={styles.sliderRowLabel}>{selfWeightLabel}</span>
        <div className={styles.sliderPctBox}>
          <input
            type="number"
            className={styles.sliderPctInput}
            min={0}
            max={100}
            step={0.01}
            value={selfWeightPct}
            onChange={(event: React.ChangeEvent<HTMLInputElement, HTMLInputElement>): void => onSelfWeightInputChange(event.target.value)}
            aria-label={selfWeightLabel}
          />
          <span className={styles.sliderPctSuffix}>%</span>
        </div>
      </div>
      <input
        type="range"
        className={`${styles.sliderRowRange} ${styles.sliderWeightRange}`}
        min={0}
        max={100}
        step={0.01}
        value={comparisonWeightPct}
        onChange={(event: React.ChangeEvent<HTMLInputElement, HTMLInputElement>): void => onComparisonWeightRangeChange(event.target.value)}
        aria-label={`${selfCompanyLabel} 대 ${comparisonLabel} ${KO.comparisonWeightApprox}`}
      />
      <div className={styles.sliderCompGroup}>
        <div className={styles.sliderPctBox}>
          <input
            type="number"
            className={styles.sliderPctInput}
            min={0}
            max={100}
            step={0.01}
            value={comparisonWeightPct}
            onChange={(event: React.ChangeEvent<HTMLInputElement, HTMLInputElement>): void => onComparisonWeightInputChange(event.target.value)}
            aria-label={comparisonWeightLabel}
          />
          <span className={styles.sliderPctSuffix}>%</span>
        </div>
        <span className={styles.sliderRowLabel} title={comparisonWeightLabel}>
          {comparisonWeightLabel}
        </span>
      </div>
    </div>
  )
}
