import { useCallback, useMemo, useState } from 'react'
import { getSelfSales, getSelfSalesScatterGrid } from '../../api'
import type { ScatterSalesGridResponse } from '../../api/types'
import { LoadingSpinner } from '../../components/LoadingSpinner'
import type { SelfSalesRow } from '../../types'
import { selfSalesWeightedMarginRate, selfSalesWeightedOpMarginRate } from '../../utils/analysisKpiWeighted'
import { formatGroupedNumber } from '../../utils/format'
import { AnalysisDrawerBulkAdd } from '../components/AnalysisDrawerBulkAdd'
import { AnalysisPageLayout } from '../components/AnalysisPageLayout'
import { AnalysisPeriodQueryButton } from '../components/AnalysisPeriodQueryButton'
import { AnalysisScatterChartCard } from '../components/AnalysisScatterChartCard'
import { renderSelfSalesScatterTooltip } from '../components/AnalysisScatterTooltips'
import { DashboardRequestStatus } from '../components/DashboardRequestStatus'
import { KpiGrid } from '../components/KpiGrid'
import { SelfAnalysisList } from '../components/SelfAnalysisList'
import styles from '../components/common.module.css'
import { useAnalysisPageCommonState } from '../hooks/useAnalysisPageCommonState'
import { useAnalysisPageSelection } from '../hooks/useAnalysisPageSelection'
import { useAnalysisSalesDataGate } from '../hooks/useAnalysisSalesDataGate'
import { useAnalysisSalesFilters, maskNonPeriodAnalysisFilterFields } from '../hooks/useAnalysisSalesFilters'
import { useAnalysisScatterGridView } from '../hooks/useAnalysisScatterGridView'
import { useDashboardRequest } from '../hooks/useDashboardRequest'
import { useProductDrawerBundleState } from '../hooks/useProductDrawerBundle'
import { buildAnalysisSalesRequestKey } from '../model/analysisSalesRequestKey'
import type { AnalysisScatterGridPoint } from '../model/analysisScatterGridPoint'

const EMPTY_SELF_ROWS: SelfSalesRow[] = []
const ALL_COMPANY_BULK_ADD_DISABLED = '전체 선택 상태에서는 오더 후보군에 추가할 수 없습니다. 회사를 선택하세요.'

