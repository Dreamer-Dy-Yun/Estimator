import type { TrendChartPoint } from '../../../trend/SalesTrendChart'
import { useMemo, useState } from 'react'
import { SalesTrendChart, type TrendShade } from '../../../trend/SalesTrendChart'
import { ApiUnitErrorBadge } from '../../../../../components/ApiUnitErrorBadge'
import { LoadingSpinner } from '../../../../../components/LoadingSpinner'
import type { SecondaryDailyTrendPoint } from '../../../../../api/types'
import type { ApiUnitErrorInfo } from '../../../../../types'
import { formatGroupedNumber } from '../../../../../utils/format'
import commonStyles from '../../../common.module.css'
import { KO } from '../../ko'
import styles from '../secondaryDrawer.module.css'

export type SizeOption = { id: string; label: string; share: number }

export type Props = {
  skuGroupKey: string
  selfCompanyLabel: string
  comparisonLabel: string
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

type DailyTrendChartPoint = SecondaryDailyTrendPoint & {
  selfSales: number | null
  comparisonSales: number | null
}

function scaleNullableQuantity(value: number | null, share: number): number | null {
  return value == null ? null : Math.max(0, Math.round(value * share))
}

const chartHeight = 240 as const
const stockBars: { dataKey: string; name: string; fill: string; fillOpacity: number; barSize: number; stackId: string; }[] = [
  { dataKey: 'stockBar', name: '현재고', fill: '#149632', fillOpacity: 0.58, barSize: 7, stackId: 'stockInbound' },
  { dataKey: 'inboundAccumBar', name: '예상 입고', fill: '#ef4444', fillOpacity: 0.42, barSize: 7, stackId: 'stockInbound' },
]
const actualForecastLines: ({ dataKey: string; stroke: string; strokeDasharray?: undefined; connectNulls?: undefined; } | { dataKey: string; stroke: string; strokeDasharray: string; connectNulls: boolean; })[] = [
  { dataKey: 'salesActual', stroke: '#0f172a' },
  { dataKey: 'salesForecast', stroke: '#2563eb', strokeDasharray: '4 4', connectNulls: true },
]
const stockTrendNameByKey: Record<string, string> = {
  salesActual: '실제 판매',
  salesForecast: '예측 판매',
  stockBar: '현재고',
  inboundAccumBar: '예상 입고',
}

export function SalesTrendDailyCard({ skuGroupKey, selfCompanyLabel, comparisonLabel, sizeOptions, trend }: Props) : React.JSX.Element {
  const [expanded, setExpanded]: [boolean, React.Dispatch<React.SetStateAction<boolean>>] = useState(false)
  const [selectedSizeState, setSelectedSizeState]: [{ skuGroupKey: string; sizeId: 'all' | string; } | null, React.Dispatch<React.SetStateAction<{ skuGroupKey: string; sizeId: 'all' | string; } | null>>] = useState<{ skuGroupKey: string; sizeId: 'all' | string } | null>(null)
  const selectedSizeId: string = selectedSizeState?.skuGroupKey === skuGroupKey ? selectedSizeState.sizeId : 'all'

  const scaledSeries: DailyTrendChartPoint[] = useMemo(() : DailyTrendChartPoint[] => {
    const share: number = selectedSizeId === 'all'
      ? 1
      : sizeOptions.find((o: SizeOption) : boolean => o.id === selectedSizeId)?.share ?? 1
    return trend.series.map((p: SecondaryDailyTrendPoint) : DailyTrendChartPoint => ({
      ...p,
      sales: Math.max(0, Math.round(p.sales * share)),
      selfSales: p.baseSales == null ? p.baseSales : Math.max(0, Math.round(p.baseSales * share)),
      comparisonSales: p.comparisonSales == null ? p.comparisonSales : Math.max(0, Math.round(p.comparisonSales * share)),
      stockBar: scaleNullableQuantity(p.stockBar, share),
      inboundAccumBar: scaleNullableQuantity(p.inboundAccumBar, share),
    }))
  }, [trend.series, selectedSizeId, sizeOptions])

  const chartSeries: { salesActual: number | null; salesForecast: number | null; idx: number; date: string; month: string; sales: number; stockBar: number | null; inboundAccumBar: number | null; selfSales: number | null; comparisonSales: number | null; isForecast: boolean; }[] = useMemo(() : { salesActual: number | null; salesForecast: number | null; idx: number; date: string; month: string; sales: number; stockBar: number | null; inboundAccumBar: number | null; selfSales: number | null; comparisonSales: number | null; isForecast: boolean; }[] => {
    const firstForecastIdx: number = scaledSeries.findIndex((p: SecondaryDailyTrendPoint) : boolean => p.isForecast)
    return scaledSeries.map((p: DailyTrendChartPoint, idx: number) : { salesActual: number | null; salesForecast: number | null; idx: number; date: string; month: string; sales: number; stockBar: number | null; inboundAccumBar: number | null; selfSales: number | null; comparisonSales: number | null; isForecast: boolean; } => {
      const bridge: boolean = firstForecastIdx !== -1 && (idx === firstForecastIdx - 1 || p.isForecast)
      return { ...p, salesActual: p.isForecast ? null : p.sales, salesForecast: bridge ? p.sales : null }
    })
  }, [scaledSeries])

  const salesCompareSeries: { idx: number; date: string; selfSales: number | null; comparisonSales: number | null; }[] = useMemo(
    () : { idx: number; date: string; selfSales: number | null; comparisonSales: number | null; }[] => chartSeries.map((p: { salesActual: number | null; salesForecast: number | null; idx: number; date: string; month: string; sales: number; stockBar: number | null; inboundAccumBar: number | null; selfSales: number | null; comparisonSales: number | null; isForecast: boolean; }) : { idx: number; date: string; selfSales: number | null; comparisonSales: number | null; } => ({ idx: p.idx, date: p.date, selfSales: p.selfSales, comparisonSales: p.comparisonSales })),
    [chartSeries],
  )
  const [selfSalesYMax, comparisonSalesYMax]: [number, number] = useMemo(() : [number, number] => {
    const max: { self: number; comparison: number; } = salesCompareSeries.reduce((acc: { self: number; comparison: number; }, p: { idx: number; date: string; selfSales: number | null; comparisonSales: number | null; }) : { self: number; comparison: number; } => ({
      self: Math.max(acc.self, Number(p.selfSales ?? 0)),
      comparison: Math.max(acc.comparison, Number(p.comparisonSales ?? 0)),
    }), { self: 0, comparison: 0 })
    return [max.self <= 0 ? 1 : Math.ceil(max.self * 1.05), max.comparison <= 0 ? 1 : Math.ceil(max.comparison * 1.05)]
  }, [salesCompareSeries])
  const showSizeSelect: boolean = expanded && sizeOptions.length > 0
  const salesCompareNameByKey: Record<string, string> = useMemo<Record<string, string>>(() : { selfSales: string; comparisonSales: string; } => ({
    selfSales: `${selfCompanyLabel} 판매량`,
    comparisonSales: `${comparisonLabel} 판매량`,
  }), [comparisonLabel, selfCompanyLabel])

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
              onChange={(e: React.ChangeEvent<HTMLSelectElement, HTMLSelectElement>) : void => setSelectedSizeState({ skuGroupKey, sizeId: e.target.value === 'all' ? 'all' : e.target.value })}
            >
              <option value="all">{KO.optionTrendDailySizeAll}</option>
              {sizeOptions.map((o: SizeOption) : React.JSX.Element => <option key={o.id} value={o.id}>{o.label}</option>)}
            </select>
          )}
          <button
            type="button"
            className={styles.dailyTrendSizeToggle}
            onClick={() : void => setExpanded((prev: boolean) : boolean => !prev)}
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
                tickFormatter={() : string => ''}
                tickAngle={0}
                tickHeight={10}
                xTicks={trend.tickIndices}
                minTickGap={4}
                interval={0}
                tooltipValueFormatter={(value: number, name: string) : [string, string] => [formatGroupedNumber(value), stockTrendNameByKey[String(name)] ?? String(name)]}
                tooltipLabelFormatter={(row: TrendChartPoint) : string => String(row.date ?? '')}
              />
              <SalesTrendChart
                data={salesCompareSeries}
                height={130}
                yMax={selfSalesYMax}
                secondaryYMax={comparisonSalesYMax}
                allowEscapeViewBox={{ x: false, y: false }}
                periodShade={trend.periodShade}
                forecastShade={trend.forecastShade}
                lines={[
                  { dataKey: 'selfSales', stroke: '#2563eb', yAxisId: 'primary' },
                  { dataKey: 'comparisonSales', stroke: '#ef4444', yAxisId: 'secondary' },
                ]}
                tickFormatter={(row: TrendChartPoint) : string => String(row.date ?? '')}
                tickAngle={-45}
                tickHeight={46}
                xTicks={trend.tickIndices}
                minTickGap={4}
                interval={0}
                tooltipValueFormatter={(value: number, name: string) : [string, string] => [formatGroupedNumber(value), salesCompareNameByKey[String(name)] ?? String(name)]}
                tooltipLabelFormatter={(row: TrendChartPoint) : string => String(row.date ?? '')}
              />
            </>
          )}
        </div>
      )}
    </div>
  )
}
