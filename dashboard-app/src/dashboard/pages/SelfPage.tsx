import { useCallback, useMemo, useState } from 'react'
import { getSelfSales, getSelfSalesScatterGrid } from '../../api'
import type { SelfSalesRow } from '../../types'
import { selfSalesWeightedMarginRate, selfSalesWeightedOpMarginRate } from '../../utils/analysisKpiWeighted'
import type { AdjacentDirection } from '../../utils/adjacentListNavigation'
import { adjacentIdInOrder } from '../../utils/adjacentListNavigation'
import { clampForecastMonths, readForecastMonthsFromStorage, writeForecastMonthsToStorage } from '../../utils/forecastMonthsStorage'
import { formatGroupedNumber } from '../../utils/format'
import { getScatterGridCellColor, getScatterGridCellPointRadius } from '../../utils/scatterGridDisplay'
import type { ScatterSalesGridResponse } from '../../api/types'
import { LoadingSpinner } from '../../components/LoadingSpinner'
import { AnalysisCandidateBulkAddModal } from '../components/candidate-stash/AnalysisCandidateBulkAddModal'
import { ProductDrawer } from '../components/product-drawer/ProductDrawer'
import styles from '../components/common.module.css'
import { AnalysisPeriodTools } from '../components/AnalysisPeriodTools'
import {
  AnalysisScatterChartCard,
  type AnalysisScatterGridPoint,
} from '../components/AnalysisScatterChartCard'
import { renderSelfSalesScatterTooltip } from '../components/AnalysisScatterTooltips'
import { FilterBar } from '../components/FilterBar'
import { KpiGrid } from '../components/KpiGrid'
import { SelfAnalysisList } from '../components/SelfAnalysisList'
import { useElementSize } from '../hooks/useElementSize'
import { maskNonPeriodAnalysisFilterFields, useAnalysisSalesFilters } from '../hooks/useAnalysisSalesFilters'
import { useAnalysisVisibleSelection } from '../hooks/useAnalysisVisibleSelection'
import { useDashboardRequest } from '../hooks/useDashboardRequest'
import { useProductDrawerBundleState } from '../hooks/useProductDrawerBundle'

const EMPTY_SELF_ROWS: SelfSalesRow[] = []

export const SelfPage = () => {
  const [bulkAddOpen, setBulkAddOpen] = useState(false)
  const [forecastMonths, setForecastMonths] = useState(() => readForecastMonthsFromStorage())
  const [orderedSkuGroupKeys, setOrderedSkuGroupKeys] = useState<string[]>([])
  const { ref: chartBodyRef, width: chartWidth, height: chartHeight, ready: chartReady } = useElementSize<HTMLDivElement>()

  const onForecastMonthsChange = useCallback((n: number) => {
    const v = clampForecastMonths(n)
    setForecastMonths(v)
    writeForecastMonthsToStorage(v)
  }, [])

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
  const loadRows = useCallback(() => getSelfSales(salesParams), [salesParams])
  const loadScatterGrid = useCallback(() => getSelfSalesScatterGrid(salesParams), [salesParams])
  const { data: rows, loading: rowsLoading } = useDashboardRequest(loadRows, EMPTY_SELF_ROWS)
  const { data: scatterGrid, loading: scatterGridLoading } = useDashboardRequest<ScatterSalesGridResponse | null>(
    loadScatterGrid,
    null,
  )
  const {
    activeGridCellKey,
    selectedSkuGroupKey,
    bulkSelectedSkuGroupKeys,
    visibleRows,
    navigationOrderIds,
    bulkSelectedCount,
    allVisibleRowsSelected: allRowsSelected,
    selectedSkuGroupKeys,
    setSelectedSkuGroupKey,
    onScatterCellClick,
    clearActiveGridCell,
    toggleBulkRow,
    toggleAllVisibleRows,
    clearBulkSelection,
  } = useAnalysisVisibleSelection(rows, scatterGrid)
  const summaryBundleState = useProductDrawerBundleState(selectedSkuGroupKey)
  const summaryBundle = summaryBundleState.bundle

  const kpi = useMemo(() => {
    const totalAmount = visibleRows.reduce((acc, row) => acc + row.amount, 0)
    const totalQty = visibleRows.reduce((acc, row) => acc + row.qty, 0)
    const avgMarginRate = selfSalesWeightedMarginRate(visibleRows)
    const avgOpMarginRate = selfSalesWeightedOpMarginRate(visibleRows)
    return { totalAmount, totalQty, avgMarginRate, avgOpMarginRate }
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

  const displayedFilterFields = useMemo(
    () => (activeGridCellKey ? maskNonPeriodAnalysisFilterFields(filterFields) : filterFields),
    [activeGridCellKey, filterFields],
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

  const scatterChartWidth = Math.max(1, Math.floor(chartWidth))
  const scatterChartHeight = Math.max(1, Math.floor(chartHeight))
  const scatterPointRadius = getScatterGridCellPointRadius(scatterGrid?.meta, scatterChartWidth, scatterChartHeight)

  return (
    <section className={styles.page}>
      <FilterBar
        title=""
        filterClassName={styles.filterAnalysisGrid}
        fields={displayedFilterFields}
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
          {rowsLoading && !rows.length ? (
            <div className={styles.analysisPanelLoading}>
              <LoadingSpinner label="분석 지표를 불러오는 중" />
            </div>
          ) : (
            <KpiGrid
              stacked
              items={[
                { label: '총 판매액', value: formatGroupedNumber(kpi.totalAmount), unit: '원' },
                { label: '총 판매량', value: formatGroupedNumber(kpi.totalQty), unit: 'EA' },
                { label: '평균 매출 이익율', value: kpi.avgMarginRate.toFixed(1), unit: '%' },
                { label: '평균 영업이익율', value: kpi.avgOpMarginRate.toFixed(1), unit: '%' },
              ]}
            />
          )}

          <AnalysisScatterChartCard<AnalysisScatterGridPoint>
            title="판매량/영업 이익률 분석"
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
            renderTooltip={renderSelfSalesScatterTooltip}
            xAxis={{
              name: '영업이익률',
              label: '영업이익률',
              unit: '%',
              tickFormatter: (value) => `${value}`,
            }}
            yAxis={{ name: '판매량(EA)', label: '판매량(EA)', width: 42, tickMargin: 4 }}
          />
        </div>

        {rowsLoading && !rows.length ? (
          <div className={styles.analysisListLoading}>
            <LoadingSpinner label="자사 분석 목록을 불러오는 중" />
          </div>
        ) : (
          <SelfAnalysisList
            rows={visibleRows}
            selectedSkuGroupKey={selectedSkuGroupKey}
            allVisibleRowsSelected={allRowsSelected}
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
