import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { CartesianGrid, Scatter, ScatterChart, Tooltip, XAxis, YAxis } from 'recharts'
import { getCompetitorSales, getSecondaryCompetitorChannels, getSelfSalesFilterMeta } from '../../api'
import type { SecondaryCompetitorChannel } from '../../api/types'
import type { CompetitorSalesRow } from '../../types'
import type { AdjacentDirection } from '../../utils/adjacentListNavigation'
import { adjacentIdInOrder } from '../../utils/adjacentListNavigation'
import { clampForecastMonths, readForecastMonthsFromStorage, writeForecastMonthsToStorage } from '../../utils/forecastMonthsStorage'
import { formatGroupedNumber, formatPercent } from '../../utils/format'
import { CopyToastBanner, useCopyToastMessage } from '../components/CopyToastBanner'
import { ProductSummaryDrawer } from '../components/ProductSummaryDrawer'
import styles from '../components/common.module.css'
import { AnalysisList } from '../components/AnalysisList'
import { ChartCard } from '../components/ChartCard'
import { FilterBar } from '../components/FilterBar'
import { KpiGrid } from '../components/KpiGrid'
import { useElementSize } from '../hooks/useElementSize'
import { useProductDrawerBundle } from '../hooks/useProductDrawerBundle'
import { usePeriodRangeFilter } from '../hooks/usePeriodRangeFilter'

type QtyScatterPoint = {
  x: number
  y: number
  brand: string
  category: string
  productCode: string
  name: string
  copyText: string
}

