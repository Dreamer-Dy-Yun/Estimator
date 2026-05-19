import { useCallback, useMemo, useState } from 'react'
import { getSelfSales, getSelfSalesScatterGrid } from '../../api'
import type { SelfSalesRow } from '../../types'
import { selfSalesWeightedMarginRate, selfSalesWeightedOpMarginRate } from '../../utils/analysisKpiWeighted'
import { clampForecastMonths, readForecastMonthsFromStorage, writeForecastMonthsToStorage } from '../../utils/forecastMonthsStorage'
import { formatGroupedNumber } from '../../utils/format'
import type { ScatterSalesGridResponse } from '../../api/types'
import { LoadingSpinner } from '../../components/LoadingSpinner'
import { AnalysisCandidateBulkAddModal } from '../components/candidate-stash/AnalysisCandidateBulkAddModal'
import { ProductDrawer } from '../components/product-drawer/ProductDrawer'
import styles from '../components/common.module.css'
import { AnalysisListRequestFrame } from '../components/AnalysisListRequestFrame'
import { AnalysisPeriodTools } from '../components/AnalysisPeriodTools'
import { AnalysisPeriodQueryButton } from '../components/AnalysisPeriodQueryButton'
import { AnalysisScatterChartCard } from '../components/AnalysisScatterChartCard'
import { renderSelfSalesScatterTooltip } from '../components/AnalysisScatterTooltips'
import { DashboardRequestStatus } from '../components/DashboardRequestStatus'
import { FilterBar } from '../components/FilterBar'
import { KpiGrid } from '../components/KpiGrid'
import { SelfAnalysisList } from '../components/SelfAnalysisList'
import { useAnalysisScatterGridView } from '../hooks/useAnalysisScatterGridView'
import { useElementSize } from '../hooks/useElementSize'
import { useAnalysisRowKeyboardFocus } from '../hooks/useAnalysisRowKeyboardFocus'
import { maskNonPeriodAnalysisFilterFields, useAnalysisSalesFilters } from '../hooks/useAnalysisSalesFilters'
import { useAnalysisVisibleSelection } from '../hooks/useAnalysisVisibleSelection'
import { useDashboardRequest } from '../hooks/useDashboardRequest'
import { useProductDrawerBundleState } from '../hooks/useProductDrawerBundle'
import type { AnalysisScatterGridPoint } from '../model/analysisScatterGridPoint'

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
    appliedPeriodStartDate,
    appliedPeriodEndDate,
    periodQueryDirty,
    applyPeriodQuery,
    showPeriodBar,
    setShowPeriodBar,
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
  const rowsRequest = useDashboardRequest(loadRows, EMPTY_SELF_ROWS)
  const scatterGridRequest = useDashboardRequest<ScatterSalesGridResponse | null>(
    loadScatterGrid,
    null,
  )
  const { data: rows, loading: rowsLoading } = rowsRequest
  const { data: scatterGrid, loading: scatterGridLoading } = scatterGridRequest
  const {
    activeGridCellKey,
    selectedSkuGroupKey,
    activeSkuGroupKey,
    bulkSelectedSkuGroupKeys,
    visibleRows,
    navigationOrderIds,
    bulkSelectedCount,
    allVisibleRowsSelected: allRowsSelected,
    selectedSkuGroupKeys,
    setSelectedSkuGroupKey,
    focusSkuGroupKey,
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

  const {
    scatterData,
    scatterChartWidth,
    scatterChartHeight,
    scatterPointRadius,
  } = useAnalysisScatterGridView({ scatterGrid, chartWidth, chartHeight })

  const displayedFilterFields = useMemo(
    () => (activeGridCellKey ? maskNonPeriodAnalysisFilterFields(filterFields) : filterFields),
    [activeGridCellKey, filterFields],
  )

  const { onRequestNavigateAdjacent, onRequestFocusAdjacent } = useAnalysisRowKeyboardFocus({
    orderedRowIds: orderedSkuGroupKeys,
    visibleRowIds: navigationOrderIds,
    activeSkuGroupKey,
    drawerSkuGroupKey: selectedSkuGroupKey,
    disabled: bulkAddOpen,
    onFocusSkuGroupKey: focusSkuGroupKey,
    onOpenSkuGroupKey: setSelectedSkuGroupKey,
  })

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
                <DashboardRequestStatus
                  compact
                  items={[
                    { label: '자사 분석 목록', state: rowsRequest },
                    { label: '산점도', state: scatterGridRequest },
                  ]}
                />
                <button
                  type="button"
                  className={`${styles.actionBtn} ${styles.btnPrimary} ${styles.analysisBulkAddButton}`}
                  onClick={() => setBulkAddOpen(true)}
                  disabled={bulkSelectedCount === 0}
                >
                  선택한 물품을 후보군으로
                </button>
                <AnalysisPeriodQueryButton disabled={!periodQueryDirty} onClick={applyPeriodQuery} />
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

        <AnalysisListRequestFrame
          initialLoading={rowsLoading && !rows.length}
          refreshing={rowsRequest.isRefreshing}
          initialLabel="자사 분석 목록을 불러오는 중"
          refreshLabel="자사 분석 목록을 갱신하는 중"
        >
          <SelfAnalysisList
            rows={visibleRows}
            activeSkuGroupKey={activeSkuGroupKey}
            allVisibleRowsSelected={allRowsSelected}
            bulkSelectedSkuGroupKeys={bulkSelectedSkuGroupKeys}
            onToggleAllVisibleRows={toggleAllVisibleRows}
            onToggleBulkRow={toggleBulkRow}
            onOpenSkuGroupKey={setSelectedSkuGroupKey}
            onRequestFocusAdjacent={onRequestFocusAdjacent}
            onOrderedSkuGroupKeysChange={setOrderedSkuGroupKeys}
          />
        </AnalysisListRequestFrame>
      </div>

      <ProductDrawer
        summary={summaryBundle?.summary ?? null}
        loading={summaryBundleState.loading}
        periodStart={appliedPeriodStartDate}
        periodEnd={appliedPeriodEndDate}
        forecastMonths={forecastMonths}
        onForecastMonthsChange={onForecastMonthsChange}
        onClose={() => setSelectedSkuGroupKey(null)}
        onRequestNavigateAdjacent={onRequestNavigateAdjacent}
        secondaryEnabled={false}
      />

      <AnalysisCandidateBulkAddModal
        open={bulkAddOpen}
        skuGroupKeys={selectedSkuGroupKeys}
        periodStart={appliedPeriodStartDate}
        periodEnd={appliedPeriodEndDate}
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
