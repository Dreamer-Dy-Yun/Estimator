import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { CartesianGrid, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis } from 'recharts'
import { getSelfSales, getSelfSalesFilterMeta } from '../../api'
import type { SelfSalesRow } from '../../types'
import type { AdjacentDirection } from '../../utils/adjacentListNavigation'
import { adjacentIdInOrder } from '../../utils/adjacentListNavigation'
import { clampForecastMonths, readForecastMonthsFromStorage, writeForecastMonthsToStorage } from '../../utils/forecastMonthsStorage'
import { formatGroupedNumber, formatPercent } from '../../utils/format'
import { ProductSummaryDrawer } from '../components/ProductSummaryDrawer'
import styles from '../components/common.module.css'
import { AnalysisList } from '../components/AnalysisList'
import { ChartCard } from '../components/ChartCard'
import { FilterBar } from '../components/FilterBar'
import { KpiGrid } from '../components/KpiGrid'
import { useProductDrawerBundle } from '../hooks/useProductDrawerBundle'
import { usePeriodRangeFilter } from '../hooks/usePeriodRangeFilter'

type ScatterPoint = {
  x: number
  y: number
  brand: string
  name: string
}

export const SelfPage = () => {
  const [rows, setRows] = useState<SelfSalesRow[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [forecastMonths, setForecastMonths] = useState(() => readForecastMonthsFromStorage())
  const summaryBundle = useProductDrawerBundle(selectedId, forecastMonths)

  const onForecastMonthsChange = useCallback((n: number) => {
    const v = clampForecastMonths(n)
    setForecastMonths(v)
    writeForecastMonthsToStorage(v)
  }, [])
  const [brandOptions, setBrandOptions] = useState<string[]>(['전체'])
  const [brandFilter, setBrandFilter] = useState('전체')
  const [categoryOptions, setCategoryOptions] = useState<string[]>(['전체'])
  const [categoryFilter, setCategoryFilter] = useState('전체')
  const [historicalMonths, setHistoricalMonths] = useState<string[]>([])
  const [showPeriodBar, setShowPeriodBar] = useState(false)
  const salesReqSeqRef = useRef(0)
  const metaReqSeqRef = useRef(0)
  const {
    periodStartDate,
    periodEndDate,
    periodStartIdx,
    periodEndIdx,
    startPct,
    endPct,
    setPresetMonths,
    setWholeRange,
    onStartDateChange,
    onEndDateChange,
    onPeriodBarStart,
    onPeriodBarEnd,
  } = usePeriodRangeFilter(historicalMonths)

  useEffect(() => {
    let alive = true
    const reqSeq = ++salesReqSeqRef.current
    void getSelfSales({
      startDate: periodStartDate,
      endDate: periodEndDate,
      brand: brandFilter === '전체' ? undefined : brandFilter,
      category: categoryFilter === '전체' ? undefined : categoryFilter,
    }).then((data) => {
      if (!alive) return
      if (reqSeq !== salesReqSeqRef.current) return
      setRows(data)
    })
    return () => {
      alive = false
    }
  }, [periodStartDate, periodEndDate, brandFilter, categoryFilter])
  useEffect(() => {
    let alive = true
    const reqSeq = ++metaReqSeqRef.current
    void getSelfSalesFilterMeta().then(({ brands, categories, historicalMonths: months }) => {
      if (!alive) return
      if (reqSeq !== metaReqSeqRef.current) return
      setBrandOptions(['전체', ...brands])
      setCategoryOptions(['전체', ...categories])
      setHistoricalMonths(months)
    })
    return () => {
      alive = false
    }
  }, [])

  const kpi = useMemo(() => {
    const total = rows.reduce((acc, row) => acc + row.amount, 0)
    const avgRate = rows.length ? rows.reduce((acc, row) => acc + row.opMarginRate, 0) / rows.length : 0
    return { total, avgRate }
  }, [rows])

  const scatterData: ScatterPoint[] = useMemo(
    () => rows.map((r) => ({
      x: r.opMarginRate,
      y: Math.round(r.amount / 1000000),
      brand: r.brand,
      name: r.name,
    })),
    [rows],
  )

  const navigationOrderIds = useMemo(() => rows.map((r) => r.id), [rows])

  const onRequestNavigateAdjacent = useCallback(
    (direction: AdjacentDirection) => {
      if (!selectedId) return
      const nextId = adjacentIdInOrder(navigationOrderIds, selectedId, direction)
      if (nextId != null && nextId !== selectedId) setSelectedId(nextId)
    },
    [navigationOrderIds, selectedId],
  )

  const renderScatterTooltip = (props: { active?: boolean; payload?: ReadonlyArray<{ payload?: ScatterPoint }> }) => {
    const { active, payload } = props
    if (!active || !payload?.length) return null
    const point = payload[0]?.payload
    if (!point) return null

    return (
      <div className={styles.chartTooltip}>
        <div className={styles.chartTooltipTitle}>{point.brand}</div>
        <div className={styles.chartTooltipText}>{point.name}</div>
        <div className={styles.chartTooltipText}>영업이익율: {formatPercent(point.x)}</div>
        <div className={styles.chartTooltipText}>판매액: {point.y}백만</div>
      </div>
    )
  }

  return (
    <section className={styles.page}>
      <FilterBar
        title=""
        fields={[
          { label: '시작일', kind: 'input', inputType: 'date', value: periodStartDate, onChange: onStartDateChange },
          { label: '종료일', kind: 'input', inputType: 'date', value: periodEndDate, onChange: onEndDateChange },
          { label: '브랜드', kind: 'select', value: brandFilter, onChange: setBrandFilter, options: brandOptions },
          { label: '카테고리', kind: 'select', value: categoryFilter, onChange: setCategoryFilter, options: categoryOptions },
        ]}
        extraContent={(
          <div className={styles.periodTools}>
            <div className={styles.periodPresetRow}>
              <button type="button" onClick={() => setPresetMonths(1)}>최근 1개월</button>
              <button type="button" onClick={() => setPresetMonths(3)}>최근 3개월</button>
              <button type="button" onClick={() => setPresetMonths(6)}>최근 6개월</button>
              <button type="button" onClick={() => setPresetMonths(12)}>최근 1년</button>
              <button type="button" onClick={setWholeRange}>전체</button>
              <button type="button" onClick={() => setShowPeriodBar((prev) => !prev)}>
                {showPeriodBar ? '기간 바 닫기' : '기간 바 열기'}
              </button>
            </div>
            {showPeriodBar && historicalMonths.length > 1 && (
              <div className={styles.periodBarWrap}>
                <div className={styles.periodBarLabel}>
                  <span>{historicalMonths[0]}</span>
                  <span>{historicalMonths[historicalMonths.length - 1]}</span>
                </div>
                <div className={styles.periodDualRange}>
                  <div className={styles.periodTrack} />
                  <div
                    className={styles.periodSelected}
                    style={{ left: `${startPct}%`, width: `${Math.max(0, endPct - startPct)}%` }}
                  />
                  <input
                    className={`${styles.periodRange} ${styles.periodRangeStart}`}
                    type="range"
                    min={0}
                    max={historicalMonths.length - 1}
                    value={periodStartIdx}
                    onChange={(e) => onPeriodBarStart(Number(e.target.value))}
                  />
                  <input
                    className={`${styles.periodRange} ${styles.periodRangeEnd}`}
                    type="range"
                    min={0}
                    max={historicalMonths.length - 1}
                    value={periodEndIdx}
                    onChange={(e) => onPeriodBarEnd(Number(e.target.value))}
                  />
                </div>
              </div>
            )}
          </div>
        )}
      />

      <div className={`${styles.twoCol} ${styles.selfTwoCol}`}>
        <div className={`${styles.leftCol} ${styles.selfLeftCol}`}>
          <KpiGrid
            stacked
            items={[
              { label: '총 판매액', value: formatGroupedNumber(kpi.total) },
              { label: '평균 영업이익율', value: formatPercent(kpi.avgRate) },
            ]}
          />

          <ChartCard title="포지셔닝" className={styles.selfChartCard}>
            <div className={styles.selfChartBody}>
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart data={scatterData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" dataKey="x" name="%" unit="%" tickFormatter={(v) => `${v}`} tick={{ fontSize: 10 }} />
                  <YAxis
                    type="number"
                    dataKey="y"
                    name="Net Sales (백만)"
                    tick={{ fontSize: 10 }}
                    width={30}
                    tickMargin={4}
                  />
                  <Tooltip content={renderScatterTooltip} />
                  <Scatter fill="#3b82f6" />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        </div>

        <AnalysisList<SelfSalesRow>
          columns={[
            { key: 'rank', header: '순위', cell: (r) => r.rank, align: 'center', sortValue: (r) => r.rank },
            { key: 'brand', header: '브랜드', cell: (r) => r.brand, sortValue: (r) => r.brand },
            { key: 'category', header: '카테고리', cell: (r) => r.category, sortValue: (r) => r.category },
            { key: 'name', header: '상품명', cell: (r) => r.name, sortValue: (r) => r.name },
            { key: 'avgPrice', header: '평균판매가', cell: (r) => formatGroupedNumber(r.avgPrice), align: 'right', sortValue: (r) => r.avgPrice },
            { key: 'avgCost', header: '평균매입원가', cell: (r) => formatGroupedNumber(r.avgCost), align: 'right', sortValue: (r) => r.avgCost },
            { key: 'qty', header: '판매량', cell: (r) => formatGroupedNumber(r.qty), align: 'right', sortValue: (r) => r.qty },
            { key: 'amount', header: '총판매액', cell: (r) => formatGroupedNumber(r.amount), align: 'right', sortValue: (r) => r.amount },
            { key: 'margin', header: '매출이익율', cell: (r) => formatPercent(r.marginRate), align: 'right', sortValue: (r) => r.marginRate },
            { key: 'op', header: '영업이익률', cell: (r) => formatPercent(r.opMarginRate), align: 'right', sortValue: (r) => r.opMarginRate },
          ]}
          rows={rows}
          onRowClick={(row) => setSelectedId(row.id)}
        />
      </div>

      <ProductSummaryDrawer
        summary={summaryBundle?.summary ?? null}
        stockTrend={summaryBundle?.stockTrend ?? []}
        periodStart={periodStartDate}
        periodEnd={periodEndDate}
        forecastMonths={forecastMonths}
        onForecastMonthsChange={onForecastMonthsChange}
        onClose={() => setSelectedId(null)}
        onRequestNavigateAdjacent={onRequestNavigateAdjacent}
      />
    </section>
  )
}
