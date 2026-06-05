import type { AnalysisScatterGridView } from '../hooks/useAnalysisScatterGridView'
import type { ProductDrawerBundle, SelfSalesParams } from '../../api'
import type { AdjacentDirection } from '../../utils/adjacentListNavigation'
import type { AnalysisScatterTooltipProps } from '../components/AnalysisScatterTooltips'
import type { DashboardRequestState } from '../hooks/useDashboardRequest'
import type { AnalysisFacetOptionValues, AnalysisFacetValues } from '../model/analysisFacetFilter'
import { useCallback, useMemo, useState } from 'react'
import { getCompetitorSales, getSecondaryCompetitorChannels } from '../../api'
import type { ScatterGridCell, ScatterSalesGridResponse, SecondaryCompetitorChannel } from '../../api/types'
import { LoadingSpinner } from '../../components/LoadingSpinner'
import type { CompetitorSalesRow } from '../../types'
import { formatGroupedNumber } from '../../utils/format'
import { buildCompetitorSalesScatterGridFromRows } from '../../utils/scatterGridBuild'
import { AnalysisDrawerBulkAdd } from '../components/AnalysisDrawerBulkAdd'
import { AnalysisPageLayout } from '../components/AnalysisPageLayout'
import { AnalysisPeriodQueryButton } from '../components/AnalysisPeriodQueryButton'
import { AnalysisScatterChartCard } from '../components/AnalysisScatterChartCard'
import { createCompetitorSalesScatterTooltip } from '../components/AnalysisScatterTooltips'
import { CompetitorAnalysisList } from '../components/CompetitorAnalysisList'
import { CompetitorKpiGrid } from '../components/CompetitorKpiGrid'
import { DashboardRequestStatus } from '../components/DashboardRequestStatus'
import styles from '../components/common.module.css'
import { useAnalysisPageCommonState } from '../hooks/useAnalysisPageCommonState'
import { useAnalysisPageSelection } from '../hooks/useAnalysisPageSelection'
import { useAnalysisSalesDataGate } from '../hooks/useAnalysisSalesDataGate'
import { lockAnalysisListFilterFields, useAnalysisSalesFilters } from '../hooks/useAnalysisSalesFilters'
import { useAnalysisScatterGridView } from '../hooks/useAnalysisScatterGridView'
import { useDashboardRequest } from '../hooks/useDashboardRequest'
import { useProductDrawerBundleState } from '../hooks/useProductDrawerBundle'
import { buildAnalysisSalesRequestKey } from '../model/analysisSalesRequestKey'
import { AnalysisFacetFilter, ANALYSIS_SALES_FACET_DEFINITIONS } from '../model/analysisFacetFilter'
import type { AnalysisScatterGridPoint } from '../model/analysisScatterGridPoint'
import type { FilterField } from '../model/filterField'
import { useDashboardDisplayPolicy } from '../policy/DashboardDisplayPolicy'

const EMPTY_COMPETITOR_ROWS: CompetitorSalesRow[] = []
const EMPTY_COMPETITOR_CHANNELS: SecondaryCompetitorChannel[] = []
const ALL_CHANNEL_LABEL = '전체' as const
const ALL_COMPANY_BULK_ADD_DISABLED = '전체 선택 상태에서는 오더 후보군에 추가할 수 없습니다. 회사를 선택하세요.' as const

