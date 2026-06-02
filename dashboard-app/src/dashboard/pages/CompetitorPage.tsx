import { useCallback, useMemo, useState } from 'react'
import { getCompetitorSales, getCompetitorSalesScatterGrid, getSecondaryCompetitorChannels } from '../../api'
import type { ScatterSalesGridResponse, SecondaryCompetitorChannel } from '../../api/types'
import { LoadingSpinner } from '../../components/LoadingSpinner'
import type { CompetitorSalesRow } from '../../types'
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
import { maskAnalysisListFilterFields, useAnalysisSalesFilters } from '../hooks/useAnalysisSalesFilters'
import { useAnalysisScatterGridView } from '../hooks/useAnalysisScatterGridView'
import { useDashboardRequest } from '../hooks/useDashboardRequest'
import { useProductDrawerBundleState } from '../hooks/useProductDrawerBundle'
import { buildAnalysisSalesRequestKey } from '../model/analysisSalesRequestKey'
import type { AnalysisScatterGridPoint } from '../model/analysisScatterGridPoint'
import type { FilterField } from '../model/filterField'

const EMPTY_COMPETITOR_ROWS: CompetitorSalesRow[] = []
const EMPTY_COMPETITOR_CHANNELS: SecondaryCompetitorChannel[] = []
const ALL_CHANNEL_LABEL = '전체'
const ALL_COMPANY_BULK_ADD_DISABLED = '전체 선택 상태에서는 오더 후보군에 추가할 수 없습니다. 회사를 선택하세요.'

