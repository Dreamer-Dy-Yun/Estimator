import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { CartesianGrid, Scatter, ScatterChart, Tooltip, XAxis, YAxis } from 'recharts'
import { getCompetitorSales, getCompetitorSalesScatterGrid, getSecondaryCompetitorChannels } from '../../api'
import type { SecondaryCompetitorChannel } from '../../api/types'
import type { CompetitorSalesRow } from '../../types'
import type { AdjacentDirection } from '../../utils/adjacentListNavigation'
import { adjacentIdInOrder } from '../../utils/adjacentListNavigation'
import { clampForecastMonths, readForecastMonthsFromStorage, writeForecastMonthsToStorage } from '../../utils/forecastMonthsStorage'
import { formatGroupedNumber } from '../../utils/format'
import { getScatterGridCellColor, getScatterGridCellPointRadius } from '../../utils/scatterGridDisplay'
import { AnalysisCandidateBulkAddModal } from '../components/candidate-stash/AnalysisCandidateBulkAddModal'
import { ProductDrawer } from '../components/product-drawer/ProductDrawer'
import styles from '../components/common.module.css'
import { AnalysisList } from '../components/AnalysisList'
import { AnalysisPeriodTools } from '../components/AnalysisPeriodTools'
import { ChartCard } from '../components/ChartCard'
import { FilterBar } from '../components/FilterBar'
import { KpiGrid } from '../components/KpiGrid'
import { useElementSize } from '../hooks/useElementSize'
import { maskNonPeriodAnalysisFilterFields, useAnalysisSalesFilters } from '../hooks/useAnalysisSalesFilters'
import type { FilterField } from '../model/filterField'
import { useProductDrawerBundle } from '../hooks/useProductDrawerBundle'
import type { ScatterSalesGridResponse } from '../../api/types'

type CompetitorScatterGridPoint = {
  x: number
  y: number
  cellKey: string
  count: number
  xStart: number
  xEnd: number
  yStart: number
  yEnd: number
  hasMoreSkuIds: boolean
  color: string
}