export const CompetitorPage: () => React.JSX.Element = () : React.JSX.Element => {
  const [bulkAddOpen, setBulkAddOpen]: [boolean, React.Dispatch<React.SetStateAction<boolean>>] = useState(false)
  const [competitorChannelId, setCompetitorChannelId]: [string | undefined, React.Dispatch<React.SetStateAction<string | undefined>>] = useState<string | undefined>(undefined)
  const [showRowsWithSelfSalesOnly, setShowRowsWithSelfSalesOnly]: [boolean, React.Dispatch<React.SetStateAction<boolean>>] = useState(false)
  const displayPolicy: ReturnType<typeof useDashboardDisplayPolicy> = useDashboardDisplayPolicy()
  const common: { selfCompanyLabel: string; companyUuid: string | undefined; isAllCompanySelected: boolean; forecastMonths: number; onForecastMonthsChange: (n: number) => void; chartBodyRef: React.RefObject<HTMLDivElement | null>; chartWidth: number; chartHeight: number; chartReady: boolean; } = useAnalysisPageCommonState()
  const filters: { appliedPeriodStartDate: string; appliedPeriodEndDate: string; periodQueryDirty: boolean; applyPeriodQuery: () => void; queryFields: FilterField[]; listFilterValues: AnalysisFacetValues; buildListFilterFields: (filterOptions?: AnalysisFacetOptionValues) => FilterField[]; listFiltersDirty: boolean; resetListFilters: () => void; historicalMonths: string[]; salesParams: SelfSalesParams; showPeriodBar: boolean; setShowPeriodBar: React.Dispatch<React.SetStateAction<boolean>>; startDate: string; endDate: string; periodStartDate: string; periodEndDate: string; periodStartIdx: number; periodEndIdx: number; startPct: number; endPct: number; setPeriodStartDate: (value: string) => void; setPeriodEndDate: (value: string) => void; setPresetMonths: (months: number) => void; setWholeRange: () => void; onStartDateChange: (value: string) => void; onEndDateChange: (value: string) => void; onPeriodBarStart: (value: number) => void; onPeriodBarEnd: (value: number) => void; } = useAnalysisSalesFilters(common.companyUuid)
  const { buildListFilterFields, listFilterValues }: { appliedPeriodStartDate: string; appliedPeriodEndDate: string; periodQueryDirty: boolean; applyPeriodQuery: () => void; queryFields: FilterField[]; listFilterValues: AnalysisFacetValues; buildListFilterFields: (filterOptions?: AnalysisFacetOptionValues) => FilterField[]; listFiltersDirty: boolean; resetListFilters: () => void; historicalMonths: string[]; salesParams: SelfSalesParams; showPeriodBar: boolean; setShowPeriodBar: React.Dispatch<React.SetStateAction<boolean>>; startDate: string; endDate: string; periodStartDate: string; periodEndDate: string; periodStartIdx: number; periodEndIdx: number; startPct: number; endPct: number; setPeriodStartDate: (value: string) => void; setPeriodEndDate: (value: string) => void; setPresetMonths: (months: number) => void; setWholeRange: () => void; onStartDateChange: (value: string) => void; onEndDateChange: (value: string) => void; onPeriodBarStart: (value: number) => void; onPeriodBarEnd: (value: number) => void; } = filters
  const channelsRequest: DashboardRequestState<SecondaryCompetitorChannel[]> = useDashboardRequest(getSecondaryCompetitorChannels, EMPTY_COMPETITOR_CHANNELS)
  const { data: channels }: DashboardRequestState<SecondaryCompetitorChannel[]> = channelsRequest
  const selectedCompetitorChannel: SecondaryCompetitorChannel | undefined = useMemo(
    () : SecondaryCompetitorChannel | undefined => competitorChannelId ? channels.find((ch: SecondaryCompetitorChannel) : boolean => ch.id === competitorChannelId) : undefined,
    [channels, competitorChannelId],
  )
  const activeCompetitorChannelId: string | undefined = selectedCompetitorChannel?.id
  const competitorChannelLabel: string = selectedCompetitorChannel?.label ?? ALL_CHANNEL_LABEL
  const onCompetitorChannelChange: (label: string) => void = useCallback((label: string) : void => {
    if (label === ALL_CHANNEL_LABEL) {
      setCompetitorChannelId(undefined)
      return
    }
    setCompetitorChannelId(channels.find((ch: SecondaryCompetitorChannel) : boolean => ch.label === label)?.id)
  }, [channels])
  const salesParams: { competitorChannelId: string | undefined; startDate?: string; endDate?: string; brand?: string; category?: string; codeQuery?: string; colorCode?: string; nameQuery?: string; companyUuid?: string | undefined; } = useMemo(() : { competitorChannelId: string | undefined; startDate?: string; endDate?: string; brand?: string; category?: string; codeQuery?: string; colorCode?: string; nameQuery?: string; companyUuid?: string | undefined; } => ({ ...filters.salesParams, competitorChannelId: activeCompetitorChannelId }), [activeCompetitorChannelId, filters.salesParams])
  const analysisRequestKey: string = useMemo(() : string => buildAnalysisSalesRequestKey(salesParams), [salesParams])
  const loadRows: () => Promise<CompetitorSalesRow[]> = useCallback(() : Promise<CompetitorSalesRow[]> => getCompetitorSales(salesParams), [salesParams])
  const rowsRequest: DashboardRequestState<CompetitorSalesRow[]> = useDashboardRequest(loadRows, EMPTY_COMPETITOR_ROWS, analysisRequestKey)
  const analysisData: { rows: CompetitorSalesRow[]; rowsReady: boolean; rowsInitialLoading: boolean; rowsRefreshing: boolean; } = useAnalysisSalesDataGate({
    rowsRequest,
    requestKey: analysisRequestKey,
    emptyRows: EMPTY_COMPETITOR_ROWS,
  })
  const { rows }: { rows: CompetitorSalesRow[] } = analysisData
  const baseRows: CompetitorSalesRow[] = useMemo(() : CompetitorSalesRow[] => (showRowsWithSelfSalesOnly ? rows.filter((row: CompetitorSalesRow) : boolean => row.selfQty != null) : rows), [rows, showRowsWithSelfSalesOnly])
  const facetFilter: AnalysisFacetFilter<CompetitorSalesRow> = useMemo(
    () : AnalysisFacetFilter<CompetitorSalesRow> => new AnalysisFacetFilter(baseRows, ANALYSIS_SALES_FACET_DEFINITIONS, listFilterValues),
    [baseRows, listFilterValues],
  )
  const listFilterFields: FilterField[] = useMemo(
    () : FilterField[] => buildListFilterFields(facetFilter.getOptionValuesByKey()),
    [buildListFilterFields, facetFilter],
  )
  const filteredRows: CompetitorSalesRow[] = useMemo(() : CompetitorSalesRow[] => facetFilter.getFilteredRows(), [facetFilter])
  const scatterGrid: ScatterSalesGridResponse | null = useMemo(
    () : ScatterSalesGridResponse | null => analysisData.rowsReady ? buildCompetitorSalesScatterGridFromRows(filteredRows) : null,
    [analysisData.rowsReady, filteredRows],
  )
  const selection: { activeGridCell: ScatterGridCell | null; activeGridCellKey: string | null; selectedSkuGroupKey: string | null; activeSkuGroupKey: string | null; bulkSelectedSkuGroupKeys: Set<string>; visibleRows: CompetitorSalesRow[]; bulkSelectedCount: number; allVisibleRowsSelected: boolean; selectedSkuGroupKeys: string[]; setSelectedSkuGroupKey: (skuGroupKey: string | null) => void; onScatterCellClick: (cellKey: string) => void; clearActiveGridCell: () => void; toggleBulkRow: (id: string) => void; toggleAllVisibleRows: () => void; clearBulkSelection: () => void; onRequestNavigateAdjacent: (direction: AdjacentDirection) => void; onRequestFocusAdjacent: (currentSkuGroupKey: string | null, direction: AdjacentDirection) => void; onOrderedSkuGroupKeysChange: React.Dispatch<React.SetStateAction<string[]>>; } = useAnalysisPageSelection({ rows: filteredRows, scatterGrid, bulkAddOpen, resetKey: analysisRequestKey })
  const summaryBundleState: { bundle: ProductDrawerBundle | null; loading: boolean; } = useProductDrawerBundleState(selection.selectedSkuGroupKey, { companyUuid: common.companyUuid })

  const competitorQueryFields: FilterField[] = useMemo<FilterField[]>(() : FilterField[] => [
    ...filters.queryFields,
    { label: '경쟁 채널', kind: 'select', value: competitorChannelLabel, onChange: onCompetitorChannelChange, options: [ALL_CHANNEL_LABEL, ...channels.map((ch: SecondaryCompetitorChannel) : string => ch.label)] },
  ], [channels, competitorChannelLabel, filters.queryFields, onCompetitorChannelChange])
  const displayedListFilterFields: FilterField[] = useMemo(
    () : FilterField[] => (selection.activeGridCellKey ? lockAnalysisListFilterFields(listFilterFields) : listFilterFields),
    [listFilterFields, selection.activeGridCellKey],
  )
  const resetListFilters: () => void = useCallback(() : void => {
    filters.resetListFilters()
    setShowRowsWithSelfSalesOnly(false)
  }, [filters])
  const listFiltersDirty: boolean = filters.listFiltersDirty || showRowsWithSelfSalesOnly
  const competitorAxisLabel: string = competitorChannelLabel === ALL_CHANNEL_LABEL ? '전체 경쟁사' : competitorChannelLabel
  const activeScatterCellNotice: string | null = useMemo(() : string | null => {
    if (!selection.activeGridCell) return null
    return `산점도 셀 선택 중: ${common.selfCompanyLabel} ${formatGroupedNumber(Math.round(selection.activeGridCell.xStart))}-${formatGroupedNumber(Math.round(selection.activeGridCell.xEnd))}EA / ${competitorAxisLabel} ${formatGroupedNumber(Math.round(selection.activeGridCell.yStart))}-${formatGroupedNumber(Math.round(selection.activeGridCell.yEnd))}EA`
  }, [common.selfCompanyLabel, competitorAxisLabel, selection.activeGridCell])
  const kpi: { totalCompetitorAmount: number; totalSelfAmount: number | null; totalCompetitorQty: number; totalSelfQty: number | null; } = useMemo(() : { totalCompetitorAmount: number; totalSelfAmount: number | null; totalCompetitorQty: number; totalSelfQty: number | null; } => {
    const rowsWithSelfAmount: CompetitorSalesRow[] = selection.visibleRows.filter((row: CompetitorSalesRow) : boolean => row.selfAmount != null)
    const rowsWithSelfQty: CompetitorSalesRow[] = selection.visibleRows.filter((row: CompetitorSalesRow) : boolean => row.selfQty != null)
    return {
      totalCompetitorAmount: selection.visibleRows.reduce((sum: number, row: CompetitorSalesRow) : number => sum + row.competitorAmount, 0),
      totalSelfAmount: rowsWithSelfAmount.length
        ? rowsWithSelfAmount.reduce((sum: number, row: CompetitorSalesRow) : number => sum + row.selfAmount!, 0)
        : null,
      totalCompetitorQty: selection.visibleRows.reduce((sum: number, row: CompetitorSalesRow) : number => sum + row.competitorQty, 0),
      totalSelfQty: rowsWithSelfQty.length
        ? rowsWithSelfQty.reduce((sum: number, row: CompetitorSalesRow) : number => sum + row.selfQty!, 0)
        : null,
    }
  }, [selection.visibleRows])
  const scatterView: AnalysisScatterGridView = useAnalysisScatterGridView({
    scatterGrid,
    chartWidth: common.chartWidth,
    chartHeight: common.chartHeight,
    pointRadius: displayPolicy.getScatterPointRadius(scatterGrid?.meta, common.chartWidth, common.chartHeight),
  })
  const renderQtyScatterTooltip: ({ active, payload }: AnalysisScatterTooltipProps) => React.JSX.Element | null = useMemo(
    () : ({ active, payload }: AnalysisScatterTooltipProps) => React.JSX.Element | null => createCompetitorSalesScatterTooltip(competitorAxisLabel, common.selfCompanyLabel),
    [common.selfCompanyLabel, competitorAxisLabel],
  )

  return (
    <section className={styles.page}>
      <AnalysisPageLayout
        queryFields={competitorQueryFields}
        listFilterFields={displayedListFilterFields}
        listFilterResetDisabled={!listFiltersDirty || selection.activeGridCellKey != null}
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
        listInitialLoading={analysisData.rowsInitialLoading && !rows.length}
        listRefreshing={analysisData.rowsRefreshing}
        initialLabel="경쟁사 분석 목록을 불러오는 중"
        refreshLabel="경쟁사 분석 목록을 갱신하는 중"
        queryEndControl={(
          <div className={styles.periodPresetRowEndGroup}>
            <DashboardRequestStatus compact items={[{ label: '경쟁 채널', state: channelsRequest }, { label: '경쟁사 분석 목록', state: rowsRequest }]} />
            <AnalysisPeriodQueryButton disabled={!filters.periodQueryDirty} onClick={filters.applyPeriodQuery} />
          </div>
        )}
        listFilterEndContent={(
          <>
            <label className={styles.periodPresetRowToggle}>
              <input
                type="checkbox"
                checked={showRowsWithSelfSalesOnly}
                disabled={selection.activeGridCellKey != null}
                onChange={(event: React.ChangeEvent<HTMLInputElement, HTMLInputElement>) : void => setShowRowsWithSelfSalesOnly(event.target.checked)}
              />
              <span title="자사 판매량이 존재하는 경우만 표시합니다.">자사기준보기</span>
            </label>
            {activeScatterCellNotice ? <div className={styles.analysisFilterLockNotice}>{activeScatterCellNotice}</div> : null}
          </>
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
        onResetListFilters={resetListFilters}
        leftPanel={(
          <>
            {analysisData.rowsInitialLoading && !rows.length ? (
              <div className={styles.analysisPanelLoading}><LoadingSpinner label="분석 지표를 불러오는 중" /></div>
            ) : <CompetitorKpiGrid competitorLabel={competitorAxisLabel} selfCompanyLabel={common.selfCompanyLabel} {...kpi} />}
            <AnalysisScatterChartCard<AnalysisScatterGridPoint>
              title="자사·경쟁사 판매량 비교"
              data={scatterView.scatterData}
              chartBodyRef={common.chartBodyRef}
              chartReady={common.chartReady}
              width={scatterView.scatterChartWidth}
              height={scatterView.scatterChartHeight}
              loading={(analysisData.rowsInitialLoading || analysisData.rowsRefreshing) && scatterView.scatterData.length === 0}
              pointRadius={scatterView.scatterPointRadius}
              activeCellKey={selection.activeGridCellKey}
              onCellClick={selection.onScatterCellClick}
              onClearSelection={selection.clearActiveGridCell}
              renderTooltip={renderQtyScatterTooltip}
              xAxis={{ name: `${common.selfCompanyLabel} 판매량(EA)`, label: common.selfCompanyLabel, labelColor: 'var(--analysis-self-series-color)' }}
              yAxis={{ name: `${competitorAxisLabel} 판매량(EA)`, label: competitorAxisLabel, labelColor: 'var(--analysis-competitor-series-color)', width: 38, tickMargin: 4 }}
            />
          </>
        )}
        listPanel={(
          <CompetitorAnalysisList
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
        competitorChannelId={activeCompetitorChannelId}
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
