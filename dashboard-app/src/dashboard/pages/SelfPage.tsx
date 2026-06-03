import type { AnalysisScatterGridView } from '../hooks/useAnalysisScatterGridView'
import type { ProductDrawerBundle, SelfSalesParams } from '../../api'
import type { AdjacentDirection } from '../../utils/adjacentListNavigation'
import type { DashboardRequestState } from '../hooks/useDashboardRequest'
import type { AnalysisFacetOptionValues, AnalysisFacetValues } from '../model/analysisFacetFilter'
import type { FilterField } from '../model/filterField'
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
import { maskAnalysisListFilterFields, useAnalysisSalesFilters } from '../hooks/useAnalysisSalesFilters'
import { useAnalysisScatterGridView } from '../hooks/useAnalysisScatterGridView'
import { useDashboardRequest } from '../hooks/useDashboardRequest'
import { useProductDrawerBundleState } from '../hooks/useProductDrawerBundle'
import { buildAnalysisSalesRequestKey } from '../model/analysisSalesRequestKey'
import { AnalysisFacetFilter, ANALYSIS_SALES_FACET_DEFINITIONS } from '../model/analysisFacetFilter'
import type { AnalysisScatterGridPoint } from '../model/analysisScatterGridPoint'
import { useDashboardDisplayPolicy } from '../policy/DashboardDisplayPolicy'

const EMPTY_SELF_ROWS: SelfSalesRow[] = []
const ALL_COMPANY_BULK_ADD_DISABLED = '전체 선택 상태에서는 오더 후보군에 추가할 수 없습니다. 회사를 선택하세요.' as const

