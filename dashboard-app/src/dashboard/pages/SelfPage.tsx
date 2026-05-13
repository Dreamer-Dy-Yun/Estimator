import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { CartesianGrid, Scatter, ScatterChart, Tooltip, XAxis, YAxis } from 'recharts'
import { getSelfSales } from '../../api'
import type { SelfSalesRow } from '../../types'
import { selfSalesWeightedMarginRate, selfSalesWeightedOpMarginRate } from '../../utils/analysisKpiWeighted'
import type { AdjacentDirection } from '../../utils/adjacentListNavigation'
import { adjacentIdInOrder } from '../../utils/adjacentListNavigation'
import { clampForecastMonths, readForecastMonthsFromStorage, writeForecastMonthsToStorage } from '../../utils/forecastMonthsStorage'
import { formatGroupedNumber, formatPercent } from '../../utils/format'
import { CopyToastBanner } from '../components/CopyToastBanner'
import { useCopyToastMessage } from '../components/useCopyToastMessage'
import { AnalysisCandidateBulkAddModal } from '../components/candidate-stash/AnalysisCandidateBulkAddModal'
import { ProductDrawer } from '../components/product-drawer/ProductDrawer'
import styles from '../components/common.module.css'
import { AnalysisList } from '../components/AnalysisList'
import { AnalysisPeriodTools } from '../components/AnalysisPeriodTools'
import { ChartCard } from '../components/ChartCard'
import { FilterBar } from '../components/FilterBar'
import { KpiGrid } from '../components/KpiGrid'
import { useElementSize } from '../hooks/useElementSize'
import { useAnalysisSalesFilters } from '../hooks/useAnalysisSalesFilters'
import { useProductDrawerBundle } from '../hooks/useProductDrawerBundle'

type ScatterPoint = {
  x: number
  y: number
  brand: string
  code: string
  productName: string
  colorCode: string
  copyText: string
}

