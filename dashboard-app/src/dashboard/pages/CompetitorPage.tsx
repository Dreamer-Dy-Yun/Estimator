import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
import { AnalysisPeriodTools } from '../components/AnalysisPeriodTools'
import {
  AnalysisScatterChartCard,
  type AnalysisScatterGridPoint,
} from '../components/AnalysisScatterChartCard'
import { CompetitorAnalysisList } from '../components/CompetitorAnalysisList'
import { CompetitorFilterEndControls } from '../components/CompetitorFilterEndControls'
import { CompetitorKpiGrid } from '../components/CompetitorKpiGrid'
import { FilterBar } from '../components/FilterBar'
import { useElementSize } from '../hooks/useElementSize'
import { maskNonPeriodAnalysisFilterFields, useAnalysisSalesFilters } from '../hooks/useAnalysisSalesFilters'
import type { FilterField } from '../model/filterField'
import { useAnalysisVisibleSelection } from '../hooks/useAnalysisVisibleSelection'
import { useProductDrawerBundle } from '../hooks/useProductDrawerBundle'
import type { ScatterSalesGridResponse } from '../../api/types'

export const CompetitorPage = () => {
  const [rows, setRows] = useState<CompetitorSalesRow[]>([])
  const [scatterGrid, setScatterGrid] = useState<ScatterSalesGridResponse | null>(null)
  const [bulkAddOpen, setBulkAddOpen] = useState(false)
  const [forecastMonths, setForecastMonths] = useState(() => readForecastMonthsFromStorage())
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
  const competitorTooltipLabel = competitorChannelLabel === '전체'
    ? '전체 경쟁사'
    : competitorChannelLabel
  const competitorAxisLabel = competitorTooltipLabel

  const baseRows = useMemo(
    () => (showRowsWithSelfSalesOnly ? rows.filter((row) => row.selfQty != null) : rows),
    [rows, showRowsWithSelfSalesOnly],
  )
  const {
    activeGridCellKey,
    selectedSkuGroupKey,
    bulkSelectedSkuGroupKeys,
    visibleRows,
    navigationOrderIds,
    bulkSelectedCount,
    allVisibleRowsSelected,
    selectedSkuGroupKeys,
    setSelectedSkuGroupKey,
    onScatterCellClick,
    clearActiveGridCell,
    toggleBulkRow,
    toggleAllVisibleRows,
    clearBulkSelection,
  } = useAnalysisVisibleSelection(baseRows, scatterGrid)
  const summaryBundle = useProductDrawerBundle(selectedSkuGroupKey)

  const displayedCompetitorFilterFields = useMemo(
    () => (activeGridCellKey ? maskNonPeriodAnalysisFilterFields(competitorFilterFields) : competitorFilterFields),
    [activeGridCellKey, competitorFilterFields],
  )

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

  const scatterData: AnalysisScatterGridPoint[] = useMemo(
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

  const onRequestNavigateAdjacent = useCallback(
    (direction: AdjacentDirection) => {
      if (!selectedSkuGroupKey) return
      const nextId = adjacentIdInOrder(navigationOrderIds, selectedSkuGroupKey, direction)
      if (nextId != null && nextId !== selectedSkuGroupKey) setSelectedSkuGroupKey(nextId)
    },
    [navigationOrderIds, selectedSkuGroupKey, setSelectedSkuGroupKey],
  )

  const renderQtyScatterTooltip = (props: {
    active?: boolean
    payload?: ReadonlyArray<{ payload?: AnalysisScatterGridPoint }>
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

  const scatterChartWidth = Math.max(1, Math.floor(chartWidth))
  const scatterChartHeight = Math.max(1, Math.floor(chartHeight))
  const scatterPointRadius = getScatterGridCellPointRadius(scatterGrid?.meta, scatterChartWidth, scatterChartHeight)

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
              <CompetitorFilterEndControls
                showRowsWithSelfSalesOnly={showRowsWithSelfSalesOnly}
                bulkSelectedCount={bulkSelectedCount}
                onSelfSalesOnlyChange={setShowRowsWithSelfSalesOnly}
                onOpenBulkAdd={() => setBulkAddOpen(true)}
              />
            )}
          />
        )}
      />

      <div className={`${styles.twoCol} ${styles.selfTwoCol}`}>
        <div className={`${styles.leftCol} ${styles.selfLeftCol}`}>
          <CompetitorKpiGrid
            totalCompetitorAmount={kpi.totalCompetitorAmount}
            totalSelfAmount={kpi.totalSelfAmount}
            totalCompetitorQty={kpi.totalCompetitorQty}
            totalSelfQty={kpi.totalSelfQty}
          />

          <AnalysisScatterChartCard<AnalysisScatterGridPoint>
            title="경쟁·자사 판매량 비교"
            data={scatterData}
            chartBodyRef={chartBodyRef}
            chartReady={chartReady}
            width={scatterChartWidth}
            height={scatterChartHeight}
            pointRadius={scatterPointRadius}
            activeCellKey={activeGridCellKey}
            onCellClick={onScatterCellClick}
            onClearSelection={clearActiveGridCell}
            renderTooltip={renderQtyScatterTooltip}
            xAxis={{ name: '자사 판매량(EA)', label: '자사', labelColor: '#2563eb' }}
            yAxis={{
              name: `${competitorAxisLabel} 판매량(EA)`,
              label: competitorAxisLabel,
              labelColor: '#ef4444',
              width: 38,
              tickMargin: 4,
            }}
          />
        </div>

        <CompetitorAnalysisList
          rows={visibleRows}
          allVisibleRowsSelected={allVisibleRowsSelected}
          bulkSelectedSkuGroupKeys={bulkSelectedSkuGroupKeys}
          onToggleAllVisibleRows={toggleAllVisibleRows}
          onToggleBulkRow={toggleBulkRow}
          onSelectSkuGroupKey={setSelectedSkuGroupKey}
        />      </div>

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
          clearBulkSelection()
        }}
      />
    </section>
  )
}