export const CompetitorPage = () => {
  const [rows, setRows] = useState<CompetitorSalesRow[]>([])
  const [scatterGrid, setScatterGrid] = useState<ScatterSalesGridResponse | null>(null)
  const [selectedSkuGroupKey, setSelectedSkuGroupKey] = useState<string | null>(null)
  const [activeGridCellKey, setActiveGridCellKey] = useState<string | null>(null)
  const [bulkSelectedSkuGroupKeys, setBulkSelectedSkuGroupKeys] = useState<Set<string>>(() => new Set())
  const [bulkAddOpen, setBulkAddOpen] = useState(false)
  const [forecastMonths, setForecastMonths] = useState(() => readForecastMonthsFromStorage())
  const summaryBundle = useProductDrawerBundle(selectedSkuGroupKey)
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
  const scatterGridReqSeqRef = useRef(0)
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

  useEffect(() => {
    let alive = true
    const reqSeq = ++scatterGridReqSeqRef.current
    void getCompetitorSalesScatterGrid({
      ...salesParams,
      competitorChannelId,
    }).then((data) => {
      if (!alive) return
      if (reqSeq !== scatterGridReqSeqRef.current) return
      setScatterGrid(data)
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
  const displayedCompetitorFilterFields = useMemo(
    () => (activeGridCellKey ? maskNonPeriodAnalysisFilterFields(competitorFilterFields) : competitorFilterFields),
    [activeGridCellKey, competitorFilterFields],
  )

  const competitorTooltipLabel = competitorChannelLabel === '전체'
    ? '전체 경쟁사'
    : competitorChannelLabel
  const competitorAxisLabel = competitorTooltipLabel

  const baseRows = useMemo(
    () => (showRowsWithSelfSalesOnly ? rows.filter((row) => row.selfQty != null) : rows),
    [rows, showRowsWithSelfSalesOnly],
  )

  const activeGridCellSkuIds = useMemo(() => {
    if (!activeGridCellKey || !scatterGrid) return null
    const target = scatterGrid.cells.find((cell) => cell.cellKey === activeGridCellKey)
    if (!target) return null
    return new Set(target.skuIds)
  }, [activeGridCellKey, scatterGrid])

  const visibleRows = useMemo(
    () => (activeGridCellSkuIds == null
      ? baseRows
      : baseRows.filter((row) => activeGridCellSkuIds.has(row.skuGroupKey))),
    [activeGridCellSkuIds, baseRows],
  )

  useEffect(() => {
    if (!activeGridCellKey) return
    if (!scatterGrid?.cells.some((cell) => cell.cellKey === activeGridCellKey)) {
      setActiveGridCellKey(null)
    }
  }, [activeGridCellKey, scatterGrid])

  useEffect(() => {
    if (!selectedSkuGroupKey) return
    if (!visibleRows.some((row) => row.skuGroupKey === selectedSkuGroupKey)) {
      setSelectedSkuGroupKey(null)
    }
  }, [selectedSkuGroupKey, visibleRows])

  const kpi = useMemo(() => {
    const totalCompetitorAmount = visibleRows.reduce((acc, row) => acc + row.competitorAmount, 0)
    const totalSelfAmount = visibleRows.reduce((acc, row) => acc + (row.selfAmount ?? 0), 0)
    const totalCompetitorQty = visibleRows.reduce((acc, row) => acc + row.competitorQty, 0)
    const totalSelfQty = visibleRows.reduce((acc, row) => acc + (row.selfQty ?? 0), 0)
    return { totalCompetitorAmount, totalSelfAmount, totalCompetitorQty, totalSelfQty }
  }, [visibleRows])

  const maxScatterGridCount = useMemo(
    () => Math.max(0, ...(scatterGrid?.cells ?? []).map((cell) => cell.count)),
    [scatterGrid],
  )

  const scatterData: CompetitorScatterGridPoint[] = useMemo(
    () => (scatterGrid?.cells ?? []).map((cell) => ({
      x: cell.representativeX,
      y: cell.representativeY,
      cellKey: cell.cellKey,
      count: cell.count,
      xStart: cell.xStart,
      xEnd: cell.xEnd,
      yStart: cell.yStart,
      yEnd: cell.yEnd,
      hasMoreSkuIds: cell.hasMoreSkuIds,
      color: getScatterGridCellColor(cell.count, maxScatterGridCount),
    })),
    [maxScatterGridCount, scatterGrid],
  )

  const navigationOrderIds = useMemo(() => visibleRows.map((r) => r.skuGroupKey), [visibleRows])
  const bulkSelectedCount = bulkSelectedSkuGroupKeys.size
  const allVisibleRowsSelected = visibleRows.length > 0 && bulkSelectedCount === visibleRows.length
  const selectedSkuGroupKeys = useMemo(() => [...bulkSelectedSkuGroupKeys], [bulkSelectedSkuGroupKeys])

  useEffect(() => {
    setBulkSelectedSkuGroupKeys((prev) => {
      const available = new Set(visibleRows.map((row) => row.skuGroupKey))
      const next = new Set([...prev].filter((id) => available.has(id)))
      return next.size === prev.size ? prev : next
    })
  }, [visibleRows])

  const onRequestNavigateAdjacent = useCallback(
    (direction: AdjacentDirection) => {
      if (!selectedSkuGroupKey) return
      const nextId = adjacentIdInOrder(navigationOrderIds, selectedSkuGroupKey, direction)
      if (nextId != null && nextId !== selectedSkuGroupKey) setSelectedSkuGroupKey(nextId)
    },
    [navigationOrderIds, selectedSkuGroupKey],
  )

  const renderQtyScatterTooltip = (props: {
    active?: boolean
    payload?: ReadonlyArray<{ payload?: CompetitorScatterGridPoint }>
  }) => {
    const { active, payload } = props
    if (!active || !payload?.length) return null
    const point = payload[0]?.payload
    if (!point) return null

    return (
      <div className={styles.chartTooltip}>
        <div className={styles.chartTooltipTitle}>격자 셀</div>
        <div className={styles.chartTooltipText}>
          자사 판매량: {formatGroupedNumber(point.xStart)} ~ {formatGroupedNumber(point.xEnd)}
        </div>
        <div className={styles.chartTooltipText}>
          {competitorAxisLabel} 판매량: {formatGroupedNumber(point.yStart)} ~ {formatGroupedNumber(point.yEnd)}
        </div>
        <div className={styles.chartTooltipText}>건수: {formatGroupedNumber(point.count)} EA</div>
        {point.hasMoreSkuIds ? (
          <div className={styles.chartTooltipText}>셀 제한으로 일부 상품만 표시</div>
        ) : null}
        <div className={styles.chartTooltipHint}>
          클릭 시 셀 내 상품만 표시
        </div>
      </div>
    )
  }

  const onScatterCellClick = useCallback((cellKey: string) => {
    setActiveGridCellKey((prev) => (prev === cellKey ? null : cellKey))
  }, [])

  const toggleBulkRow = (id: string) => {
    setBulkSelectedSkuGroupKeys((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleAllVisibleRows = () => {
    setBulkSelectedSkuGroupKeys(() => (
      allVisibleRowsSelected ? new Set() : new Set(visibleRows.map((row) => row.skuGroupKey))
    ))
  }

  const scatterChartWidth = Math.max(1, Math.floor(chartWidth))
  const scatterChartHeight = Math.max(1, Math.floor(chartHeight))
  const scatterPointRadius = getScatterGridCellPointRadius(scatterGrid?.meta, scatterChartWidth, scatterChartHeight)

  const qtyScatterShape = useCallback(
    (props: { cx?: number; cy?: number; payload?: CompetitorScatterGridPoint }) => {
      const { cx, cy, payload } = props
      if (cx == null || cy == null || !payload) return null
      const isActive = payload.cellKey === activeGridCellKey
      return (
        <circle
          cx={cx}
          cy={cy}
          r={scatterPointRadius}
          fill={payload.color}
          stroke={isActive ? '#0f172a' : '#ffffff'}
          strokeWidth={isActive ? 1.75 : 0.75}
          style={{ cursor: 'pointer' }}
          onClick={(e) => {
            e.stopPropagation()
            onScatterCellClick(payload.cellKey)
          }}
        />
      )
    },
    [activeGridCellKey, onScatterCellClick, scatterPointRadius],
  )

  return (
    <section className={styles.page}>
      <FilterBar
        title=""
        filterClassName={styles.filterAnalysisGrid}
        fields={displayedCompetitorFilterFields}
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
              <div className={styles.periodPresetRowEndGroup}>
                <label className={styles.periodPresetRowToggle}>
                  <input
                    type="checkbox"
                    checked={showRowsWithSelfSalesOnly}
                    onChange={(event) => setShowRowsWithSelfSalesOnly(event.target.checked)}
                  />
                  <span>자사판매량이 존재하는 경우만 보기</span>
                </label>
                <button
                  type="button"
                  className={`${styles.actionBtn} ${styles.btnPrimary} ${styles.analysisBulkAddButton}`}
                  onClick={() => setBulkAddOpen(true)}
                  disabled={bulkSelectedCount === 0}
                >
                  선택한 물품을 후보군으로
                </button>
              </div>
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

          <ChartCard
            title="경쟁·자사 판매량 비교"
            className={styles.selfChartCard}
            titleAction={(
              <button
                type="button"
                className={`${styles.actionBtn} ${styles.btnNeutral} ${styles.chartClearSelectionButton} ${
                  activeGridCellKey ? '' : styles.chartActionHidden
                }`}
                aria-hidden={!activeGridCellKey}
                disabled={!activeGridCellKey}
                tabIndex={activeGridCellKey ? 0 : -1}
                onClick={() => setActiveGridCellKey(null)}
              >
                격자 선택 해제
              </button>
            )}
          >
            <div ref={chartBodyRef} className={styles.selfChartBody}>
              {chartReady ? (
                <ScatterChart
                  width={scatterChartWidth}
                  height={scatterChartHeight}
                  data={scatterData}
                  margin={{ top: 8, right: 8, bottom: 22, left: 8 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    type="number"
                    dataKey="x"
                    name="자사 판매량(EA)"
                    tick={{ fontSize: 10 }}
                    label={{
                      value: '자사',
                      position: 'insideBottom',
                      offset: -10,
                      style: { fill: '#2563eb', fontSize: 11, fontWeight: 600 },
                    }}
                  />
                  <YAxis
                    type="number"
                    dataKey="y"
                    name={`${competitorAxisLabel} 판매량(EA)`}
                    tick={{ fontSize: 10 }}
                    width={38}
                    tickMargin={4}
                    label={{
                      value: competitorAxisLabel,
                      angle: -90,
                      position: 'insideLeft',
                      offset: 0,
                      style: { fill: '#ef4444', fontSize: 11, fontWeight: 600 },
                    }}
                  />
                  <Tooltip content={renderQtyScatterTooltip} />
                  <Scatter fill="#f59e0b" shape={qtyScatterShape} />
                </ScatterChart>
              ) : null}
            </div>
          </ChartCard>
        </div>

        <AnalysisList<CompetitorSalesRow>
          columns={[
            {
              key: 'bulkSelect',
              header: (
                <input
                  type="checkbox"
                  checked={allVisibleRowsSelected}
                  disabled={visibleRows.length === 0}
                  aria-label="전체 선택"
                  onChange={toggleAllVisibleRows}
                />
              ),
              cell: (r) => (
                <input
                  type="checkbox"
                  checked={bulkSelectedSkuGroupKeys.has(r.skuGroupKey)}
                  aria-label={`${r.productName} 선택`}
                  onClick={(event) => event.stopPropagation()}
                  onChange={() => toggleBulkRow(r.skuGroupKey)}
                />
              ),
              align: 'center',
              width: '42px',
              sortable: false,
            },
            { key: 'rank', header: '순위', cell: (r) => r.rank, align: 'center', sortValue: (r) => r.rank },
            { key: 'brand', header: '브랜드', cell: (r) => r.brand, width: '8.5%', sortValue: (r) => r.brand },
            { key: 'category', header: '카테고리', cell: (r) => r.category, sortValue: (r) => r.category },
            { key: 'code', header: '품번', cell: (r) => r.code, sortValue: (r) => r.code },
            { key: 'productName', header: '상품명', cell: (r) => r.productName, sortValue: (r) => r.productName },
            { key: 'colorCode', header: '색상', cell: (r) => r.colorCode, sortValue: (r) => r.colorCode },
            { key: 'competitorAvgPrice', header: '경쟁 평균가', cell: (r) => formatGroupedNumber(r.competitorAvgPrice), align: 'right', sortValue: (r) => r.competitorAvgPrice },
            { key: 'selfAvgPrice', header: '자사 평균가', cell: (r) => (r.selfAvgPrice != null ? formatGroupedNumber(r.selfAvgPrice) : '—'), align: 'right', sortValue: (r) => r.selfAvgPrice ?? 0 },
            { key: 'competitorQty', header: '경쟁 판매량', cell: (r) => formatGroupedNumber(r.competitorQty), align: 'right', sortValue: (r) => r.competitorQty },
            { key: 'selfQty', header: '자사 판매량', cell: (r) => (r.selfQty != null ? formatGroupedNumber(r.selfQty) : '—'), align: 'right', sortValue: (r) => r.selfQty ?? 0 },
            { key: 'competitorAmount', header: '경쟁 판매액', cell: (r) => formatGroupedNumber(r.competitorAmount), align: 'right', sortValue: (r) => r.competitorAmount },
            { key: 'selfAmount', header: '자사 판매액', cell: (r) => (r.selfAmount != null ? formatGroupedNumber(r.selfAmount) : '—'), align: 'right', sortValue: (r) => r.selfAmount ?? 0 },
          ]}
          rows={visibleRows}
          defaultSort={{ key: 'competitorQty', dir: 'desc' }}
          onRowClick={(row) => setSelectedSkuGroupKey(row.skuGroupKey)}
          onRowKeyDown={(row, event) => {
            if (event.key !== 'ArrowLeft') return
            event.preventDefault()
            setSelectedSkuGroupKey(row.skuGroupKey)
          }}
        />
      </div>

      <ProductDrawer
        summary={summaryBundle?.summary ?? null}
        periodStart={periodStartDate}
        periodEnd={periodEndDate}
        forecastMonths={forecastMonths}
        onForecastMonthsChange={onForecastMonthsChange}
        onClose={() => setSelectedSkuGroupKey(null)}
        onRequestNavigateAdjacent={onRequestNavigateAdjacent}
        secondaryEnabled={false}
      />

      <AnalysisCandidateBulkAddModal
        open={bulkAddOpen}
        skuGroupKeys={selectedSkuGroupKeys}
        periodStart={periodStartDate}
        periodEnd={periodEndDate}
        forecastMonths={forecastMonths}
        onClose={() => setBulkAddOpen(false)}
        onDone={() => {
          setBulkAddOpen(false)
          setBulkSelectedSkuGroupKeys(new Set())
        }}
      />
    </section>
  )
}
