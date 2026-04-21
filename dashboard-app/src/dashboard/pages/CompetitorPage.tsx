import { useCallback, useEffect, useMemo, useState } from 'react'
import { CartesianGrid, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis } from 'recharts'
import { getCompetitorSales, getSecondaryCompetitorChannels, getSelfSalesFilterMeta } from '../../api'
import type { SecondaryCompetitorChannel } from '../../api/types'
import type { CompetitorSalesRow } from '../../types'
import { dateToMonth, monthToEndDate, monthToStartDate } from '../../utils/date'
import { clampForecastMonths, readForecastMonthsFromStorage, writeForecastMonthsToStorage } from '../../utils/forecastMonthsStorage'
import { c, pct, won } from '../../utils/format'
import { ProductSummaryDrawer } from '../components/ProductSummaryDrawer'
import styles from '../components/common.module.css'
import { AnalysisList } from '../components/AnalysisList'
import { ChartCard } from '../components/ChartCard'
import { FilterBar } from '../components/FilterBar'
import { KpiGrid } from '../components/KpiGrid'
import { PageHeader } from '../components/PageHeader'
import { useProductDrawerBundle } from '../hooks/useProductDrawerBundle'

type QtyScatterPoint = {
  x: number
  y: number
  brand: string
  category: string
  productCode: string
  name: string
}

