import { useCallback, useMemo, useState } from 'react'
import { getCompetitorSales, getCompetitorSalesScatterGrid, getSecondaryCompetitorChannels } from '../../api'
import type { ScatterSalesGridResponse, SecondaryCompetitorChannel } from '../../api/types'
import { LoadingSpinner } from '../../components/LoadingSpinner'
import type { CompetitorSalesRow } from '../../types'
import { AnalysisDrawerBulkAdd } from '../components/AnalysisDrawerBulkAdd'
import { AnalysisPageLayout } from '../components/AnalysisPageLayout'
import { AnalysisScatterChartCard } from '../components/AnalysisScatterChartCard'
import { createCompetitorSalesScatterTooltip } from '../components/AnalysisScatterTooltips'
import { CompetitorAnalysisList } from '../components/CompetitorAnalysisList'
import { CompetitorFilterEndControls } from '../components/CompetitorFilterEndControls'
import { CompetitorKpiGrid } from '../components/CompetitorKpiGrid'
import { DashboardRequestStatus } from '../components/DashboardRequestStatus'
import styles from '../components/common.module.css'
import { useAnalysisPageCommonState } from '../hooks/useAnalysisPageCommonState'
import { useAnalysisPageSelection } from '../hooks/useAnalysisPageSelection'
import { useAnalysisSalesFilters, maskNonPeriodAnalysisFilterFields } from '../hooks/useAnalysisSalesFilters'
import { useAnalysisScatterGridView } from '../hooks/useAnalysisScatterGridView'
import { useDashboardRequest } from '../hooks/useDashboardRequest'
import { useProductDrawerBundleState } from '../hooks/useProductDrawerBundle'
import type { AnalysisScatterGridPoint } from '../model/analysisScatterGridPoint'
import type { FilterField } from '../model/filterField'

const EMPTY_COMPETITOR_ROWS: CompetitorSalesRow[] = []
const EMPTY_COMPETITOR_CHANNELS: SecondaryCompetitorChannel[] = []
const ALL_CHANNEL_LABEL = '전체'
const ALL_COMPANY_BULK_ADD_DISABLED = '전체 선택 상태에서는 오더 후보군에 추가할 수 없습니다. 회사를 선택하세요.'

