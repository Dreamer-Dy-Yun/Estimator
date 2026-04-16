import { useState } from 'react'
import { SalesTrendChart, type TrendShade } from '../../SalesTrendChart'
import { ApiUnitErrorBadge } from '../../../../components/ApiUnitErrorBadge'
import type { ApiUnitErrorInfo } from '../../../../types'
import commonStyles from '../../common.module.css'
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
  isForecast: boolean
}

type Props = {
  trend: {
    series: TrendPoint[]
    tickIndices: number[]
    periodShade: TrendShade
    forecastShade: TrendShade | null
    error: ApiUnitErrorInfo | null
  }
}

export function SalesTrendDailyCard({ trend }: Props) {
  const [expanded, setExpanded] = useState(false)
  const chartHeight = expanded ? 240 : 120

  return (
    <div className={styles.card}>
      <div className={styles.dailyTrendTitleRow}>
        <h3 className={styles.sectionTitle}>
          {KO.sectionSalesTrendDaily}
          <ApiUnitErrorBadge error={trend.error} />
        </h3>
        <button
          type="button"
          className={styles.dailyTrendSizeToggle}
          onClick={() => setExpanded((prev) => !prev)}
          aria-pressed={expanded}
        >
          {expanded ? KO.btnTrendSizeDefault : KO.btnTrendSizeExpand}
        </button>
      </div>
      <div className={`${commonStyles.chartClipWrap} ${styles.dailyTrendClipWrap}`}>
        <SalesTrendChart
          data={trend.series}
          height={chartHeight}
          allowEscapeViewBox={{ x: false, y: false }}
          periodShade={trend.periodShade}
          forecastShade={trend.forecastShade}
          barsUseSecondaryAxis
          bars={[
            { dataKey: 'stockBar', name: '실재고', stackId: 'stockInbound', fill: '#149632', fillOpacity: 0.58, barSize: 7 },
            { dataKey: 'inboundAccumBar', name: '예상 재고', stackId: 'stockInbound', fill: '#ef4444', fillOpacity: 0.42, barSize: 7 },
          ]}
          lines={[{ dataKey: 'sales', stroke: '#0f172a' }]}
          tickFormatter={(row) => String(row.date ?? '')}
          tickAngle={-45}
          tickHeight={46}
          xTicks={trend.tickIndices}
          minTickGap={4}
          interval={0}
          tooltipValueFormatter={(value, name) => {
            if (name === 'stockBar') return [c(value), '실재고']
            if (name === 'inboundAccumBar') return [c(value), '예상 재고']
            return [c(value), '일 판매량']
          }}
          tooltipLabelFormatter={(row) => String(row.date ?? '')}
        />
      </div>
    </div>
  )
}
