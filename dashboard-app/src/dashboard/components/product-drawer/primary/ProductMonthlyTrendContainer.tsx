import { formatGroupedNumber } from '../../../../utils/format'
import { MAX_FORECAST_MONTHS } from '../../../../utils/forecastMonthsStorage'
import { ApiUnitErrorBadge } from '../../../../components/ApiUnitErrorBadge'
import styles from '../../common.module.css'
import { SalesTrendChart } from '../../trend/SalesTrendChart'
import {
  useProductMonthlyTrendModel,
  type ProductMonthlyTrendModelArgs,
} from './useProductMonthlyTrendModel'

type ProductMonthlyTrendContainerProps = ProductMonthlyTrendModelArgs & {
  selfCompanyLabel: string
}

export function ProductMonthlyTrendContainer({
  selfCompanyLabel,
  ...modelProps
}: ProductMonthlyTrendContainerProps) {
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
  } = useProductMonthlyTrendModel(modelProps)
  const { forecastMonths } = modelProps
  const seriesButtons = [
    {
      key: 'self' as const,
      label: selfCompanyLabel,
      selectedClassName: styles.trendSeriesButtonSelfSelected,
    },
    {
      key: 'competitor' as const,
      label: competitorTrendLabel,
      selectedClassName: styles.trendSeriesButtonCompetitorSelected,
    },
  ]
  const chartLines = [
    ...(salesTrendVisible.self
      ? [
          { dataKey: 'actual', stroke: '#2563eb' },
          { dataKey: 'forecastLink', stroke: '#2563eb', strokeDasharray: '4 4' },
        ]
      : []),
    ...(salesTrendVisible.competitor ? [{ dataKey: 'competitorActual', stroke: '#e11d48' }] : []),
  ]
  const tooltipNames: Record<string, string> = {
    actual: `${selfCompanyLabel} 실적`,
    competitorActual: `${competitorTrendLabel} 판매`,
    forecastLink: `${selfCompanyLabel} 예측`,
  }

  return (
    <div className={`${styles.card} ${styles.drawerSalesTrendCard}`}>
      <div className={styles.salesTrendTitleRow}>
        <div className={styles.cardTitle}>
          판매추이(월간)
          <ApiUnitErrorBadge error={monthlyTrendError} />
        </div>
        <div className={styles.salesTrendControls}>
          <div className={styles.forecastMonthsControl}>
            <span className={styles.forecastMonthsLabel} id={forecastMonthsLabelId}>예측 개월</span>
            <div className={styles.forecastComboWrap} ref={forecastComboRef}>
              <button
                type="button"
                className={styles.forecastComboTrigger}
                aria-haspopup="listbox"
                aria-expanded={forecastComboOpen}
                aria-labelledby={forecastMonthsLabelId}
                aria-label={`판매추이 표시 개월 수, 현재 ${forecastMonths}`}
                onClick={toggleForecastCombo}
              >
                {forecastMonths}
              </button>
              {forecastComboOpen && (
                <ul className={styles.forecastComboList} role="listbox" aria-labelledby={forecastMonthsLabelId} onWheel={(event) => event.stopPropagation()}>
                  {Array.from({ length: MAX_FORECAST_MONTHS }, (_, index) => index + 1).map((month) => (
                    <li key={month} role="presentation">
                      <button
                        type="button"
                        role="option"
                        aria-selected={month === forecastMonths}
                        className={month === forecastMonths ? `${styles.forecastComboOption} ${styles.forecastComboOptionSelected}` : styles.forecastComboOption}
                        onClick={() => selectForecastMonths(month)}
                      >
                        {month}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
          <div className={styles.trendSeriesToggle} aria-label="판매추이 표시 항목">
            {seriesButtons.map((button) => (
              <button
                key={button.key}
                type="button"
                aria-pressed={salesTrendVisible[button.key]}
                className={salesTrendVisible[button.key] ? `${styles.trendSeriesButton} ${styles.trendSeriesButtonSelected} ${button.selectedClassName}` : styles.trendSeriesButton}
                onClick={() => toggleSalesTrendSeries(button.key)}
              >
                {button.label}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div onMouseEnter={onChartMouseEnter} onMouseLeave={onChartMouseLeave} onWheel={onChartWheel}>
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
            lines={chartLines}
            tooltipValueFormatter={(value, name) => [formatGroupedNumber(value), tooltipNames[String(name)] ?? name]}
            tooltipLabelFormatter={(row) => String(row.date ?? '')}
            tickFormatter={(row) => String(row.date ?? '')}
          />
        </div>
      </div>
    </div>
  )
}