export const CompetitorPage = () => {
  const [bulkAddOpen, setBulkAddOpen] = useState(false)
  const [competitorChannelLabel, setCompetitorChannelLabel] = useState(ALL_CHANNEL_LABEL)
  const [showRowsWithSelfSalesOnly, setShowRowsWithSelfSalesOnly] = useState(false)
  const common = useAnalysisPageCommonState()
  const filters = useAnalysisSalesFilters(common.companyUuid)
  const channelsRequest = useDashboardRequest(getSecondaryCompetitorChannels, EMPTY_COMPETITOR_CHANNELS)
  const { data: channels } = channelsRequest
  const competitorChannelId = useMemo(
    () => (competitorChannelLabel === ALL_CHANNEL_LABEL ? undefined : channels.find((ch) => ch.label === competitorChannelLabel)?.id),
    [channels, competitorChannelLabel],
  )
  const salesParams = useMemo(() => ({ ...filters.salesParams, competitorChannelId }), [competitorChannelId, filters.salesParams])
  const loadRows = useCallback(() => getCompetitorSales(salesParams), [salesParams])
  const loadScatterGrid = useCallback(() => getCompetitorSalesScatterGrid(salesParams), [salesParams])
  const rowsRequest = useDashboardRequest(loadRows, EMPTY_COMPETITOR_ROWS)
  const scatterGridRequest = useDashboardRequest<ScatterSalesGridResponse | null>(loadScatterGrid, null)
  const { data: rows, loading: rowsLoading } = rowsRequest
  const { data: scatterGrid, loading: scatterGridLoading } = scatterGridRequest
  const baseRows = useMemo(() => (showRowsWithSelfSalesOnly ? rows.filter((row) => row.selfQty != null) : rows), [rows, showRowsWithSelfSalesOnly])
  const selection = useAnalysisPageSelection({ rows: baseRows, scatterGrid, bulkAddOpen })
  const summaryBundleState = useProductDrawerBundleState(selection.selectedSkuGroupKey, { companyUuid: common.companyUuid })

  const competitorFilterFields = useMemo<FilterField[]>(() => [
    ...filters.filterFields,
    { label: '경쟁 채널', kind: 'select', value: competitorChannelLabel, onChange: setCompetitorChannelLabel, options: [ALL_CHANNEL_LABEL, ...channels.map((ch) => ch.label)] },
  ], [channels, competitorChannelLabel, filters.filterFields])
  const displayedFilterFields = useMemo(
    () => (selection.activeGridCellKey ? maskNonPeriodAnalysisFilterFields(competitorFilterFields) : competitorFilterFields),
    [competitorFilterFields, selection.activeGridCellKey],
  )
  const competitorAxisLabel = competitorChannelLabel === ALL_CHANNEL_LABEL ? '전체 경쟁사' : competitorChannelLabel
  const kpi = useMemo(() => selection.visibleRows.reduce((acc, row) => ({
    totalCompetitorAmount: acc.totalCompetitorAmount + row.competitorAmount,
    totalSelfAmount: acc.totalSelfAmount + (row.selfAmount ?? 0),
    totalCompetitorQty: acc.totalCompetitorQty + row.competitorQty,
    totalSelfQty: acc.totalSelfQty + (row.selfQty ?? 0),
  }), { totalCompetitorAmount: 0, totalSelfAmount: 0, totalCompetitorQty: 0, totalSelfQty: 0 }), [selection.visibleRows])
  const scatterView = useAnalysisScatterGridView({ scatterGrid, chartWidth: common.chartWidth, chartHeight: common.chartHeight })
  const renderQtyScatterTooltip = useMemo(
    () => createCompetitorSalesScatterTooltip(competitorAxisLabel, common.selfCompanyLabel),
    [common.selfCompanyLabel, competitorAxisLabel],
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
        initialLoading={rowsLoading && !rows.length}
        refreshing={rowsRequest.isRefreshing}
        initialLabel="경쟁사 분석 목록을 불러오는 중"
        refreshLabel="경쟁사 분석 목록을 갱신하는 중"
        endControl={(
          <CompetitorFilterEndControls
            selfCompanyLabel={common.selfCompanyLabel}
            showRowsWithSelfSalesOnly={showRowsWithSelfSalesOnly}
            bulkSelectedCount={selection.bulkSelectedCount}
            queryDisabled={!filters.periodQueryDirty}
            candidateAddDisabledReason={common.isAllCompanySelected ? ALL_COMPANY_BULK_ADD_DISABLED : undefined}
            requestStatus={<DashboardRequestStatus compact items={[{ label: '경쟁 채널', state: channelsRequest }, { label: '경쟁사 분석 목록', state: rowsRequest }, { label: '산점도', state: scatterGridRequest }]} />}
            onSelfSalesOnlyChange={setShowRowsWithSelfSalesOnly}
            onOpenBulkAdd={() => setBulkAddOpen(true)}
            onApplyPeriodQuery={filters.applyPeriodQuery}
          />
        )}
        leftPanel={(
          <>
            {rowsLoading && !rows.length ? (
              <div className={styles.analysisPanelLoading}><LoadingSpinner label="분석 지표를 불러오는 중" /></div>
            ) : <CompetitorKpiGrid selfCompanyLabel={common.selfCompanyLabel} {...kpi} />}
            <AnalysisScatterChartCard<AnalysisScatterGridPoint>
              title={`경쟁사·${common.selfCompanyLabel} 판매량 비교`}
              data={scatterView.scatterData}
              chartBodyRef={common.chartBodyRef}
              chartReady={common.chartReady}
              width={scatterView.scatterChartWidth}
              height={scatterView.scatterChartHeight}
              loading={scatterGridLoading && scatterView.scatterData.length === 0}
              pointRadius={scatterView.scatterPointRadius}
              activeCellKey={selection.activeGridCellKey}
              onCellClick={selection.onScatterCellClick}
              onClearSelection={selection.clearActiveGridCell}
              renderTooltip={renderQtyScatterTooltip}
              xAxis={{ name: `${common.selfCompanyLabel} 판매량(EA)`, label: common.selfCompanyLabel, labelColor: '#2563eb' }}
              yAxis={{ name: `${competitorAxisLabel} 판매량(EA)`, label: competitorAxisLabel, labelColor: '#ef4444', width: 38, tickMargin: 4 }}
            />
          </>
        )}
        listPanel={(
          <CompetitorAnalysisList
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