export const SelfPage = () => {
  const [bulkAddOpen, setBulkAddOpen] = useState(false)
  const common = useAnalysisPageCommonState()
  const filters = useAnalysisSalesFilters(common.companyUuid)
  const analysisRequestKey = useMemo(() => buildAnalysisSalesRequestKey(filters.salesParams), [filters.salesParams])
  const loadRows = useCallback(() => getSelfSales(filters.salesParams), [filters.salesParams])
  const loadScatterGrid = useCallback(() => getSelfSalesScatterGrid(filters.salesParams), [filters.salesParams])
  const rowsRequest = useDashboardRequest(loadRows, EMPTY_SELF_ROWS, analysisRequestKey)
  const scatterGridRequest = useDashboardRequest<ScatterSalesGridResponse | null>(loadScatterGrid, null, analysisRequestKey)
  const analysisData = useAnalysisSalesDataGate({
    rowsRequest,
    scatterGridRequest,
    requestKey: analysisRequestKey,
    emptyRows: EMPTY_SELF_ROWS,
  })
  const { rows, scatterGrid } = analysisData
  const selection = useAnalysisPageSelection({ rows, scatterGrid, bulkAddOpen })
  const summaryBundleState = useProductDrawerBundleState(selection.selectedSkuGroupKey, { companyUuid: common.companyUuid })

  const kpi = useMemo(() => {
    const totalAmount = selection.visibleRows.reduce((acc, row) => acc + row.amount, 0)
    const totalQty = selection.visibleRows.reduce((acc, row) => acc + row.qty, 0)
    return {
      totalAmount,
      totalQty,
      avgMarginRate: selfSalesWeightedMarginRate(selection.visibleRows),
      avgOpMarginRate: selfSalesWeightedOpMarginRate(selection.visibleRows),
    }
  }, [selection.visibleRows])

  const scatterView = useAnalysisScatterGridView({
    scatterGrid,
    chartWidth: common.chartWidth,
    chartHeight: common.chartHeight,
  })
  const displayedFilterFields = useMemo(
    () => (selection.activeGridCellKey ? maskNonPeriodAnalysisFilterFields(filters.filterFields) : filters.filterFields),
    [filters.filterFields, selection.activeGridCellKey],
  )

  return (
    <section className={styles.page}>
      <AnalysisPageLayout
        filterFields={displayedFilterFields}
        historicalMonths={filters.historicalMonths}
        showPeriodBar={filters.showPeriodBar}
        periodStartIdx={filters.periodStartIdx}
        periodEndIdx={filters.periodEndIdx}
        startPct={filters.startPct}
        endPct={filters.endPct}
        setPresetMonths={filters.setPresetMonths}
        setWholeRange={filters.setWholeRange}
        onTogglePeriodBar={() => filters.setShowPeriodBar((prev) => !prev)}
        onPeriodBarStart={filters.onPeriodBarStart}
        onPeriodBarEnd={filters.onPeriodBarEnd}
        initialLoading={analysisData.initialLoading && !rows.length}
        refreshing={analysisData.refreshing}
        initialLabel={`${common.selfCompanyLabel} 분석 목록을 불러오는 중`}
        refreshLabel={`${common.selfCompanyLabel} 분석 목록을 갱신하는 중`}
        endControl={(
          <div className={styles.periodPresetRowEndGroup}>
            <DashboardRequestStatus compact items={[{ label: `${common.selfCompanyLabel} 분석 목록`, state: rowsRequest }, { label: '산점도', state: scatterGridRequest }]} />
            <button
              type="button"
              className={`${styles.actionBtn} ${styles.btnPrimary} ${styles.analysisBulkAddButton}`}
              onClick={() => setBulkAddOpen(true)}
              disabled={common.isAllCompanySelected || selection.bulkSelectedCount === 0}
              title={common.isAllCompanySelected ? ALL_COMPANY_BULK_ADD_DISABLED : undefined}
            >
              선택한 물품을 후보군으로
            </button>
            <AnalysisPeriodQueryButton disabled={!filters.periodQueryDirty} onClick={filters.applyPeriodQuery} />
          </div>
        )}
        leftPanel={(
          <>
            {analysisData.initialLoading && !rows.length ? (
              <div className={styles.analysisPanelLoading}><LoadingSpinner label="분석 지표를 불러오는 중" /></div>
            ) : (
              <KpiGrid stacked items={[
                { label: '총 판매액', value: formatGroupedNumber(kpi.totalAmount), unit: '원' },
                { label: '총 판매량', value: formatGroupedNumber(kpi.totalQty), unit: 'EA' },
                { label: '평균 매출 이익률', value: kpi.avgMarginRate.toFixed(1), unit: '%' },
                { label: '평균 영업 이익률', value: kpi.avgOpMarginRate.toFixed(1), unit: '%' },
              ]} />
            )}
            <AnalysisScatterChartCard<AnalysisScatterGridPoint>
              title="판매량·영업 이익률 분석"
              data={scatterView.scatterData}
              chartBodyRef={common.chartBodyRef}
              chartReady={common.chartReady}
              width={scatterView.scatterChartWidth}
              height={scatterView.scatterChartHeight}
              loading={analysisData.initialLoading && scatterView.scatterData.length === 0}
              pointRadius={scatterView.scatterPointRadius}
              activeCellKey={selection.activeGridCellKey}
              onCellClick={selection.onScatterCellClick}
              onClearSelection={selection.clearActiveGridCell}
              renderTooltip={renderSelfSalesScatterTooltip}
              xAxis={{ name: '영업 이익률', label: '영업 이익률', unit: '%', tickFormatter: (value) => `${value}` }}
              yAxis={{ name: '판매량(EA)', label: '판매량(EA)', width: 42, tickMargin: 4 }}
            />
          </>
        )}
        listPanel={(
          <SelfAnalysisList
            rows={selection.visibleRows}
            activeSkuGroupKey={selection.activeSkuGroupKey}
            allVisibleRowsSelected={selection.allVisibleRowsSelected}
            bulkSelectedSkuGroupKeys={selection.bulkSelectedSkuGroupKeys}
            onToggleAllVisibleRows={selection.toggleAllVisibleRows}
            onToggleBulkRow={selection.toggleBulkRow}
            onOpenSkuGroupKey={selection.setSelectedSkuGroupKey}
            onRequestFocusAdjacent={selection.onRequestFocusAdjacent}
            onOrderedSkuGroupKeysChange={selection.onOrderedSkuGroupKeysChange}
          />
        )}
      />
      <AnalysisDrawerBulkAdd
        summary={summaryBundleState.bundle?.summary ?? null}
        loading={summaryBundleState.loading}
        periodStart={filters.appliedPeriodStartDate}
        periodEnd={filters.appliedPeriodEndDate}
        companyUuid={common.companyUuid}
        forecastMonths={common.forecastMonths}
        selfCompanyLabel={common.selfCompanyLabel}
        onForecastMonthsChange={common.onForecastMonthsChange}
        onRequestNavigateAdjacent={selection.onRequestNavigateAdjacent}
        openSkuGroupKeys={selection.selectedSkuGroupKeys}
        bulkAddOpen={bulkAddOpen}
        onCloseDrawer={() => selection.setSelectedSkuGroupKey(null)}
        onCloseBulkAdd={() => setBulkAddOpen(false)}
        onBulkAddDone={() => {
          setBulkAddOpen(false)
          selection.clearBulkSelection()
        }}
      />
    </section>
  )
}