export const CompetitorPage = () => {
  const [bulkAddOpen, setBulkAddOpen] = useState(false)
  const [competitorChannelId, setCompetitorChannelId] = useState<string | undefined>(undefined)
  const [showRowsWithSelfSalesOnly, setShowRowsWithSelfSalesOnly] = useState(false)
  const common = useAnalysisPageCommonState()
  const filters = useAnalysisSalesFilters(common.companyUuid)
  const channelsRequest = useDashboardRequest(getSecondaryCompetitorChannels, EMPTY_COMPETITOR_CHANNELS)
  const { data: channels } = channelsRequest
  const selectedCompetitorChannel = useMemo(
    () => competitorChannelId ? channels.find((ch) => ch.id === competitorChannelId) : undefined,
    [channels, competitorChannelId],
  )
  const activeCompetitorChannelId = selectedCompetitorChannel?.id
  const competitorChannelLabel = selectedCompetitorChannel?.label ?? ALL_CHANNEL_LABEL
  const onCompetitorChannelChange = useCallback((label: string) => {
    if (label === ALL_CHANNEL_LABEL) {
      setCompetitorChannelId(undefined)
      return
    }
    setCompetitorChannelId(channels.find((ch) => ch.label === label)?.id)
  }, [channels])
  const salesParams = useMemo(() => ({ ...filters.salesParams, competitorChannelId: activeCompetitorChannelId }), [activeCompetitorChannelId, filters.salesParams])
  const analysisRequestKey = useMemo(() => buildAnalysisSalesRequestKey(salesParams), [salesParams])
  const loadRows = useCallback(() => getCompetitorSales(salesParams), [salesParams])
  const loadScatterGrid = useCallback(() => getCompetitorSalesScatterGrid(salesParams), [salesParams])
  const rowsRequest = useDashboardRequest(loadRows, EMPTY_COMPETITOR_ROWS, analysisRequestKey)
  const scatterGridRequest = useDashboardRequest<ScatterSalesGridResponse | null>(loadScatterGrid, null, analysisRequestKey)
  const analysisData = useAnalysisSalesDataGate({
    rowsRequest,
    scatterGridRequest,
    requestKey: analysisRequestKey,
    emptyRows: EMPTY_COMPETITOR_ROWS,
  })
  const { rows, scatterGrid } = analysisData
  const baseRows = useMemo(() => (showRowsWithSelfSalesOnly ? rows.filter((row) => row.selfQty != null) : rows), [rows, showRowsWithSelfSalesOnly])
  const selection = useAnalysisPageSelection({ rows: baseRows, scatterGrid, bulkAddOpen })
  const summaryBundleState = useProductDrawerBundleState(selection.selectedSkuGroupKey, { companyUuid: common.companyUuid })

  const competitorQueryFields = useMemo<FilterField[]>(() => [
    ...filters.queryFields,
    { label: '경쟁 채널', kind: 'select', value: competitorChannelLabel, onChange: onCompetitorChannelChange, options: [ALL_CHANNEL_LABEL, ...channels.map((ch) => ch.label)] },
  ], [channels, competitorChannelLabel, filters.queryFields, onCompetitorChannelChange])
  const displayedListFilterFields = useMemo(
    () => (selection.activeGridCellKey ? maskAnalysisListFilterFields(filters.listFilterFields) : filters.listFilterFields),
    [filters.listFilterFields, selection.activeGridCellKey],
  )
  const resetListFilters = useCallback(() => {
    filters.resetListFilters()
    setShowRowsWithSelfSalesOnly(false)
  }, [filters])
  const listFiltersDirty = filters.listFiltersDirty || showRowsWithSelfSalesOnly
  const competitorAxisLabel = competitorChannelLabel === ALL_CHANNEL_LABEL ? '전체 경쟁사' : competitorChannelLabel
  const kpi = useMemo(() => {
    const rowsWithSelfAmount = selection.visibleRows.filter((row) => row.selfAmount != null)
    const rowsWithSelfQty = selection.visibleRows.filter((row) => row.selfQty != null)
    return {
      totalCompetitorAmount: selection.visibleRows.reduce((sum, row) => sum + row.competitorAmount, 0),
      totalSelfAmount: rowsWithSelfAmount.length
        ? rowsWithSelfAmount.reduce((sum, row) => sum + row.selfAmount!, 0)
        : null,
      totalCompetitorQty: selection.visibleRows.reduce((sum, row) => sum + row.competitorQty, 0),
      totalSelfQty: rowsWithSelfQty.length
        ? rowsWithSelfQty.reduce((sum, row) => sum + row.selfQty!, 0)
        : null,
    }
  }, [selection.visibleRows])
  const scatterView = useAnalysisScatterGridView({ scatterGrid, chartWidth: common.chartWidth, chartHeight: common.chartHeight })
  const renderQtyScatterTooltip = useMemo(
    () => createCompetitorSalesScatterTooltip(competitorAxisLabel, common.selfCompanyLabel),
    [common.selfCompanyLabel, competitorAxisLabel],
  )

  return (
    <section className={styles.page}>
      <AnalysisPageLayout
        queryFields={competitorQueryFields}
        listFilterFields={displayedListFilterFields}
        listFilterResetDisabled={!listFiltersDirty}
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
        initialLabel="경쟁사 분석 목록을 불러오는 중"
        refreshLabel="경쟁사 분석 목록을 갱신하는 중"
        queryEndControl={(
          <div className={styles.periodPresetRowEndGroup}>
            <DashboardRequestStatus compact items={[{ label: '경쟁 채널', state: channelsRequest }, { label: '경쟁사 분석 목록', state: rowsRequest }, { label: '산점도', state: scatterGridRequest }]} />
            <AnalysisPeriodQueryButton disabled={!filters.periodQueryDirty} onClick={filters.applyPeriodQuery} />
          </div>
        )}
        listFilterEndContent={(
          <>
            <label className={styles.periodPresetRowToggle}>
              <input
                type="checkbox"
                checked={showRowsWithSelfSalesOnly}
                onChange={(event) => setShowRowsWithSelfSalesOnly(event.target.checked)}
              />
              <span title="자사 판매량이 존재하는 경우만 표시합니다.">자사 기준으로 보기</span>
            </label>
          </>
        )}
        listActionContent={(
          <button
            type="button"
            className={`${styles.actionBtn} ${styles.btnPrimary} ${styles.analysisBulkAddButton}`}
            onClick={() => setBulkAddOpen(true)}
            disabled={common.isAllCompanySelected || selection.bulkSelectedCount === 0}
            title={common.isAllCompanySelected ? ALL_COMPANY_BULK_ADD_DISABLED : undefined}
          >
            후보군으로
          </button>
        )}
        onResetListFilters={resetListFilters}
        leftPanel={(
          <>
            {analysisData.initialLoading && !rows.length ? (
              <div className={styles.analysisPanelLoading}><LoadingSpinner label="분석 지표를 불러오는 중" /></div>
            ) : <CompetitorKpiGrid selfCompanyLabel={common.selfCompanyLabel} {...kpi} />}
            <AnalysisScatterChartCard<AnalysisScatterGridPoint>
              title={`경쟁사·${common.selfCompanyLabel} 판매량 비교`}
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
              renderTooltip={renderQtyScatterTooltip}
              xAxis={{ name: `${common.selfCompanyLabel} 판매량(EA)`, label: common.selfCompanyLabel, labelColor: '#2563eb' }}
              yAxis={{ name: `${competitorAxisLabel} 판매량(EA)`, label: competitorAxisLabel, labelColor: '#ef4444', width: 38, tickMargin: 4 }}
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
