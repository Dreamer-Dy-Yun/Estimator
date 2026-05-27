import { useMemo, useState } from 'react'
import { SalesTrendChart, type TrendShade } from '../../../trend/SalesTrendChart'
import { ApiUnitErrorBadge } from '../../../../../components/ApiUnitErrorBadge'
import { LoadingSpinner } from '../../../../../components/LoadingSpinner'
import { DAILY_TREND_AS_OF_DATE } from '../../../../../api'
import type { SecondaryDailyTrendPoint } from '../../../../../api/types'
import type { ApiUnitErrorInfo } from '../../../../../types'
import { formatGroupedNumber } from '../../../../../utils/format'
import commonStyles from '../../../common.module.css'
import { KO } from '../../ko'
import styles from '../secondaryDrawer.module.css'

type SizeOption = { id: string; label: string; share: number }

type Props = {
  skuGroupKey: string
  selfCompanyLabel: string
  competitorChannelLabel: string
  sizeOptions: SizeOption[]
  trend: {
    series: SecondaryDailyTrendPoint[]
    loading: boolean
    tickIndices: number[]
    periodShade: TrendShade
    forecastShade: TrendShade | null
    error: ApiUnitErrorInfo | null
  }
}

const chartHeight = 240
const stockBars = [
  { dataKey: 'stockBar', name: '현재고', fill: '#149632', fillOpacity: 0.58, barSize: 7, stackId: 'stockInbound' },
  { dataKey: 'inboundAccumBar', name: '예상 입고', fill: '#ef4444', fillOpacity: 0.42, barSize: 7, stackId: 'stockInbound' },
]
const actualForecastLines = [
  { dataKey: 'salesActual', stroke: '#0f172a' },
  { dataKey: 'salesForecast', stroke: '#2563eb', strokeDasharray: '4 4', connectNulls: true },
]
const stockTrendNameByKey: Record<string, string> = {
  salesActual: '실제 판매',
  salesForecast: '예측 판매',
  stockBar: '현재고',
  inboundAccumBar: '예상 입고',
}

