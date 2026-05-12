import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { CartesianGrid, Scatter, ScatterChart, Tooltip, XAxis, YAxis } from 'recharts'
import { getCompetitorSales, getSecondaryCompetitorChannels } from '../../api'
import type { SecondaryCompetitorChannel } from '../../api/types'
import type { CompetitorSalesRow } from '../../types'
import type { AdjacentDirection } from '../../utils/adjacentListNavigation'
import { adjacentIdInOrder } from '../../utils/adjacentListNavigation'
import { clampForecastMonths, readForecastMonthsFromStorage, writeForecastMonthsToStorage } from '../../utils/forecastMonthsStorage'
import { formatGroupedNumber } from '../../utils/format'
import { CopyToastBanner } from '../components/CopyToastBanner'
import { useCopyToastMessage } from '../components/useCopyToastMessage'
import { ProductDrawer } from '../components/product-drawer/ProductDrawer'
import styles from '../components/common.module.css'
import { AnalysisList } from '../components/AnalysisList'
import { AnalysisPeriodTools } from '../components/AnalysisPeriodTools'
import { ChartCard } from '../components/ChartCard'
import { FilterBar, type FilterField } from '../components/FilterBar'
import { KpiGrid } from '../components/KpiGrid'
import { useElementSize } from '../hooks/useElementSize'
import { useAnalysisSalesFilters } from '../hooks/useAnalysisSalesFilters'
import { useProductDrawerBundle } from '../hooks/useProductDrawerBundle'

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
  const summaryBundle = useProductDrawerBundle(selectedId)
  const { ref: chartBodyRef, width: chartWidth, height: chartHeight, ready: chartReady } = useElementSize<HTMLDivElement>()

  const onForecastMonthsChange = useCallback((n: number) => {
    const v = clampForecastMonths(n)
    setForecastMonths(v)
    writeForecastMonthsToStorage(v)
  }, [])

  const [channels, setChannels] = useState<SecondaryCompetitorChannel[]>([])
  const [competitorChannelLabel, setCompetitorChannelLabel] = useState('전체')
  const [showRowsWithSelfSalesOnly, setShowRowsWithSelfSalesOnly] = useState(false)
  const channelsReqSeqRef = useRef(0)
  const salesReqSeqRef = useRef(0)
  const {
    filterFields,
    historicalMonths,
    salesParams,
    showPeriodBar,
    setShowPeriodBar,
    periodStartDate,
    periodEndDate,
    periodStartIdx,
    periodEndIdx,
    startPct,
    endPct,
    setPresetMonths,
    setWholeRange,
    onPeriodBarStart,
    onPeriodBarEnd,
  } = useAnalysisSalesFilters()

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
      ...salesParams,
      competitorChannelId,
    }).then((data) => {
      if (!alive) return
      if (reqSeq !== salesReqSeqRef.current) return
      setRows(data)
    })
    return () => {
      alive = false
    }
  }, [salesParams, competitorChannelId])

  const channelOptions = useMemo(
    () => ['전체', ...channels.map((ch) => ch.label)],
    [channels],
  )
  const competitorFilterFields = useMemo<FilterField[]>(() => [
    ...filterFields,
    {
      label: '경쟁 채널',
      kind: 'select',
      value: competitorChannelLabel,
      onChange: setCompetitorChannelLabel,
      options: channelOptions,
    },
  ], [filterFields, competitorChannelLabel, channelOptions])
  const competitorTooltipLabel = competitorChannelLabel === '전체'
    ? '전체 경쟁사'
    : competitorChannelLabel

  const visibleRows = useMemo(
    () => (showRowsWithSelfSalesOnly ? rows.filter((row) => row.selfQty != null) : rows),
    [rows, showRowsWithSelfSalesOnly],
  )

  const kpi = useMemo(() => {
    const totalCompetitorAmount = visibleRows.reduce((acc, row) => acc + row.competitorAmount, 0)
    const totalSelfAmount = visibleRows.reduce((acc, row) => acc + (row.selfAmount ?? 0), 0)
    const totalCompetitorQty = visibleRows.reduce((acc, row) => acc + row.competitorQty, 0)
    const totalSelfQty = visibleRows.reduce((acc, row) => acc + (row.selfQty ?? 0), 0)
    return { totalCompetitorAmount, totalSelfAmount, totalCompetitorQty, totalSelfQty }
  }, [visibleRows])

  const qtyScatterData: QtyScatterPoint[] = useMemo(
    () => visibleRows
      .filter((r) => r.selfQty != null)
      .map((r) => {
        const selfQty = r.selfQty ?? 0
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
          `차트 X(자사 판매량 EA): ${formatGroupedNumber(selfQty)}`,
          `차트 Y(경쟁 판매량 EA): ${formatGroupedNumber(r.competitorQty)}`,
        ].join('\n')
        return {
          x: selfQty,
          y: r.competitorQty,
          brand: r.brand,
          category: r.category,
          productCode: r.productCode,
          name: r.name,
          copyText,
        }
      }),
    [visibleRows, periodStartDate, periodEndDate, competitorTooltipLabel],
  )

  const navigationOrderIds = useMemo(() => visibleRows.map((r) => r.id), [visibleRows])

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
          자사 판매량:{' '}
          <span style={{ color: '#2563eb', fontWeight: 600 }}>{formatGroupedNumber(point.x)} EA</span>
        </div>
        <div className={styles.chartTooltipText}>
          {competitorTooltipLabel} 판매량:{' '}
          <span style={{ color: '#ef4444', fontWeight: 600 }}>{formatGroupedNumber(point.y)} EA</span>
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
        fields={competitorFilterFields}
        extraContent={(
          <AnalysisPeriodTools
            showPeriodBar={showPeriodBar}
            historicalMonths={historicalMonths}
            periodStartIdx={periodStartIdx}
            periodEndIdx={periodEndIdx}
            startPct={startPct}
            endPct={endPct}
            setPresetMonths={setPresetMonths}
            setWholeRange={setWholeRange}
            onTogglePeriodBar={() => setShowPeriodBar((prev) => !prev)}
            onPeriodBarStart={onPeriodBarStart}
            onPeriodBarEnd={onPeriodBarEnd}
            endControl={(
              <label className={styles.periodPresetRowToggle}>
                <input
                  type="checkbox"
                  checked={showRowsWithSelfSalesOnly}
                  onChange={(event) => setShowRowsWithSelfSalesOnly(event.target.checked)}
                />
                <span>자사판매량이 존재하는 경우만 보기</span>
              </label>
            )}
          />
        )}
      />

      <div className={`${styles.twoCol} ${styles.selfTwoCol}`}>
        <div className={`${styles.leftCol} ${styles.selfLeftCol}`}>
          <KpiGrid
            stacked
            items={[
              { label: '총 경쟁사 판매액', value: formatGroupedNumber(kpi.totalCompetitorAmount), unit: '원' },
              { label: '총 자사 판매액', value: formatGroupedNumber(kpi.totalSelfAmount), unit: '원' },
              { label: '총 경쟁사 판매량', value: formatGroupedNumber(kpi.totalCompetitorQty), unit: 'EA' },
              { label: '총 자사 판매량', value: formatGroupedNumber(kpi.totalSelfQty), unit: 'EA' },
            ]}
          />

          <ChartCard title="경쟁·자사 판매량 비교" className={styles.selfChartCard}>
            <div ref={chartBodyRef} className={styles.selfChartBody}>
              {chartReady ? (
                <ScatterChart width={scatterChartWidth} height={scatterChartHeight} data={qtyScatterData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" dataKey="x" name="자사 판매량(EA)" tick={{ fontSize: 10 }} />
                  <YAxis
                    type="number"
                    dataKey="y"
                    name="경쟁사 판매량(EA)"
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
            { key: 'brand', header: '브랜드', cell: (r) => r.brand, width: '8.5%', sortValue: (r) => r.brand },
            { key: 'category', header: '카테고리', cell: (r) => r.category, sortValue: (r) => r.category },
            { key: 'productCode', header: '코드', cell: (r) => r.productCode, sortValue: (r) => r.productCode },
            { key: 'name', header: '상품명', cell: (r) => r.name, sortValue: (r) => r.name },
            { key: 'competitorAvgPrice', header: '경쟁 평균가', cell: (r) => formatGroupedNumber(r.competitorAvgPrice), align: 'right', sortValue: (r) => r.competitorAvgPrice },
            { key: 'selfAvgPrice', header: '자사 평균가', cell: (r) => (r.selfAvgPrice != null ? formatGroupedNumber(r.selfAvgPrice) : '—'), align: 'right', sortValue: (r) => r.selfAvgPrice ?? 0 },
            { key: 'competitorQty', header: '경쟁 판매량', cell: (r) => formatGroupedNumber(r.competitorQty), align: 'right', sortValue: (r) => r.competitorQty },
            { key: 'selfQty', header: '자사 판매량', cell: (r) => (r.selfQty != null ? formatGroupedNumber(r.selfQty) : '—'), align: 'right', sortValue: (r) => r.selfQty ?? 0 },
            { key: 'competitorAmount', header: '경쟁 판매액', cell: (r) => formatGroupedNumber(r.competitorAmount), align: 'right', sortValue: (r) => r.competitorAmount },
            { key: 'selfAmount', header: '자사 판매액', cell: (r) => (r.selfAmount != null ? formatGroupedNumber(r.selfAmount) : '—'), align: 'right', sortValue: (r) => r.selfAmount ?? 0 },
          ]}
          rows={visibleRows}
          defaultSort={{ key: 'competitorQty', dir: 'desc' }}
          onRowClick={(row) => setSelectedId(row.id)}
        />
      </div>

      <ProductDrawer
        summary={summaryBundle?.summary ?? null}
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