export const CompetitorPage = () => {
  const [rows, setRows] = useState<CompetitorSalesRow[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [forecastMonths, setForecastMonths] = useState(() => readForecastMonthsFromStorage())
  const summaryBundle = useProductDrawerBundle(selectedId, forecastMonths)

  const onForecastMonthsChange = useCallback((n: number) => {
    const v = clampForecastMonths(n)
    setForecastMonths(v)
    writeForecastMonthsToStorage(v)
  }, [])

  const [channels, setChannels] = useState<SecondaryCompetitorChannel[]>([])
  const [competitorChannelLabel, setCompetitorChannelLabel] = useState('전체')
  const [brandOptions, setBrandOptions] = useState<string[]>(['전체'])
  const [brandFilter, setBrandFilter] = useState('전체')
  const [categoryOptions, setCategoryOptions] = useState<string[]>(['전체'])
  const [categoryFilter, setCategoryFilter] = useState('전체')
  const [historicalMonths, setHistoricalMonths] = useState<string[]>([])
  const [periodStartDate, setPeriodStartDate] = useState('2025-01-01')
  const [periodEndDate, setPeriodEndDate] = useState('2025-12-31')
  const [showPeriodBar, setShowPeriodBar] = useState(false)

  const competitorChannelId = useMemo(() => {
    if (competitorChannelLabel === '전체') return undefined
    return channels.find((ch) => ch.label === competitorChannelLabel)?.id
  }, [channels, competitorChannelLabel])

  useEffect(() => {
    getSecondaryCompetitorChannels().then(setChannels)
  }, [])

  useEffect(() => {
    getCompetitorSales({
      startDate: periodStartDate,
      endDate: periodEndDate,
      brand: brandFilter === '전체' ? undefined : brandFilter,
      category: categoryFilter === '전체' ? undefined : categoryFilter,
      competitorChannelId,
    }).then(setRows)
  }, [periodStartDate, periodEndDate, brandFilter, categoryFilter, competitorChannelId])

  useEffect(() => {
    getSelfSalesFilterMeta().then(({ brands, categories, historicalMonths: months }) => {
      setBrandOptions(['전체', ...brands])
      setCategoryOptions(['전체', ...categories])
      setHistoricalMonths(months)
    })
  }, [])

  const periodStartIdx = useMemo(() => {
    const idx = historicalMonths.findIndex((month) => month === dateToMonth(periodStartDate))
    return idx === -1 ? 0 : idx
  }, [historicalMonths, periodStartDate])

  const periodEndIdx = useMemo(() => {
    const idx = historicalMonths.findIndex((month) => month === dateToMonth(periodEndDate))
    return idx === -1 ? Math.max(0, historicalMonths.length - 1) : idx
  }, [historicalMonths, periodEndDate])

  const setPresetMonths = (months: number) => {
    if (!historicalMonths.length) return
    const endIdx = periodEndIdx
    const startIdx = Math.max(0, endIdx - months + 1)
    setPeriodStartDate(monthToStartDate(historicalMonths[startIdx]!))
    setPeriodEndDate(monthToEndDate(historicalMonths[endIdx]!))
  }

  const setWholeRange = () => {
    if (!historicalMonths.length) return
    setPeriodStartDate(monthToStartDate(historicalMonths[0]!))
    setPeriodEndDate(monthToEndDate(historicalMonths[historicalMonths.length - 1]!))
  }

  const onStartDateChange = (value: string) => {
    if (value > periodEndDate) {
      setPeriodEndDate(value)
    }
    setPeriodStartDate(value)
  }

  const onEndDateChange = (value: string) => {
    if (value < periodStartDate) {
      setPeriodStartDate(value)
    }
    setPeriodEndDate(value)
  }

  const onPeriodBarStart = (value: number) => {
    const idx = Math.min(value, periodEndIdx)
    const month = historicalMonths[idx]
    if (!month) return
    setPeriodStartDate(monthToStartDate(month))
  }

  const onPeriodBarEnd = (value: number) => {
    const idx = Math.max(value, periodStartIdx)
    const month = historicalMonths[idx]
    if (!month) return
    setPeriodEndDate(monthToEndDate(month))
  }

  const startPct = historicalMonths.length > 1 ? (periodStartIdx / (historicalMonths.length - 1)) * 100 : 0
  const endPct = historicalMonths.length > 1 ? (periodEndIdx / (historicalMonths.length - 1)) * 100 : 100

  const channelOptions = useMemo(
    () => ['전체', ...channels.map((ch) => ch.label)],
    [channels],
  )
  const competitorTooltipLabel = competitorChannelLabel === '전체'
    ? '전체 경쟁사'
    : competitorChannelLabel

  const kpi = useMemo(() => {
    const totalCompetitor = rows.reduce((acc, row) => acc + row.competitorAmount, 0)
    const withSelf = rows.filter((r) => r.selfAmount != null)
    const avgGapRate = withSelf.length
      ? withSelf.reduce((acc, r) => {
        const s = r.selfAmount ?? 0
        return acc + (r.competitorAmount - s) / r.competitorAmount
      }, 0) / withSelf.length
      : 0
    return { totalCompetitor, avgGapRate }
  }, [rows])

  const qtyScatterData: QtyScatterPoint[] = useMemo(
    () => rows
      .filter((r) => r.selfQty != null)
      .map((r) => ({
        x: r.competitorQty,
        y: r.selfQty ?? 0,
        brand: r.brand,
        category: r.category,
        productCode: r.productCode,
        name: r.name,
      })),
    [rows],
  )

  const renderQtyScatterTooltip = (props: { active?: boolean; payload?: ReadonlyArray<{ payload?: QtyScatterPoint }> }) => {
    const { active, payload } = props
    if (!active || !payload?.length) return null
    const point = payload[0]?.payload
    if (!point) return null

    return (
      <div className={styles.chartTooltip}>
        <div className={styles.chartTooltipTitle}>{point.brand}</div>
        <div className={styles.chartTooltipText}>{point.category} · {point.name}</div>
        <div className={styles.chartTooltipText}>코드: {point.productCode}</div>
        <div className={styles.chartTooltipText}>
          {competitorTooltipLabel} 판매량:{' '}
          <span style={{ color: '#ef4444', fontWeight: 600 }}>{c(point.x)} EA</span>
        </div>
        <div className={styles.chartTooltipText}>
          자사 판매량:{' '}
          <span style={{ color: '#2563eb', fontWeight: 600 }}>{c(point.y)} EA</span>
        </div>
      </div>
    )
  }

  return (
    <section className={styles.page}>
      <PageHeader title="" badge="" />

      <FilterBar
        title=""
        fields={[
          { label: '시작일', kind: 'input', inputType: 'date', value: periodStartDate, onChange: onStartDateChange },
          { label: '종료일', kind: 'input', inputType: 'date', value: periodEndDate, onChange: onEndDateChange },
          { label: '브랜드', kind: 'select', value: brandFilter, onChange: setBrandFilter, options: brandOptions },
          { label: '카테고리', kind: 'select', value: categoryFilter, onChange: setCategoryFilter, options: categoryOptions },
          { label: '경쟁 채널', kind: 'select', value: competitorChannelLabel, onChange: setCompetitorChannelLabel, options: channelOptions },
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
              { label: '총 경쟁 판매액', value: won(kpi.totalCompetitor) },
              { label: '자사 대비 평균 갭률', value: pct(kpi.avgGapRate * 100) },
            ]}
          />

          <ChartCard title="경쟁·자사 판매량 비교" className={styles.selfChartCard}>
            <div className={styles.selfChartBody}>
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart data={qtyScatterData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" dataKey="x" name="경쟁사 판매량(EA)" tick={{ fontSize: 10 }} />
                  <YAxis
                    type="number"
                    dataKey="y"
                    name="자사 판매량(EA)"
                    tick={{ fontSize: 10 }}
                    width={30}
                    tickMargin={4}
                  />
                  <Tooltip content={renderQtyScatterTooltip} />
                  <Scatter fill="#3b82f6" />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        </div>

        <AnalysisList<CompetitorSalesRow>
          columns={[
            { key: 'rank', header: '순위', cell: (r) => r.rank, align: 'center', sortValue: (r) => r.rank },
            { key: 'brand', header: '브랜드', cell: (r) => r.brand, sortValue: (r) => r.brand },
            { key: 'category', header: '카테고리', cell: (r) => r.category, sortValue: (r) => r.category },
            { key: 'productCode', header: '코드', cell: (r) => r.productCode, sortValue: (r) => r.productCode },
            { key: 'name', header: '상품명', cell: (r) => r.name, sortValue: (r) => r.name },
            { key: 'competitorAvgPrice', header: '경쟁 평균가', cell: (r) => won(r.competitorAvgPrice), align: 'right', sortValue: (r) => r.competitorAvgPrice },
            { key: 'competitorQty', header: '경쟁 판매량', cell: (r) => c(r.competitorQty), align: 'right', sortValue: (r) => r.competitorQty },
            { key: 'competitorAmount', header: '경쟁 판매액', cell: (r) => won(r.competitorAmount), align: 'right', sortValue: (r) => r.competitorAmount },
            { key: 'selfAmount', header: '자사 판매액', cell: (r) => (r.selfAmount != null ? won(r.selfAmount) : '—'), align: 'right', sortValue: (r) => r.selfAmount ?? 0 },
            { key: 'gap', header: '갭(액)', cell: (r) => {
              const gap = r.competitorAmount - (r.selfAmount ?? 0)
              return gap > 0 ? `+${c(gap)}` : c(gap)
            }, align: 'right', sortValue: (r) => r.competitorAmount - (r.selfAmount ?? 0) },
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
      />
    </section>
  )
}
