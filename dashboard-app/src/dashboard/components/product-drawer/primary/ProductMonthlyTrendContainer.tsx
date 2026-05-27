import { formatGroupedNumber } from '../../../../utils/format'
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
  const model = useProductMonthlyTrendModel(modelProps)
  const { forecastMonths } = modelProps
  const seriesButtons = [
    {
      key: 'self' as const,
      label: selfCompanyLabel,
      selectedClassName: styles.trendSeriesButtonSelfSelected,
    },
    {
      key: 'competitor' as const,
      label: model.competitorTrendLabel,
      selectedClassName: styles.trendSeriesButtonCompetitorSelected,
    },
  ]
  const chartLines = [
    ...(model.salesTrendVisible.self
      ? [
          { dataKey: 'actual', stroke: '#2563eb' },
          { dataKey: 'forecastLink', stroke: '#2563eb', strokeDasharray: '4 4' },
        ]
      : []),
    ...(model.salesTrendVisible.competitor ? [{ dataKey: 'competitorActual', stroke: '#e11d48' }] : []),
  ]
  const tooltipNames: Record<string, string> = {
    actual: `${selfCompanyLabel} 실적`,
    competitorActual: `${model.competitorTrendLabel} 판매`,
    forecastLink: `${selfCompanyLabel} 예측`,
  }

  return (
    <div className={`${styles.card} ${styles.drawerSalesTrendCard}`}>
      <div className={styles.salesTrendTitleRow}>
        <div className={styles.cardTitle}>
          판매추이(월간)
          <ApiUnitErrorBadge error={model.monthlyTrendError} />
        </div>
        <div className={styles.salesTrendControls}>
          <div className={styles.forecastMonthsControl}>
            <span className={styles.forecastMonthsLabel} id={model.forecastMonthsLabelId}>예측 개월</span>
            <div className={styles.forecastComboWrap} ref={model.forecastComboRef}>
              <button
                type="button"
                className={styles.forecastComboTrigger}
                aria-haspopup="listbox"
                aria-expanded={model.forecastComboOpen}
                aria-labelledby={model.forecastMonthsLabelId}
                aria-label={`판매추이 표시 개월 수, 현재 ${forecastMonths}`}
                onClick={model.toggleForecastCombo}
              >
                {forecastMonths}
              </button>
              {model.forecastComboOpen && (
                <ul className={styles.forecastComboList} role="listbox" aria-labelledby={model.forecastMonthsLabelId} onWheel={(event) => event.stopPropagation()}>
                  {Array.from({ length: 24 }, (_, index) => index + 1).map((month) => (
                    <li key={month} role="presentation">
                      <button
                        type="button"
                        role="option"
                        aria-selected={month === forecastMonths}
                        className={month === forecastMonths ? `${styles.forecastComboOption} ${styles.forecastComboOptionSelected}` : styles.forecastComboOption}
                        onClick={() => model.selectForecastMonths(month)}
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
                aria-pressed={model.salesTrendVisible[button.key]}
                className={model.salesTrendVisible[button.key] ? `${styles.trendSeriesButton} ${styles.trendSeriesButtonSelected} ${button.selectedClassName}` : styles.trendSeriesButton}
                onClick={() => model.toggleSalesTrendSeries(button.key)}
              >
                {button.label}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div onMouseEnter={model.onChartMouseEnter} onMouseLeave={model.onChartMouseLeave} onWheel={model.onChartWheel}>
        <div className={styles.chartClipWrap}>
          <SalesTrendChart
            data={model.trendWindowData}
            height={model.salesTrendChartDense ? 232 : 210}
            yMax={model.salesTrendYMax}
            allowEscapeViewBox={{ x: false, y: false }}
            periodShade={model.shiftedPeriodShade}
            forecastShade={model.shiftedForecastShade}
            minTickGap={model.salesTrendChartDense ? 0 : 8}
            interval={model.salesTrendChartDense ? 0 : 'preserveStartEnd'}
            tickAngle={model.salesTrendChartDense ? -38 : 0}
            tickHeight={model.salesTrendChartDense ? 42 : undefined}
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
