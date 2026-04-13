import { useEffect, useMemo, useState } from 'react'
import { CartesianGrid, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis } from 'recharts'
import { api } from '../../api/mock'
import type { ProductDetail, SalesRow } from '../../types'
import { c, pct, won } from '../../utils/format'
import { ProductInsightDrawer } from '../components/ProductInsightDrawer'
import styles from '../components/v2-common.module.css'
import { PaginatedTable } from '../components/PaginatedTable'
import { V2ChartCard } from '../components/V2ChartCard'
import { V2FilterBar } from '../components/V2FilterBar'
import { V2KpiGrid } from '../components/V2KpiGrid'
import { V2PageHeader } from '../components/V2PageHeader'

type ScatterPoint = {
  x: number
  y: number
  brand: string
  name: string
}

export const V2SelfPage = () => {
  const monthToStartDate = (month: string) => `${month}-01`
  const monthToEndDate = (month: string) => {
    const [y, m] = month.split('-').map(Number)
    const lastDay = new Date(y, m, 0).getDate()
    return `${month}-${String(lastDay).padStart(2, '0')}`
  }
  const dateToMonth = (date: string) => date.slice(0, 7)

  const [rows, setRows] = useState<SalesRow[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [detail, setDetail] = useState<ProductDetail | null>(null)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [brandOptions, setBrandOptions] = useState<string[]>(['전체'])
  const [brandFilter, setBrandFilter] = useState('전체')
  const [categoryOptions, setCategoryOptions] = useState<string[]>(['전체'])
  const [categoryFilter, setCategoryFilter] = useState('전체')
  const [actualSalesMonths, setActualSalesMonths] = useState<string[]>([])
  const [periodStartDate, setPeriodStartDate] = useState('2025-01-01')
  const [periodEndDate, setPeriodEndDate] = useState('2025-12-31')
  const [showPeriodBar, setShowPeriodBar] = useState(false)

  useEffect(() => {
    api.getSelfSales({
      startDate: periodStartDate,
      endDate: periodEndDate,
      brand: brandFilter === '전체' ? undefined : brandFilter,
      category: categoryFilter === '전체' ? undefined : categoryFilter,
    }).then(setRows)
    setPage(1)
  }, [periodStartDate, periodEndDate, brandFilter, categoryFilter])
  useEffect(() => {
    api.getBrands().then((brands) => setBrandOptions(['전체', ...brands]))
  }, [])
  useEffect(() => {
    api.getCategories().then((categories) => setCategoryOptions(['전체', ...categories]))
  }, [])
  useEffect(() => {
    api.getActualSalesMonths().then(setActualSalesMonths)
  }, [])
  useEffect(() => {
    if (selectedId) {
      api.getProductDetail(selectedId).then(setDetail)
      return
    }
    setDetail(null)
  }, [selectedId])

  const filteredRows = useMemo(() => rows, [rows])

  const periodStartIdx = useMemo(() => {
    const idx = actualSalesMonths.findIndex((month) => month === dateToMonth(periodStartDate))
    return idx === -1 ? 0 : idx
  }, [actualSalesMonths, periodStartDate])

  const periodEndIdx = useMemo(() => {
    const idx = actualSalesMonths.findIndex((month) => month === dateToMonth(periodEndDate))
    return idx === -1 ? Math.max(0, actualSalesMonths.length - 1) : idx
  }, [actualSalesMonths, periodEndDate])

  const setPresetMonths = (months: number) => {
    if (!actualSalesMonths.length) return
    const endIdx = periodEndIdx
    const startIdx = Math.max(0, endIdx - months + 1)
    setPeriodStartDate(monthToStartDate(actualSalesMonths[startIdx]))
    setPeriodEndDate(monthToEndDate(actualSalesMonths[endIdx]))
  }

  const setWholeRange = () => {
    if (!actualSalesMonths.length) return
    setPeriodStartDate(monthToStartDate(actualSalesMonths[0]))
    setPeriodEndDate(monthToEndDate(actualSalesMonths[actualSalesMonths.length - 1]))
  }

  const onStartDateChange = (value: string) => {
    if (!value) return
    if (value > periodEndDate) {
      setPeriodEndDate(value)
    }
    setPeriodStartDate(value)
  }

  const onEndDateChange = (value: string) => {
    if (!value) return
    if (value < periodStartDate) {
      setPeriodStartDate(value)
    }
    setPeriodEndDate(value)
  }

  const onPeriodBarStart = (value: number) => {
    const idx = Math.min(value, periodEndIdx)
    const month = actualSalesMonths[idx]
    if (!month) return
    setPeriodStartDate(monthToStartDate(month))
  }

  const onPeriodBarEnd = (value: number) => {
    const idx = Math.max(value, periodStartIdx)
    const month = actualSalesMonths[idx]
    if (!month) return
    setPeriodEndDate(monthToEndDate(month))
  }

  const startPct = actualSalesMonths.length > 1 ? (periodStartIdx / (actualSalesMonths.length - 1)) * 100 : 0
  const endPct = actualSalesMonths.length > 1 ? (periodEndIdx / (actualSalesMonths.length - 1)) * 100 : 100

  const kpi = useMemo(() => {
    const total = filteredRows.reduce((acc, row) => acc + row.amount, 0)
    const avgRate = filteredRows.length ? filteredRows.reduce((acc, row) => acc + row.opMarginRate, 0) / filteredRows.length : 0
    return { total, avgRate }
  }, [filteredRows])

  const scatterData: ScatterPoint[] = useMemo(
    () => filteredRows.map((r) => ({
      x: r.opMarginRate,
      y: Math.round(r.amount / 1000000),
      brand: r.brand,
      name: r.name,
    })),
    [filteredRows],
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
        <div className={styles.chartTooltipText}>영업이익율: {pct(point.x)}</div>
        <div className={styles.chartTooltipText}>판매액: {point.y}백만</div>
      </div>
    )
  }

  return (
    <section className={styles.page}>
      <V2PageHeader title="" badge="" />

      <V2FilterBar
        title=""
        fields={[
          { label: '시작일', type: 'input', inputType: 'date', value: periodStartDate, onChange: onStartDateChange },
          { label: '종료일', type: 'input', inputType: 'date', value: periodEndDate, onChange: onEndDateChange },
          { label: '브랜드', type: 'select', value: brandFilter, onChange: setBrandFilter, options: brandOptions },
          { label: '카테고리', type: 'select', value: categoryFilter, onChange: setCategoryFilter, options: categoryOptions },
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
            {showPeriodBar && actualSalesMonths.length > 1 && (
              <div className={styles.periodBarWrap}>
                <div className={styles.periodBarLabel}>
                  <span>{actualSalesMonths[0]}</span>
                  <span>{actualSalesMonths[actualSalesMonths.length - 1]}</span>
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
                    max={actualSalesMonths.length - 1}
                    value={periodStartIdx}
                    onChange={(e) => onPeriodBarStart(Number(e.target.value))}
                  />
                  <input
                    className={`${styles.periodRange} ${styles.periodRangeEnd}`}
                    type="range"
                    min={0}
                    max={actualSalesMonths.length - 1}
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
          <V2KpiGrid
            stacked
            items={[
              { label: '총 판매액', value: won(kpi.total) },
              { label: '평균 영업이익율', value: pct(kpi.avgRate) },
            ]}
          />

          <V2ChartCard title="포지셔닝" className={styles.selfChartCard}>
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
          </V2ChartCard>
        </div>

        <PaginatedTable<SalesRow>
          columns={[
            { key: 'rank', header: '순위', cell: (r) => r.rank, align: 'center', sortValue: (r) => r.rank },
            { key: 'brand', header: '브랜드', cell: (r) => r.brand, sortValue: (r) => r.brand },
            { key: 'category', header: '카테고리', cell: (r) => r.category, sortValue: (r) => r.category },
            { key: 'name', header: '상품명', cell: (r) => r.name, sortValue: (r) => r.name },
            { key: 'avgPrice', header: '평균판매가', cell: (r) => won(r.avgPrice), align: 'right', sortValue: (r) => r.avgPrice },
            { key: 'avgCost', header: '평균매입원가', cell: (r) => won(r.avgCost), align: 'right', sortValue: (r) => r.avgCost },
            { key: 'qty', header: '판매량', cell: (r) => c(r.qty), align: 'right', sortValue: (r) => r.qty },
            { key: 'amount', header: '총판매액', cell: (r) => won(r.amount), align: 'right', sortValue: (r) => r.amount },
            { key: 'margin', header: '매출이익율', cell: (r) => pct(r.marginRate), align: 'right', sortValue: (r) => r.marginRate },
            { key: 'op', header: '영업이익률', cell: (r) => pct(r.opMarginRate), align: 'right', sortValue: (r) => r.opMarginRate },
          ]}
          rows={filteredRows}
          page={page}
          pageSize={pageSize}
          onPageChange={(p) => setPage(p)}
          onPageSizeChange={(s) => { setPageSize(s); setPage(1) }}
          onRowClick={(row) => setSelectedId(row.id)}
        />
      </div>

      <ProductInsightDrawer
        detail={detail}
        periodStart={periodStartDate}
        periodEnd={periodEndDate}
        onClose={() => { setSelectedId(null); setDetail(null) }}
      />
    </section>
  )
}
