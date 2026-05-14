import { useCallback, useMemo, useState } from 'react'
import { getCompetitorSales, getCompetitorSalesScatterGrid, getSecondaryCompetitorChannels } from '../../api'
import type { SecondaryCompetitorChannel } from '../../api/types'
import type { CompetitorSalesRow } from '../../types'
import type { AdjacentDirection } from '../../utils/adjacentListNavigation'
import { adjacentIdInOrder } from '../../utils/adjacentListNavigation'
import { clampForecastMonths, readForecastMonthsFromStorage, writeForecastMonthsToStorage } from '../../utils/forecastMonthsStorage'
import { getScatterGridCellColor, getScatterGridCellPointRadius } from '../../utils/scatterGridDisplay'
import { LoadingSpinner } from '../../components/LoadingSpinner'
import { AnalysisCandidateBulkAddModal } from '../components/candidate-stash/AnalysisCandidateBulkAddModal'
import { ProductDrawer } from '../components/product-drawer/ProductDrawer'
import styles from '../components/common.module.css'
import { AnalysisPeriodTools } from '../components/AnalysisPeriodTools'
import {
  AnalysisScatterChartCard,
  type AnalysisScatterGridPoint,
} from '../components/AnalysisScatterChartCard'
import { createCompetitorSalesScatterTooltip } from '../components/AnalysisScatterTooltips'
import { CompetitorAnalysisList } from '../components/CompetitorAnalysisList'
import { CompetitorFilterEndControls } from '../components/CompetitorFilterEndControls'
import { CompetitorKpiGrid } from '../components/CompetitorKpiGrid'
import { FilterBar } from '../components/FilterBar'
import { useElementSize } from '../hooks/useElementSize'
import { maskNonPeriodAnalysisFilterFields, useAnalysisSalesFilters } from '../hooks/useAnalysisSalesFilters'
import type { FilterField } from '../model/filterField'
import { useAnalysisVisibleSelection } from '../hooks/useAnalysisVisibleSelection'
import { useDashboardRequest } from '../hooks/useDashboardRequest'
import { useProductDrawerBundleState } from '../hooks/useProductDrawerBundle'
import type { ScatterSalesGridResponse } from '../../api/types'

const EMPTY_COMPETITOR_ROWS: CompetitorSalesRow[] = []
const EMPTY_COMPETITOR_CHANNELS: SecondaryCompetitorChannel[] = []

export const CompetitorPage = () => {
  const [bulkAddOpen, setBulkAddOpen] = useState(false)
  const [forecastMonths, setForecastMonths] = useState(() => readForecastMonthsFromStorage())
  const [orderedSkuGroupKeys, setOrderedSkuGroupKeys] = useState<string[]>([])
  const { ref: chartBodyRef, width: chartWidth, height: chartHeight, ready: chartReady } = useElementSize<HTMLDivElement>()

  const onForecastMonthsChange = useCallback((n: number) => {
    const v = clampForecastMonths(n)
    setForecastMonths(v)
    writeForecastMonthsToStorage(v)
  }, [])

  const [competitorChannelLabel, setCompetitorChannelLabel] = useState('전체')
  const [showRowsWithSelfSalesOnly, setShowRowsWithSelfSalesOnly] = useState(false)
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
  const { data: channels } = useDashboardRequest(getSecondaryCompetitorChannels, EMPTY_COMPETITOR_CHANNELS)

  const competitorChannelId = useMemo(() => {
    if (competitorChannelLabel === '전체') return undefined
    return channels.find((ch) => ch.label === competitorChannelLabel)?.id
  }, [channels, competitorChannelLabel])

  const loadRows = useCallback(() => getCompetitorSales({
    ...salesParams,
    competitorChannelId,
  }), [competitorChannelId, salesParams])
  const loadScatterGrid = useCallback(() => getCompetitorSalesScatterGrid({
    ...salesParams,
    competitorChannelId,
  }), [competitorChannelId, salesParams])
  const { data: rows, loading: rowsLoading } = useDashboardRequest(loadRows, EMPTY_COMPETITOR_ROWS)
  const { data: scatterGrid, loading: scatterGridLoading } = useDashboardRequest<ScatterSalesGridResponse | null>(
    loadScatterGrid,
    null,
  )

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
  const summaryBundleState = useProductDrawerBundleState(selectedSkuGroupKey)
  const summaryBundle = summaryBundleState.bundle

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
      const orderIds = orderedSkuGroupKeys.length ? orderedSkuGroupKeys : navigationOrderIds
      const nextId = adjacentIdInOrder(orderIds, selectedSkuGroupKey, direction)
      if (nextId != null && nextId !== selectedSkuGroupKey) setSelectedSkuGroupKey(nextId)
    },
    [navigationOrderIds, orderedSkuGroupKeys, selectedSkuGroupKey, setSelectedSkuGroupKey],
  )

  const renderQtyScatterTooltip = useMemo(
    () => createCompetitorSalesScatterTooltip(competitorAxisLabel),
    [competitorAxisLabel],
  )

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
          {rowsLoading && !rows.length ? (
            <div className={styles.analysisPanelLoading}>
              <LoadingSpinner label="분석 지표를 불러오는 중" />
            </div>
          ) : (
            <CompetitorKpiGrid
              totalCompetitorAmount={kpi.totalCompetitorAmount}
              totalSelfAmount={kpi.totalSelfAmount}
              totalCompetitorQty={kpi.totalCompetitorQty}
              totalSelfQty={kpi.totalSelfQty}
            />
          )}

          <AnalysisScatterChartCard<AnalysisScatterGridPoint>
            title="경쟁·자사 판매량 비교"
            data={scatterData}
            chartBodyRef={chartBodyRef}
            chartReady={chartReady}
            width={scatterChartWidth}
            height={scatterChartHeight}
            loading={scatterGridLoading && scatterData.length === 0}
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

        {rowsLoading && !rows.length ? (
          <div className={styles.analysisListLoading}>
            <LoadingSpinner label="경쟁사 분석 목록을 불러오는 중" />
          </div>
        ) : (
          <CompetitorAnalysisList
            rows={visibleRows}
            selectedSkuGroupKey={selectedSkuGroupKey}
            allVisibleRowsSelected={allVisibleRowsSelected}
            bulkSelectedSkuGroupKeys={bulkSelectedSkuGroupKeys}
            onToggleAllVisibleRows={toggleAllVisibleRows}
            onToggleBulkRow={toggleBulkRow}
            onSelectSkuGroupKey={setSelectedSkuGroupKey}
            onOrderedSkuGroupKeysChange={setOrderedSkuGroupKeys}
          />
        )}
      </div>

      <ProductDrawer
        summary={summaryBundle?.summary ?? null}
        loading={summaryBundleState.loading}
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
