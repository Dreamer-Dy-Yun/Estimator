import { useEffect, useMemo, useState } from 'react'
import { SalesTrendChart, type TrendShade } from '../../trend/SalesTrendChart'
import { ApiUnitErrorBadge } from '../../../../components/ApiUnitErrorBadge'
import type { ApiUnitErrorInfo } from '../../../../types'
import commonStyles from '../../common.module.css'
import { DAILY_TREND_AS_OF_DATE } from '../../../../api'
import { c } from '../../../../utils/format'
import { KO } from '../ko'
import styles from '../productSecondaryPanel.module.css'

type TrendPoint = {
  idx: number
  date: string
  month: string
  sales: number
  stockBar: number
  inboundAccumBar: number
  selfSalesNorm: number | null
  competitorSalesNorm: number | null
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

  const normSeries = useMemo(
    () =>
      chartSeries.map((p) => ({
        idx: p.idx,
        date: p.date,
        selfSalesNorm: p.selfSalesNorm,
        competitorSalesNorm: p.competitorSalesNorm,
      })),
    [chartSeries],
  )

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
            xTicks={[]}
            minTickGap={4}
            interval={0}
            tooltipValueFormatter={(value, name) => {
              if (name === 'stockBar') return [c(value), '실재고']
              if (name === 'inboundAccumBar') return [c(value), '예상 재고']
              if (name === 'salesActual') return [c(value), '판매 실적']
              if (name === 'salesForecast') return [c(value), '판매 예측']
              return [c(value), String(name)]
            }}
            tooltipLabelFormatter={(row) => String(row.date ?? '')}
          />
          <SalesTrendChart
            data={normSeries}
            height={130}
            yMax={1}
            secondaryYMax={1}
            barsUseSecondaryAxis
            allowEscapeViewBox={{ x: false, y: false }}
            periodShade={trend.periodShade}
            forecastShade={trend.forecastShade}
            lines={[
              { dataKey: 'selfSalesNorm', stroke: '#2563eb' },
              { dataKey: 'competitorSalesNorm', stroke: '#ef4444' },
            ]}
            tickFormatter={(row) => String(row.date ?? '')}
            tickAngle={-45}
            tickHeight={46}
            xTicks={trend.tickIndices}
            minTickGap={4}
            interval={0}
            tooltipValueFormatter={(value, name) => {
              if (name === 'selfSalesNorm') return [Number(value).toFixed(3), '자사 판매(정규화)']
              if (name === 'competitorSalesNorm') return [Number(value).toFixed(3), `${competitorChannelLabel} 판매(정규화)`]
              return [Number(value).toFixed(3), String(name)]
            }}
            tooltipLabelFormatter={(row) => String(row.date ?? '')}
          />
        </div>
      )}
    </div>
  )
}
