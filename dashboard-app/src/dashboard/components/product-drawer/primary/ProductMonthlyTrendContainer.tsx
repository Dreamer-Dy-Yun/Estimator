import { formatGroupedNumber } from '../../../../utils/format'
import styles from '../../common.module.css'
import { SalesTrendChart } from '../../trend/SalesTrendChart'
import { ApiUnitErrorBadge } from '../../../../components/ApiUnitErrorBadge'
import {
  useProductMonthlyTrendModel,
  type ProductMonthlyTrendModelArgs,
} from './useProductMonthlyTrendModel'

export function ProductMonthlyTrendContainer(props: ProductMonthlyTrendModelArgs) {
  const {
    forecastMonthsLabelId,
    forecastComboRef,
    forecastComboOpen,
    monthlyTrendError,
    salesTrendVisible,
    competitorTrendLabel,
    trendWindowData,
    salesTrendChartDense,
    salesTrendYMax,
    shiftedPeriodShade,
    shiftedForecastShade,
    onChartWheel,
    onChartMouseEnter,
    onChartMouseLeave,
    toggleForecastCombo,
    selectForecastMonths,
    toggleSalesTrendSeries,
  } = useProductMonthlyTrendModel(props)
  const { forecastMonths } = props

  return (
    <div className={`${styles.card} ${styles.drawerSalesTrendCard}`}>
      <div className={styles.salesTrendTitleRow}>
        <div className={styles.cardTitle}>
          판매추이(월간)
          <ApiUnitErrorBadge error={monthlyTrendError} />
        </div>
        <div className={styles.salesTrendControls}>
          <div className={styles.forecastMonthsControl}>
            <span className={styles.forecastMonthsLabel} id={forecastMonthsLabelId}>
              예측 개월
            </span>
            <div className={styles.forecastComboWrap} ref={forecastComboRef}>
              <button
                type="button"
                className={styles.forecastComboTrigger}
                aria-haspopup="listbox"
                aria-expanded={forecastComboOpen}
                aria-labelledby={forecastMonthsLabelId}
                aria-label={`판매추이 포캐스트 개월 수, 현재 ${forecastMonths}`}
                onClick={toggleForecastCombo}
              >
                {forecastMonths}
              </button>
              {forecastComboOpen && (
                <ul
                  className={styles.forecastComboList}
                  role="listbox"
                  aria-labelledby={forecastMonthsLabelId}
                  onWheel={(event) => event.stopPropagation()}
                >
                  {Array.from({ length: 24 }, (_, i) => i + 1).map((n) => (
                    <li key={n} role="presentation">
                      <button
                        type="button"
                        role="option"
                        aria-selected={n === forecastMonths}
                        className={
                          n === forecastMonths
                            ? `${styles.forecastComboOption} ${styles.forecastComboOptionSelected}`
                            : styles.forecastComboOption
                        }
                        onClick={() => selectForecastMonths(n)}
                      >
                        {n}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
          <div className={styles.trendSeriesToggle} aria-label="판매추이 표시 항목">
            <button
              type="button"
              aria-pressed={salesTrendVisible.self}
              className={
                salesTrendVisible.self
                  ? `${styles.trendSeriesButton} ${styles.trendSeriesButtonSelected} ${styles.trendSeriesButtonSelfSelected}`
                  : styles.trendSeriesButton
              }
              onClick={() => toggleSalesTrendSeries('self')}
            >
              자사
            </button>
            <button
              type="button"
              aria-pressed={salesTrendVisible.competitor}
              className={
                salesTrendVisible.competitor
                  ? `${styles.trendSeriesButton} ${styles.trendSeriesButtonSelected} ${styles.trendSeriesButtonCompetitorSelected}`
                  : styles.trendSeriesButton
              }
              onClick={() => toggleSalesTrendSeries('competitor')}
            >
              {competitorTrendLabel}
            </button>
          </div>
        </div>
      </div>
      <div
        onMouseEnter={onChartMouseEnter}
        onMouseLeave={onChartMouseLeave}
        onWheel={onChartWheel}
      >
        <div className={styles.chartClipWrap}>
          <SalesTrendChart
            data={trendWindowData}
            height={salesTrendChartDense ? 232 : 210}
            yMax={salesTrendYMax}
            allowEscapeViewBox={{ x: false, y: false }}
            periodShade={shiftedPeriodShade}
            forecastShade={shiftedForecastShade}
            minTickGap={salesTrendChartDense ? 0 : 8}
            interval={salesTrendChartDense ? 0 : 'preserveStartEnd'}
            tickAngle={salesTrendChartDense ? -38 : 0}
            tickHeight={salesTrendChartDense ? 42 : undefined}
            lines={[
              ...(salesTrendVisible.self
                ? [
                    { dataKey: 'actual', stroke: '#2563eb' },
                    { dataKey: 'forecastLink', stroke: '#2563eb', strokeDasharray: '4 4' },
                  ]
                : []),
              ...(salesTrendVisible.competitor
                ? [{ dataKey: 'competitorActual', stroke: '#e11d48' }]
                : []),
            ]}
            tooltipValueFormatter={(value, name) => {
              if (name === 'actual') return [formatGroupedNumber(value), '판매 실적']
              if (name === 'competitorActual') return [formatGroupedNumber(value), `${competitorTrendLabel} 판매`]
              if (name === 'forecastLink') return [formatGroupedNumber(value), '판매 예측']
              return [formatGroupedNumber(value), name]
            }}
            tooltipLabelFormatter={(row) => String(row.date ?? '')}
            tickFormatter={(row) => String(row.date ?? '')}
          />
        </div>
      </div>
    </div>
  )
}