export const CompetitorPage = () => {
  const [rows, setRows] = useState<CompetitorSalesRow[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const { toastMessage, copyAndNotify } = useCopyToastMessage()
  const [forecastMonths, setForecastMonths] = useState(() => readForecastMonthsFromStorage())
  const summaryBundle = useProductDrawerBundle(selectedId, forecastMonths)
  const { ref: chartBodyRef, width: chartWidth, height: chartHeight, ready: chartReady } = useElementSize<HTMLDivElement>()

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
  const [productNameOptions, setProductNameOptions] = useState<string[]>(['전체'])
  const [productNameFilter, setProductNameFilter] = useState('전체')
  const [historicalMonths, setHistoricalMonths] = useState<string[]>([])
  const [showPeriodBar, setShowPeriodBar] = useState(false)
  const channelsReqSeqRef = useRef(0)
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

  const competitorChannelId = useMemo(() => {
    if (competitorChannelLabel === '전체') return undefined
    return channels.find((ch) => ch.label === competitorChannelLabel)?.id
  }, [channels, competitorChannelLabel])

  useEffect(() => {
    let alive = true
    const reqSeq = ++channelsReqSeqRef.current
    void getSecondaryCompetitorChannels().then((data) => {
      if (!alive) return
      if (reqSeq !== channelsReqSeqRef.current) return
      setChannels(data)
    })
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    let alive = true
    const reqSeq = ++salesReqSeqRef.current
    void getCompetitorSales({
      startDate: periodStartDate,
      endDate: periodEndDate,
      brand: brandFilter === '전체' ? undefined : brandFilter,
      category: categoryFilter === '전체' ? undefined : categoryFilter,
      nameQuery:
        productNameFilter === '전체' || !productNameFilter.trim()
          ? undefined
          : productNameFilter.trim(),
      competitorChannelId,
    }).then((data) => {
      if (!alive) return
      if (reqSeq !== salesReqSeqRef.current) return
      setRows(data)
    })
    return () => {
      alive = false
    }
  }, [periodStartDate, periodEndDate, brandFilter, categoryFilter, competitorChannelId])

  useEffect(() => {
    let alive = true
    const reqSeq = ++metaReqSeqRef.current
    void getSelfSalesFilterMeta().then(({ brands, categories, productNames, historicalMonths: months }) => {
      if (!alive) return
      if (reqSeq !== metaReqSeqRef.current) return
      setBrandOptions(['전체', ...brands])
      setCategoryOptions(['전체', ...categories])
      setProductNameOptions(['전체', ...productNames])
      setHistoricalMonths(months)
    })
    return () => {
      alive = false
    }
  }, [])

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
      .map((r) => {
        const selfQty = r.selfQty ?? 0
        const gapAmt = r.competitorAmount - (r.selfAmount ?? 0)
        const copyText = [
          '[경쟁사 분석 · 경쟁·자사 판매량 비교]',
          `기간: ${periodStartDate} ~ ${periodEndDate}`,
          `경쟁 채널: ${competitorTooltipLabel}`,
          `브랜드: ${r.brand}`,
          `카테고리: ${r.category}`,
          `상품코드: ${r.productCode}`,
          `상품명: ${r.name}`,
          `경쟁 평균가(원): ${formatGroupedNumber(r.competitorAvgPrice)}`,
          `경쟁 판매량(EA): ${formatGroupedNumber(r.competitorQty)}`,
          `경쟁 판매액(원): ${formatGroupedNumber(r.competitorAmount)}`,
          `자사 평균가(원): ${r.selfAvgPrice != null ? formatGroupedNumber(r.selfAvgPrice) : '—'}`,
          `자사 판매량(EA): ${formatGroupedNumber(selfQty)}`,
          `자사 판매액(원): ${r.selfAmount != null ? formatGroupedNumber(r.selfAmount) : '—'}`,
          `갭(경쟁−자사, 원): ${gapAmt > 0 ? '+' : ''}${formatGroupedNumber(gapAmt)}`,
          `차트 X(경쟁 판매량 EA): ${formatGroupedNumber(r.competitorQty)}`,
          `차트 Y(자사 판매량 EA): ${formatGroupedNumber(selfQty)}`,
        ].join('\n')
        return {
          x: r.competitorQty,
          y: selfQty,
          brand: r.brand,
          category: r.category,
          productCode: r.productCode,
          name: r.name,
          copyText,
        }
      }),
    [rows, periodStartDate, periodEndDate, competitorTooltipLabel],
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
          <span style={{ color: '#ef4444', fontWeight: 600 }}>{formatGroupedNumber(point.x)} EA</span>
        </div>
        <div className={styles.chartTooltipText}>
          자사 판매량:{' '}
          <span style={{ color: '#2563eb', fontWeight: 600 }}>{formatGroupedNumber(point.y)} EA</span>
        </div>
        <div className={styles.chartTooltipHint}>클릭 시 클립보드에 복사</div>
      </div>
    )
  }

  const qtyScatterShape = useCallback(
    (props: { cx?: number; cy?: number; payload?: QtyScatterPoint }) => {
      const { cx, cy, payload } = props
      if (cx == null || cy == null || !payload) return null
      return (
        <circle
          cx={cx}
          cy={cy}
          r={5}
          fill="#3b82f6"
          style={{ cursor: 'pointer' }}
          onClick={(e) => {
            e.stopPropagation()
            void copyAndNotify(payload.copyText)
          }}
        />
      )
    },
    [copyAndNotify],
  )

  const scatterChartWidth = Math.max(1, Math.floor(chartWidth))
  const scatterChartHeight = Math.max(1, Math.floor(chartHeight))

  return (
    <section className={styles.page}>
      <CopyToastBanner message={toastMessage} />
      <FilterBar
        title=""
        filterClassName={styles.filterAnalysisGrid}
        fields={[
          { label: '시작일', kind: 'input', inputType: 'date', value: periodStartDate, onChange: onStartDateChange },
          { label: '종료일', kind: 'input', inputType: 'date', value: periodEndDate, onChange: onEndDateChange },
          { label: '브랜드', kind: 'listCombo', inputType: 'text', value: brandFilter, onChange: setBrandFilter, options: brandOptions },
          { label: '카테고리', kind: 'listCombo', inputType: 'text', value: categoryFilter, onChange: setCategoryFilter, options: categoryOptions },
          { label: '상품명', kind: 'listCombo', inputType: 'text', value: productNameFilter, onChange: setProductNameFilter, options: productNameOptions },
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
              { label: '총 경쟁 판매액', value: formatGroupedNumber(kpi.totalCompetitor) },
              { label: '자사 대비 평균 갭률', value: formatPercent(kpi.avgGapRate * 100) },
            ]}
          />

          <ChartCard title="경쟁·자사 판매량 비교" className={styles.selfChartCard}>
            <div ref={chartBodyRef} className={styles.selfChartBody}>
              {chartReady ? (
                <ScatterChart width={scatterChartWidth} height={scatterChartHeight} data={qtyScatterData}>
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
                  <Scatter fill="#3b82f6" shape={qtyScatterShape} />
                </ScatterChart>
              ) : null}
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
            { key: 'competitorAvgPrice', header: '경쟁 평균가', cell: (r) => formatGroupedNumber(r.competitorAvgPrice), align: 'right', sortValue: (r) => r.competitorAvgPrice },
            { key: 'competitorQty', header: '경쟁 판매량', cell: (r) => formatGroupedNumber(r.competitorQty), align: 'right', sortValue: (r) => r.competitorQty },
            { key: 'competitorAmount', header: '경쟁 판매액', cell: (r) => formatGroupedNumber(r.competitorAmount), align: 'right', sortValue: (r) => r.competitorAmount },
            { key: 'selfAmount', header: '자사 판매액', cell: (r) => (r.selfAmount != null ? formatGroupedNumber(r.selfAmount) : '—'), align: 'right', sortValue: (r) => r.selfAmount ?? 0 },
            { key: 'gap', header: '갭(액)', cell: (r) => {
              const gap = r.competitorAmount - (r.selfAmount ?? 0)
              return gap > 0 ? `+${formatGroupedNumber(gap)}` : formatGroupedNumber(gap)
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
        onRequestNavigateAdjacent={onRequestNavigateAdjacent}
      />
    </section>
  )
}
