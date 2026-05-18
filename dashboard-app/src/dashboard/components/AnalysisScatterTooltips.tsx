import { formatGroupedNumber, formatPercent } from '../../utils/format'
import type { AnalysisScatterGridPoint } from '../model/analysisScatterGridPoint'
import styles from './common.module.css'

export type AnalysisScatterTooltipProps = {
  active?: boolean
  payload?: ReadonlyArray<{ payload?: AnalysisScatterGridPoint }>
}

export function renderSelfSalesScatterTooltip({ active, payload }: AnalysisScatterTooltipProps) {
  if (!active || !payload?.length) return null
  const point = payload[0]?.payload
  if (!point) return null

  return (
    <div className={styles.chartTooltip}>
      <div className={styles.chartTooltipTitle}>판매량 구간</div>
      <div className={styles.chartTooltipText}>
        영업이익률: {formatPercent(point.xStart)} ~ {formatPercent(point.xEnd)}
      </div>
      <div className={styles.chartTooltipText}>
        판매량: {formatGroupedNumber(point.yStart)} ~ {formatGroupedNumber(point.yEnd)}
      </div>
      <div className={`${styles.chartTooltipText} ${styles.chartTooltipCount}`}>건수: {formatGroupedNumber(point.count)} EA</div>
      {point.hasMoreSkuIds ? <div className={styles.chartTooltipText}>셀 제한으로 일부 상품만 표시</div> : null}
      <div className={styles.chartTooltipHint}>클릭 시 셀 내 상품만 표시</div>
    </div>
  )
}

export function createCompetitorSalesScatterTooltip(competitorAxisLabel: string) {
  return ({ active, payload }: AnalysisScatterTooltipProps) => {
    if (!active || !payload?.length) return null
    const point = payload[0]?.payload
    if (!point) return null

    return (
      <div className={styles.chartTooltip}>
        <div className={styles.chartTooltipTitle}>판매량 비교 구간</div>
        <div className={styles.chartTooltipText}>
          자사 판매량: {formatGroupedNumber(point.xStart)} ~ {formatGroupedNumber(point.xEnd)}
        </div>
        <div className={styles.chartTooltipText}>
          {competitorAxisLabel} 판매량: {formatGroupedNumber(point.yStart)} ~ {formatGroupedNumber(point.yEnd)}
        </div>
        <div className={`${styles.chartTooltipText} ${styles.chartTooltipCount}`}>건수: {formatGroupedNumber(point.count)} EA</div>
        {point.hasMoreSkuIds ? <div className={styles.chartTooltipText}>셀 제한으로 일부 상품만 표시</div> : null}
        <div className={styles.chartTooltipHint}>클릭 시 셀 내 상품만 표시</div>
      </div>
    )
  }
}