export function SalesTrendDailyCard({ skuGroupKey, selfCompanyLabel, competitorChannelLabel, sizeOptions, trend }: Props) {
  const [expanded, setExpanded] = useState(false)
  const [selectedSizeState, setSelectedSizeState] = useState<{ skuGroupKey: string; sizeId: 'all' | string } | null>(null)
  const selectedSizeId = selectedSizeState?.skuGroupKey === skuGroupKey ? selectedSizeState.sizeId : 'all'

  const scaledSeries = useMemo(() => {
    if (selectedSizeId === 'all') return trend.series
    const share = sizeOptions.find((o) => o.id === selectedSizeId)?.share ?? 1
    return trend.series.map((p) => ({
      ...p,
      sales: Math.max(0, Math.round(p.sales * share)),
      stockBar: Math.max(0, Math.round(p.stockBar * share)),
      inboundAccumBar: Math.max(0, Math.round(p.inboundAccumBar * share)),
    }))
  }, [trend.series, selectedSizeId, sizeOptions])

  const chartSeries = useMemo(() => {
    const firstFutureIdx = scaledSeries.findIndex((p) => p.date > DAILY_TREND_AS_OF_DATE)
    return scaledSeries.map((p, idx) => {
      const isFuture = p.date > DAILY_TREND_AS_OF_DATE
      const bridge = firstFutureIdx !== -1 && (idx === firstFutureIdx - 1 || isFuture)
      return { ...p, salesActual: isFuture ? null : p.sales, salesForecast: bridge ? p.sales : null }
    })
  }, [scaledSeries])

  const salesCompareSeries = useMemo(
    () => chartSeries.map((p) => ({ idx: p.idx, date: p.date, selfSales: p.selfSales, competitorSales: p.competitorSales })),
    [chartSeries],
  )
  const [selfSalesYMax, competitorSalesYMax] = useMemo(() => {
    const max = salesCompareSeries.reduce((acc, p) => ({
      self: Math.max(acc.self, Number(p.selfSales ?? 0)),
      competitor: Math.max(acc.competitor, Number(p.competitorSales ?? 0)),
    }), { self: 0, competitor: 0 })
    return [max.self <= 0 ? 1 : Math.ceil(max.self * 1.05), max.competitor <= 0 ? 1 : Math.ceil(max.competitor * 1.05)]
  }, [salesCompareSeries])
  const showSizeSelect = expanded && sizeOptions.length > 0
  const salesCompareNameByKey = useMemo<Record<string, string>>(() => ({
    selfSales: `${selfCompanyLabel} 판매량`,
    competitorSales: `${competitorChannelLabel} 판매량`,
  }), [competitorChannelLabel, selfCompanyLabel])

  return (
    <div className={styles.card}>
      <div className={`${styles.dailyTrendTitleRow} ${!expanded ? styles.dailyTrendTitleRowCollapsed : ''}`}>
        <h3 className={styles.sectionTitle}>
          {KO.sectionSalesTrendDaily}
          <ApiUnitErrorBadge error={trend.error} />
        </h3>
        <div className={styles.dailyTrendTitleActions}>
          {showSizeSelect && (
            <select
              className={styles.dailyTrendSizeSelect}
              aria-label={KO.ariaTrendDailySizeSelect}
              value={selectedSizeId}
              onChange={(e) => setSelectedSizeState({ skuGroupKey, sizeId: e.target.value === 'all' ? 'all' : e.target.value })}
            >
              <option value="all">{KO.optionTrendDailySizeAll}</option>
              {sizeOptions.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
            </select>
          )}
          <button
            type="button"
            className={styles.dailyTrendSizeToggle}
            onClick={() => setExpanded((prev) => !prev)}
            aria-pressed={expanded}
          >
            {expanded ? KO.btnTrendSizeDefault : KO.btnTrendSizeExpand}
          </button>
        </div>
      </div>
      {expanded && (
        <div className={`${commonStyles.chartClipWrap} ${styles.dailyTrendClipWrap}`}>
          {trend.loading ? (
            <LoadingSpinner label="일간 판매추이를 불러오는 중" />
          ) : (
            <>
              <SalesTrendChart
                data={chartSeries}
                height={chartHeight}
                allowEscapeViewBox={{ x: false, y: false }}
                periodShade={trend.periodShade}
                forecastShade={trend.forecastShade}
                barsUseSecondaryAxis
                bars={stockBars}
                lines={actualForecastLines}
                tickFormatter={() => ''}
                tickAngle={0}
                tickHeight={10}
                xTicks={trend.tickIndices}
                minTickGap={4}
                interval={0}
                tooltipValueFormatter={(value, name) => [formatGroupedNumber(value), stockTrendNameByKey[String(name)] ?? String(name)]}
                tooltipLabelFormatter={(row) => String(row.date ?? '')}
              />
              <SalesTrendChart
                data={salesCompareSeries}
                height={130}
                yMax={selfSalesYMax}
                secondaryYMax={competitorSalesYMax}
                allowEscapeViewBox={{ x: false, y: false }}
                periodShade={trend.periodShade}
                forecastShade={trend.forecastShade}
                lines={[
                  { dataKey: 'selfSales', stroke: '#2563eb', yAxisId: 'primary' },
                  { dataKey: 'competitorSales', stroke: '#ef4444', yAxisId: 'secondary' },
                ]}
                tickFormatter={(row) => String(row.date ?? '')}
                tickAngle={-45}
                tickHeight={46}
                xTicks={trend.tickIndices}
                minTickGap={4}
                interval={0}
                tooltipValueFormatter={(value, name) => [formatGroupedNumber(value), salesCompareNameByKey[String(name)] ?? String(name)]}
                tooltipLabelFormatter={(row) => String(row.date ?? '')}
              />
            </>
          )}
        </div>
      )}
    </div>
  )
}