export const SelfPage: () => React.JSX.Element = () : React.JSX.Element => {
  const [bulkAddOpen, setBulkAddOpen]: [boolean, React.Dispatch<React.SetStateAction<boolean>>] = useState(false)
  const displayPolicy: ReturnType<typeof useDashboardDisplayPolicy> = useDashboardDisplayPolicy()
  const common: { selfCompanyLabel: string; companyUuid: string | undefined; isAllCompanySelected: boolean; forecastMonths: number; onForecastMonthsChange: (n: number) => void; chartBodyRef: React.RefObject<HTMLDivElement | null>; chartWidth: number; chartHeight: number; chartReady: boolean; } = useAnalysisPageCommonState()
  const filters: { appliedPeriodStartDate: string; appliedPeriodEndDate: string; periodQueryDirty: boolean; applyPeriodQuery: () => void; queryFields: FilterField[]; listFilterValues: AnalysisFacetValues; buildListFilterFields: (filterOptions?: AnalysisFacetOptionValues) => FilterField[]; listFiltersDirty: boolean; resetListFilters: () => void; historicalMonths: string[]; salesParams: SelfSalesParams; showPeriodBar: boolean; setShowPeriodBar: React.Dispatch<React.SetStateAction<boolean>>; startDate: string; endDate: string; periodStartDate: string; periodEndDate: string; periodStartIdx: number; periodEndIdx: number; startPct: number; endPct: number; setPeriodStartDate: (value: string) => void; setPeriodEndDate: (value: string) => void; setPresetMonths: (months: number) => void; setWholeRange: () => void; onStartDateChange: (value: string) => void; onEndDateChange: (value: string) => void; onPeriodBarStart: (value: number) => void; onPeriodBarEnd: (value: number) => void; } = useAnalysisSalesFilters(common.companyUuid)
  const { buildListFilterFields, listFilterValues }: { appliedPeriodStartDate: string; appliedPeriodEndDate: string; periodQueryDirty: boolean; applyPeriodQuery: () => void; queryFields: FilterField[]; listFilterValues: AnalysisFacetValues; buildListFilterFields: (filterOptions?: AnalysisFacetOptionValues) => FilterField[]; listFiltersDirty: boolean; resetListFilters: () => void; historicalMonths: string[]; salesParams: SelfSalesParams; showPeriodBar: boolean; setShowPeriodBar: React.Dispatch<React.SetStateAction<boolean>>; startDate: string; endDate: string; periodStartDate: string; periodEndDate: string; periodStartIdx: number; periodEndIdx: number; startPct: number; endPct: number; setPeriodStartDate: (value: string) => void; setPeriodEndDate: (value: string) => void; setPresetMonths: (months: number) => void; setWholeRange: () => void; onStartDateChange: (value: string) => void; onEndDateChange: (value: string) => void; onPeriodBarStart: (value: number) => void; onPeriodBarEnd: (value: number) => void; } = filters
  const analysisRequestKey: string = useMemo(() : string => buildAnalysisSalesRequestKey(filters.salesParams), [filters.salesParams])
  const loadRows: () => Promise<SelfSalesRow[]> = useCallback(() : Promise<SelfSalesRow[]> => getSelfSales(filters.salesParams), [filters.salesParams])
  const loadScatterGrid: () => Promise<ScatterSalesGridResponse> = useCallback(() : Promise<ScatterSalesGridResponse> => getSelfSalesScatterGrid(filters.salesParams), [filters.salesParams])
  const rowsRequest: DashboardRequestState<SelfSalesRow[]> = useDashboardRequest(loadRows, EMPTY_SELF_ROWS, analysisRequestKey)
  const scatterGridRequest: DashboardRequestState<ScatterSalesGridResponse | null> = useDashboardRequest<ScatterSalesGridResponse | null>(loadScatterGrid, null, analysisRequestKey)
  const analysisData: { rows: SelfSalesRow[]; scatterGrid: ScatterSalesGridResponse | null; initialLoading: boolean; refreshing: boolean; ready: boolean; } = useAnalysisSalesDataGate({
    rowsRequest,
    scatterGridRequest,
    requestKey: analysisRequestKey,
    emptyRows: EMPTY_SELF_ROWS,
  })
  const { rows, scatterGrid }: { rows: SelfSalesRow[]; scatterGrid: ScatterSalesGridResponse | null; initialLoading: boolean; refreshing: boolean; ready: boolean; } = analysisData
  const facetFilter: AnalysisFacetFilter<SelfSalesRow> = useMemo(
    () : AnalysisFacetFilter<SelfSalesRow> => new AnalysisFacetFilter(rows, ANALYSIS_SALES_FACET_DEFINITIONS, listFilterValues),
    [listFilterValues, rows],
  )
  const listFilterFields: FilterField[] = useMemo(
    () : FilterField[] => buildListFilterFields(facetFilter.getOptionValuesByKey()),
    [buildListFilterFields, facetFilter],
  )
  const filteredRows: SelfSalesRow[] = useMemo(() : SelfSalesRow[] => facetFilter.getFilteredRows(), [facetFilter])
  const selection: { activeGridCellKey: string | null; selectedSkuGroupKey: string | null; activeSkuGroupKey: string | null; bulkSelectedSkuGroupKeys: Set<string>; visibleRows: SelfSalesRow[]; bulkSelectedCount: number; allVisibleRowsSelected: boolean; selectedSkuGroupKeys: string[]; setSelectedSkuGroupKey: (skuGroupKey: string | null) => void; onScatterCellClick: (cellKey: string) => void; clearActiveGridCell: () => void; toggleBulkRow: (id: string) => void; toggleAllVisibleRows: () => void; clearBulkSelection: () => void; onRequestNavigateAdjacent: (direction: AdjacentDirection) => void; onRequestFocusAdjacent: (currentSkuGroupKey: string | null, direction: AdjacentDirection) => void; onOrderedSkuGroupKeysChange: React.Dispatch<React.SetStateAction<string[]>>; } = useAnalysisPageSelection({ rows: filteredRows, scatterGrid, bulkAddOpen })
  const summaryBundleState: { bundle: ProductDrawerBundle | null; loading: boolean; } = useProductDrawerBundleState(selection.selectedSkuGroupKey, { companyUuid: common.companyUuid })

  const kpi: { totalAmount: number; totalQty: number; avgMarginRate: number; avgOpMarginRate: number; } = useMemo(() : { totalAmount: number; totalQty: number; avgMarginRate: number; avgOpMarginRate: number; } => {
    const totalAmount: number = selection.visibleRows.reduce((acc: number, row: SelfSalesRow) : number => acc + row.amount, 0)
    const totalQty: number = selection.visibleRows.reduce((acc: number, row: SelfSalesRow) : number => acc + row.qty, 0)
    return {
      totalAmount,
      totalQty,
      avgMarginRate: selfSalesWeightedMarginRate(selection.visibleRows),
      avgOpMarginRate: selfSalesWeightedOpMarginRate(selection.visibleRows),
    }
  }, [selection.visibleRows])

  const scatterView: AnalysisScatterGridView = useAnalysisScatterGridView({
    scatterGrid,
    chartWidth: common.chartWidth,
    chartHeight: common.chartHeight,
    pointRadius: displayPolicy.getScatterPointRadius(scatterGrid?.meta, common.chartWidth, common.chartHeight),
  })
  const displayedListFilterFields: FilterField[] = useMemo(
    () : FilterField[] => (selection.activeGridCellKey ? maskAnalysisListFilterFields(listFilterFields) : listFilterFields),
    [listFilterFields, selection.activeGridCellKey],
  )

  return (
    <section className={styles.page}>
      <AnalysisPageLayout
        queryFields={filters.queryFields}
        listFilterFields={displayedListFilterFields}
        listFilterResetDisabled={!filters.listFiltersDirty}
        historicalMonths={filters.historicalMonths}
        showPeriodBar={filters.showPeriodBar}
        periodStartIdx={filters.periodStartIdx}
        periodEndIdx={filters.periodEndIdx}
        startPct={filters.startPct}
        endPct={filters.endPct}
        setPresetMonths={filters.setPresetMonths}
        setWholeRange={filters.setWholeRange}
        onTogglePeriodBar={() : void => filters.setShowPeriodBar((prev: boolean) : boolean => !prev)}
        onPeriodBarStart={filters.onPeriodBarStart}
        onPeriodBarEnd={filters.onPeriodBarEnd}
        initialLoading={analysisData.initialLoading && !rows.length}
        refreshing={analysisData.refreshing}
        initialLabel={`${common.selfCompanyLabel} 분석 목록을 불러오는 중`}
        refreshLabel={`${common.selfCompanyLabel} 분석 목록을 갱신하는 중`}
        queryEndControl={(
          <div className={styles.periodPresetRowEndGroup}>
            <DashboardRequestStatus compact items={[{ label: `${common.selfCompanyLabel} 분석 목록`, state: rowsRequest }, { label: '산점도', state: scatterGridRequest }]} />
            <AnalysisPeriodQueryButton disabled={!filters.periodQueryDirty} onClick={filters.applyPeriodQuery} />
          </div>
        )}
        listActionContent={(
          <button
            type="button"
            className={`${styles.actionBtn} ${styles.btnPrimary} ${styles.analysisBulkAddButton}`}
            onClick={() : void => setBulkAddOpen(true)}
            disabled={common.isAllCompanySelected || selection.bulkSelectedCount === 0}
            title={common.isAllCompanySelected ? ALL_COMPANY_BULK_ADD_DISABLED : undefined}
          >
            후보군으로
          </button>
        )}
        hidePeriodPresetButtons={selection.selectedSkuGroupKey != null}
        onResetListFilters={filters.resetListFilters}
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
              xAxis={{ name: '영업 이익률', label: '영업 이익률', unit: '%', tickFormatter: (value: number) : string => `${value}` }}
              yAxis={{ name: '판매량(EA)', label: '판매량(EA)', width: 42, tickMargin: 4 }}
            />
          </>
        )}
        listPanel={(
          <SelfAnalysisList
            rows={selection.visibleRows}
            resetSortKey={analysisRequestKey}
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
        onCloseDrawer={() : void => selection.setSelectedSkuGroupKey(null)}
        onCloseBulkAdd={() : void => setBulkAddOpen(false)}
        onBulkAddDone={() : void => {
          setBulkAddOpen(false)
          selection.clearBulkSelection()
        }}
      />
    </section>
  )
}