export const SelfPage = () => {
  const [rows, setRows] = useState<SelfSalesRow[]>([])
  const [selectedSkuGroupKey, setSelectedSkuGroupKey] = useState<string | null>(null)
  const [bulkSelectedSkuGroupKeys, setBulkSelectedSkuGroupKeys] = useState<Set<string>>(() => new Set())
  const [bulkAddOpen, setBulkAddOpen] = useState(false)
  const { toastMessage, copyAndNotify } = useCopyToastMessage()
  const [forecastMonths, setForecastMonths] = useState(() => readForecastMonthsFromStorage())
  const summaryBundle = useProductDrawerBundle(selectedSkuGroupKey)
  const { ref: chartBodyRef, width: chartWidth, height: chartHeight, ready: chartReady } = useElementSize<HTMLDivElement>()

  const onForecastMonthsChange = useCallback((n: number) => {
    const v = clampForecastMonths(n)
    setForecastMonths(v)
    writeForecastMonthsToStorage(v)
  }, [])
  const salesReqSeqRef = useRef(0)
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

  useEffect(() => {
    let alive = true
    const reqSeq = ++salesReqSeqRef.current
    void getSelfSales(salesParams).then((data) => {
      if (!alive) return
      if (reqSeq !== salesReqSeqRef.current) return
      setRows(data)
    })
    return () => {
      alive = false
    }
  }, [salesParams])

  const kpi = useMemo(() => {
    const totalAmount = rows.reduce((acc, row) => acc + row.amount, 0)
    const totalQty = rows.reduce((acc, row) => acc + row.qty, 0)
    const avgMarginRate = selfSalesWeightedMarginRate(rows)
    const avgOpMarginRate = selfSalesWeightedOpMarginRate(rows)
    return { totalAmount, totalQty, avgMarginRate, avgOpMarginRate }
  }, [rows])

  const scatterData: ScatterPoint[] = useMemo(
    () => rows.map((r) => {
      const yMillion = Math.round(r.amount / 1000000)
      const copyText = [
        '[자사 분석 · 판매액/영업이익률 분석]',
        `기간: ${periodStartDate} ~ ${periodEndDate}`,
        `브랜드: ${r.brand}`,
        `카테고리: ${r.category}`,
        `품번: ${r.code}`,
        `상품명: ${r.productName}`,
        `색상: ${r.colorCode}`,
        `평균판매가(원): ${formatGroupedNumber(r.avgPrice)}`,
        `평균매입원가(원): ${formatGroupedNumber(r.avgCost)}`,
        `판매량(EA): ${formatGroupedNumber(r.qty)}`,
        `총판매액(원): ${formatGroupedNumber(r.amount)}`,
        `매출이익율: ${formatPercent(r.marginRate)}`,
        `영업이익율: ${formatPercent(r.opMarginRate)}`,
        `차트 X(영업이익율): ${formatPercent(r.opMarginRate)}`,
        `차트 Y(판매액): ${yMillion}백만`,
      ].join('\n')
      return {
        x: r.opMarginRate,
        y: yMillion,
        brand: r.brand,
        code: r.code,
        productName: r.productName,
        colorCode: r.colorCode,
        copyText,
      }
    }),
    [rows, periodStartDate, periodEndDate],
  )

  const navigationOrderIds = useMemo(() => rows.map((r) => r.skuGroupKey), [rows])
  const bulkSelectedCount = bulkSelectedSkuGroupKeys.size
  const allRowsSelected = rows.length > 0 && bulkSelectedCount === rows.length
  const selectedSkuGroupKeys = useMemo(() => [...bulkSelectedSkuGroupKeys], [bulkSelectedSkuGroupKeys])

  useEffect(() => {
    setBulkSelectedSkuGroupKeys((prev) => {
      const available = new Set(rows.map((row) => row.skuGroupKey))
      const next = new Set([...prev].filter((id) => available.has(id)))
      return next.size === prev.size ? prev : next
    })
  }, [rows])

  const onRequestNavigateAdjacent = useCallback(
    (direction: AdjacentDirection) => {
      if (!selectedSkuGroupKey) return
      const nextId = adjacentIdInOrder(navigationOrderIds, selectedSkuGroupKey, direction)
      if (nextId != null && nextId !== selectedSkuGroupKey) setSelectedSkuGroupKey(nextId)
    },
    [navigationOrderIds, selectedSkuGroupKey],
  )

  const renderScatterTooltip = (props: { active?: boolean; payload?: ReadonlyArray<{ payload?: ScatterPoint }> }) => {
    const { active, payload } = props
    if (!active || !payload?.length) return null
    const point = payload[0]?.payload
    if (!point) return null

    return (
      <div className={styles.chartTooltip}>
        <div className={styles.chartTooltipTitle}>{point.brand}</div>
        <div className={styles.chartTooltipText}>{point.productName}</div>
        <div className={styles.chartTooltipText}>품번: {point.code}</div>
        <div className={styles.chartTooltipText}>색상: {point.colorCode}</div>
        <div className={styles.chartTooltipText}>영업이익율: {formatPercent(point.x)}</div>
        <div className={styles.chartTooltipText}>판매액: {point.y}백만</div>
        <div className={styles.chartTooltipHint}>클릭 시 클립보드에 복사</div>
      </div>
    )
  }

  const toggleBulkRow = (id: string) => {
    setBulkSelectedSkuGroupKeys((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleAllRows = () => {
    setBulkSelectedSkuGroupKeys(() => (allRowsSelected ? new Set() : new Set(rows.map((row) => row.skuGroupKey))))
  }

  const scatterShape = useCallback(
    (props: { cx?: number; cy?: number; payload?: ScatterPoint }) => {
      const { cx, cy, payload } = props
      if (cx == null || cy == null || !payload) return null
      return (
        <circle
          cx={cx}
          cy={cy}
          r={5}
          fill="#3b82f6"
          style={{ cursor: 'pointer' }}
          onClick={(e) => {
            e.stopPropagation()
            void copyAndNotify(payload.copyText)
          }}
        />
      )
    },
    [copyAndNotify],
  )

  const scatterChartWidth = Math.max(1, Math.floor(chartWidth))
  const scatterChartHeight = Math.max(1, Math.floor(chartHeight))

  return (
    <section className={styles.page}>
      <CopyToastBanner message={toastMessage} />
      <FilterBar
        title=""
        filterClassName={styles.filterAnalysisGrid}
        fields={filterFields}
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
          />
        )}
      />
      <div className={styles.analysisBulkActionBar}>
        <span className={styles.analysisSelectionCount}>선택 {bulkSelectedCount}개</span>
        <button
          type="button"
          className={`${styles.actionBtn} ${styles.btnPrimary} ${styles.analysisBulkAddButton}`}
          onClick={() => setBulkAddOpen(true)}
          disabled={bulkSelectedCount === 0}
        >
          선택한 물품을 후보군으로
        </button>
      </div>

      <div className={`${styles.twoCol} ${styles.selfTwoCol}`}>
        <div className={`${styles.leftCol} ${styles.selfLeftCol}`}>
          <KpiGrid
            stacked
            items={[
              { label: '총 판매액', value: formatGroupedNumber(kpi.totalAmount), unit: '원' },
              { label: '총 판매량', value: formatGroupedNumber(kpi.totalQty), unit: 'EA' },
              { label: '평균 매출 이익율', value: kpi.avgMarginRate.toFixed(1), unit: '%' },
              { label: '평균 영업이익율', value: kpi.avgOpMarginRate.toFixed(1), unit: '%' },
            ]}
          />

          <ChartCard title="판매액/영업이익률 분석" className={styles.selfChartCard}>
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
                    name="영업이익률"
                    unit="%"
                    tickFormatter={(v) => `${v}`}
                    tick={{ fontSize: 10 }}
                    label={{
                      value: '영업이익률',
                      position: 'insideBottom',
                      offset: -10,
                      style: { fill: '#475569', fontSize: 11, fontWeight: 600 },
                    }}
                  />
                  <YAxis
                    type="number"
                    dataKey="y"
                    name="판매액(백만 원)"
                    tick={{ fontSize: 10 }}
                    width={42}
                    tickMargin={4}
                    label={{
                      value: '판매액(백만 원)',
                      angle: -90,
                      position: 'insideLeft',
                      offset: 0,
                      style: { fill: '#475569', fontSize: 11, fontWeight: 600 },
                    }}
                  />
                  <Tooltip content={renderScatterTooltip} />
                  <Scatter fill="#3b82f6" shape={scatterShape} />
                </ScatterChart>
              ) : null}
            </div>
          </ChartCard>
        </div>

        <AnalysisList<SelfSalesRow>
          columns={[
            {
              key: 'bulkSelect',
              header: (
                <input
                  type="checkbox"
                  checked={allRowsSelected}
                  disabled={rows.length === 0}
                  aria-label="전체 선택"
                  onChange={toggleAllRows}
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
            { key: 'avgPrice', header: '평균판매가', cell: (r) => formatGroupedNumber(r.avgPrice), align: 'right', sortValue: (r) => r.avgPrice },
            { key: 'avgCost', header: '평균매입원가', cell: (r) => formatGroupedNumber(r.avgCost), align: 'right', sortValue: (r) => r.avgCost },
            { key: 'qty', header: '판매량', cell: (r) => formatGroupedNumber(r.qty), align: 'right', sortValue: (r) => r.qty },
            { key: 'amount', header: '총판매액', cell: (r) => formatGroupedNumber(r.amount), align: 'right', sortValue: (r) => r.amount },
            { key: 'margin', header: '매출이익율', cell: (r) => formatPercent(r.marginRate), align: 'right', sortValue: (r) => r.marginRate },
            { key: 'op', header: '영업이익률', cell: (r) => formatPercent(r.opMarginRate), align: 'right', sortValue: (r) => r.opMarginRate },
          ]}
          rows={rows}
          defaultSort={{ key: 'qty', dir: 'desc' }}
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
