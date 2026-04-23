import { useEffect, useMemo, useState } from 'react'
import { SalesTrendChart, type TrendShade } from '../../trend/SalesTrendChart'
import { ApiUnitErrorBadge } from '../../../../components/ApiUnitErrorBadge'
import type { ApiUnitErrorInfo } from '../../../../types'
import commonStyles from '../../common.module.css'
import { DAILY_TREND_AS_OF_DATE } from '../../../../api'
import { formatGroupedNumber } from '../../../../utils/format'
import { KO } from '../ko'
import styles from '../productSecondaryPanel.module.css'

type TrendPoint = {
  idx: number
  date: string
  month: string
  sales: number
  stockBar: number
  inboundAccumBar: number
  selfSales: number | null
  competitorSales: number | null
  isForecast: boolean
}

type SizeOption = { id: string; label: string; share: number }

type Props = {
  productId: string
  competitorChannelLabel: string
  /** 사이즈별 비중(합 1). 비어 있으면 선택 UI 숨김. */
  sizeOptions: SizeOption[]
  trend: {
    series: TrendPoint[]
    tickIndices: number[]
    periodShade: TrendShade
    forecastShade: TrendShade | null
    error: ApiUnitErrorInfo | null
  }
}

export function SalesTrendDailyCard({ productId, competitorChannelLabel, sizeOptions, trend }: Props) {
  const [expanded, setExpanded] = useState(false)
  const [selectedSizeId, setSelectedSizeId] = useState<'all' | string>('all')
  const chartHeight = 240

  useEffect(() => {
    setSelectedSizeId('all')
  }, [productId])

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

  /** 월간 판매추이와 동일: 기준일 이하 실적(검정 실선), 이후 예측(파란 점선) + 전환일 연결 */
  const chartSeries = useMemo(() => {
    const asOf = DAILY_TREND_AS_OF_DATE
    const firstFutureIdx = scaledSeries.findIndex((p) => p.date > asOf)
    const hasFuture = firstFutureIdx !== -1
    return scaledSeries.map((p, idx) => {
      const isFuture = p.date > asOf
      const bridge = hasFuture && (idx === firstFutureIdx - 1 || isFuture)
      return {
        ...p,
        salesActual: isFuture ? null : p.sales,
        salesForecast: bridge ? p.sales : null,
      }
    })
  }, [scaledSeries])

  const salesCompareSeries = useMemo(
    () =>
      chartSeries.map((p) => ({
        idx: p.idx,
        date: p.date,
        selfSales: p.selfSales,
        competitorSales: p.competitorSales,
      })),
    [chartSeries],
  )

  /** 하단 비교 그래프 축 최대값: 각 시리즈의 실제 데이터 최대치 기반 */
  const selfSalesYMax = useMemo(() => {
    const mx = salesCompareSeries.reduce((acc, p) => Math.max(acc, Number(p.selfSales ?? 0)), 0)
    return mx <= 0 ? 1 : Math.ceil(mx * 1.05)
  }, [salesCompareSeries])

  const competitorSalesYMax = useMemo(() => {
    const mx = salesCompareSeries.reduce((acc, p) => Math.max(acc, Number(p.competitorSales ?? 0)), 0)
    return mx <= 0 ? 1 : Math.ceil(mx * 1.05)
  }, [salesCompareSeries])

  const showSizeSelect = expanded && sizeOptions.length > 0

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
              onChange={(e) => {
                const v = e.target.value
                setSelectedSizeId(v === 'all' ? 'all' : v)
              }}
            >
              <option value="all">{KO.optionTrendDailySizeAll}</option>
              {sizeOptions.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
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
          <SalesTrendChart
            data={chartSeries}
            height={chartHeight}
            allowEscapeViewBox={{ x: false, y: false }}
            periodShade={trend.periodShade}
            forecastShade={trend.forecastShade}
            barsUseSecondaryAxis
            bars={[
              { dataKey: 'stockBar', name: '실재고', stackId: 'stockInbound', fill: '#149632', fillOpacity: 0.58, barSize: 7 },
              { dataKey: 'inboundAccumBar', name: '예상 재고', stackId: 'stockInbound', fill: '#ef4444', fillOpacity: 0.42, barSize: 7 },
            ]}
            lines={[
              { dataKey: 'salesActual', stroke: '#0f172a' },
              {
                dataKey: 'salesForecast',
                stroke: '#2563eb',
                strokeDasharray: '4 4',
                connectNulls: true,
              },
            ]}
            tickFormatter={() => ''}
            tickAngle={0}
            tickHeight={10}
            xTicks={trend.tickIndices}
            minTickGap={4}
            interval={0}
            tooltipValueFormatter={(value, name) => {
              if (name === 'stockBar') return [formatGroupedNumber(value), '실재고']
              if (name === 'inboundAccumBar') return [formatGroupedNumber(value), '예상 재고']
              if (name === 'salesActual') return [formatGroupedNumber(value), '판매 실적']
              if (name === 'salesForecast') return [formatGroupedNumber(value), '판매 예측']
              return [formatGroupedNumber(value), String(name)]
            }}
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
            tooltipValueFormatter={(value, name) => {
              if (name === 'selfSales') return [formatGroupedNumber(value), '자사 판매량']
              if (name === 'competitorSales') return [formatGroupedNumber(value), `${competitorChannelLabel} 판매량`]
              return [formatGroupedNumber(value), String(name)]
            }}
            tooltipLabelFormatter={(row) => String(row.date ?? '')}
          />
        </div>
      )}
    </div>
  )
}
