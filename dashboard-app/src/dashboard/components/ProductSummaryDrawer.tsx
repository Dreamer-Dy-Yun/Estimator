import { useEffect, useId, useMemo, useRef, useState, type WheelEvent } from 'react'
import { ApiUnitErrorBadge } from '../../components/ApiUnitErrorBadge'
import { ComponentErrorBoundary } from '../../components/ComponentErrorBoundary'
import type {
  ProductSalesInsight,
  ProductSecondaryDetail,
  ProductStockTrendPoint,
  SecondaryCompetitorChannel,
} from '../../api'
import { dashboardApi } from '../../api'
import type { ApiUnitErrorInfo, ProductPrimarySummary } from '../../types'
import type { AdjacentDirection } from '../../utils/adjacentListNavigation'
import { monthToEndDate, monthToStartDate } from '../../utils/date'
import { formatGroupedNumber } from '../../utils/format'
import { SalesTrendChart } from './trend/SalesTrendChart'
import { buildShadeRanges, normalizeMonthKey } from './trend/trendRangeUtils'
import { ProductSecondaryPanel } from './product-secondary/ProductSecondaryPanel'
import { SalesMetricsCard } from './product-secondary/cards/SalesMetricsCard'
import { KO } from './product-secondary/ko'
import type { CandidateItemPanelContext } from './product-secondary/candidateActionCards'
import type { OrderSnapshotDocumentV1 } from '../../snapshot/orderSnapshotTypes'
import { DRAWER_KEEP_OPEN_SELECTOR } from '../drawer/drawerDom'
import { setBodyPrimaryDrawerOpen } from '../drawer/primaryDrawerBody'
import styles from './common.module.css'

/** `detail`이 있을 때만 마운트 — 바깥에서 `null` 반환 시 훅 개수가 달라지는 문제 방지 */
function ProductSummaryDrawerContent({
  summary,
  stockTrend,
  onClose,
  periodStart,
  periodEnd,
  forecastMonths,
  onForecastMonthsChange,
  hydrateSnapshot,
  initialExpandSecondary,
  candidateItemContext,
  onRequestNavigateAdjacent,
  disableAdjacentNavigation,
  suppressDocumentLayoutShift,
  closing = false,
}: {
  summary: ProductPrimarySummary
  stockTrend: ProductStockTrendPoint[]
  onClose: () => void
  periodStart: string
  periodEnd: string
  forecastMonths: number
  onForecastMonthsChange: (months: number) => void
  hydrateSnapshot?: OrderSnapshotDocumentV1 | null
  initialExpandSecondary?: boolean
  candidateItemContext?: CandidateItemPanelContext | null
  /** 2차 패널 준비 완료 시 ←/→로 목록 이전·다음 요청(페이지에서 필터 순서 반영). */
  onRequestNavigateAdjacent?: (direction: AdjacentDirection) => void | Promise<void>
  /** 모달 등 열림 시 true — 방향키 네비 비활성. */
  disableAdjacentNavigation?: boolean
  /**
   * true: `body` 레이아웃(본문 padding 등)에 손대지 않음.
   * 이너 오더 모달처럼 부모가 뷰포트만 조정할 때 사용.
   */
  suppressDocumentLayoutShift?: boolean
  closing?: boolean
}) {
  void stockTrend
  const forecastMonthsLabelId = useId()

  const drawerRef = useRef<HTMLElement | null>(null)
  const forecastComboRef = useRef<HTMLDivElement | null>(null)
  const salesTrendChartClipRef = useRef<HTMLDivElement | null>(null)
  const salesInsightReqSeqRef = useRef(0)
  const [forecastComboOpen, setForecastComboOpen] = useState(false)
  const [competitorChannels, setCompetitorChannels] = useState<SecondaryCompetitorChannel[]>([])
  const [channelId, setChannelId] = useState('')
  const [channelsError, setChannelsError] = useState<ApiUnitErrorInfo | null>(null)
  const [salesInsight, setSalesInsight] = useState<ProductSalesInsight | null>(null)
  const [salesInsightError, setSalesInsightError] = useState<ApiUnitErrorInfo | null>(null)
  const [salesTrendVisible, setSalesTrendVisible] = useState({ self: true, competitor: true })

  useEffect(() => {
    if (suppressDocumentLayoutShift) return
    setBodyPrimaryDrawerOpen(true)
    return () => setBodyPrimaryDrawerOpen(false)
  }, [suppressDocumentLayoutShift])

  useEffect(() => {
    if (!forecastComboOpen) return
    const onDocDown = (e: MouseEvent) => {
      const el = forecastComboRef.current
      if (el && !el.contains(e.target as Node)) setForecastComboOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setForecastComboOpen(false)
    }
    document.addEventListener('mousedown', onDocDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [forecastComboOpen])

  useEffect(() => {
    setForecastComboOpen(false)
  }, [summary.id])

  const [chartHovered, setChartHovered] = useState(false)
  /** 왼쪽 확장 패널(추가 콘텐츠 영역) */
  const [expandPaneOpen, setExpandPaneOpen] = useState(!!initialExpandSecondary)
  const [secondaryDetail, setSecondaryDetail] = useState<ProductSecondaryDetail | null>(null)
  const [secondaryDetailError, setSecondaryDetailError] = useState<ApiUnitErrorInfo | null>(null)

  useEffect(() => {
    setChartHovered(false)
    setExpandPaneOpen(!!initialExpandSecondary)
  }, [summary.id, initialExpandSecondary])

  const pageName = 'ProductSummaryDrawer'
  const makeApiErrorInfo = (request: string, err: unknown): ApiUnitErrorInfo => ({
    checkedAt: new Date().toISOString(),
    page: pageName,
    request,
    error: err instanceof Error ? err.message : String(err),
  })

  useEffect(() => {
    let alive = true
    void (async () => {
      try {
        const rows = await dashboardApi.getSecondaryCompetitorChannels()
        if (!alive) return
        if (!rows.length) throw new Error('경쟁사 채널 데이터가 비어 있습니다.')
        setCompetitorChannels(rows)
        setChannelId((prev) => prev || rows[0]?.id || '')
        setChannelsError(null)
      } catch (err) {
        if (!alive) return
        setCompetitorChannels([])
        setChannelId('')
        setChannelsError(makeApiErrorInfo('getSecondaryCompetitorChannels()', err))
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  /** 2차 패널이 열릴 때만 로드. 필터(예: 영업이익률 하한)를 두면 `getProductSecondaryDetail` 두 번째 인자·이 effect deps에 포함해 재요청. */
  const secondaryFromSnapshot =
    hydrateSnapshot?.drawer2?.secondary != null && hydrateSnapshot.drawer2.secondary.id === summary.id
      ? hydrateSnapshot.drawer2.secondary
      : null

  /** 스냅샷이 현재 상품이면 폼·확정 수량·AI 등 전부 복원 (2차 secondary는 스냅샷 또는 API) */
  const hydrateForPanel =
    hydrateSnapshot != null && hydrateSnapshot.productId === summary.id ? hydrateSnapshot : null

  useEffect(() => {
    if (!expandPaneOpen) {
      setSecondaryDetail(null)
      setSecondaryDetailError(null)
      return
    }
    if (secondaryFromSnapshot) {
      setSecondaryDetail(secondaryFromSnapshot)
      setSecondaryDetailError(null)
      return
    }
    let alive = true
    void (async () => {
      try {
        const d = await dashboardApi.getProductSecondaryDetail(summary.id)
        if (!alive) return
        if (!d) throw new Error('2차 상세 데이터가 비어 있습니다.')
        setSecondaryDetail(d)
        setSecondaryDetailError(null)
      } catch (err) {
        if (!alive) return
        setSecondaryDetail(null)
        setSecondaryDetailError(
          makeApiErrorInfo(`getProductSecondaryDetail(${JSON.stringify({ productId: summary.id })})`, err),
        )
      }
    })()
    return () => {
      alive = false
    }
  }, [expandPaneOpen, secondaryFromSnapshot, summary.id])

  const selectedStart = normalizeMonthKey(periodStart)
  const selectedEnd = normalizeMonthKey(periodEnd)
  const salesInsightStartDay = monthToStartDate(selectedStart)
  const salesInsightEndDay = monthToEndDate(selectedEnd)

  useEffect(() => {
    if (!channelId) {
      setSalesInsight(null)
      return
    }
    let alive = true
    const reqSeq = ++salesInsightReqSeqRef.current
    void (async () => {
      try {
        const data = await dashboardApi.getProductSalesInsight(summary.id, {
          startDate: salesInsightStartDay,
          endDate: salesInsightEndDay,
          competitorChannelId: channelId,
        })
        if (!alive || reqSeq !== salesInsightReqSeqRef.current) return
        setSalesInsight(data)
        setSalesInsightError(null)
      } catch (err) {
        if (!alive || reqSeq !== salesInsightReqSeqRef.current) return
        setSalesInsight(null)
        setSalesInsightError(
          makeApiErrorInfo(
            `getProductSalesInsight(${JSON.stringify({ productId: summary.id, startDate: salesInsightStartDay, endDate: salesInsightEndDay, competitorChannelId: channelId })})`,
            err,
          ),
        )
      }
    })()
    return () => {
      alive = false
    }
  }, [channelId, salesInsightEndDay, salesInsightStartDay, summary.id])

  const trendScale = 1
  const competitorSalesRatio =
    salesInsight && salesInsight.self.qty > 0
      ? Math.max(0, salesInsight.competitor.qty / salesInsight.self.qty)
      : 1

  const salesSeries = useMemo(() => summary.monthlySalesTrend.map((point, idx) => ({
    ...point,
    idx,
    sales: Math.round(point.sales * trendScale),
    competitorSales: point.isForecast
      ? null
      : Math.max(1, Math.round(point.sales * trendScale * competitorSalesRatio)),
  })), [competitorSalesRatio, summary.monthlySalesTrend])

  const { periodStartIdx, periodEndIdx, periodShade, forecastShade } = useMemo(
    () => buildShadeRanges(salesSeries, selectedStart, selectedEnd),
    [salesSeries, selectedEnd, selectedStart],
  )

  const periodLen = Math.max(1, periodEndIdx - periodStartIdx + 1)
  const lastSeriesIdx = salesSeries.length - 1
  /** 선택 기간 시작 ~ 시리즈 끝(포캐스트 끝)까지 한 화면에 넣기 위한 최소 폭 — 포캐스트가 길면 기존 periodLen*2(24)만으로는 2025 구간이 잘림 */
  const requiredSpan =
    periodStartIdx <= lastSeriesIdx ? lastSeriesIdx - periodStartIdx + 1 : salesSeries.length
  const baseWindowSize = Math.min(
    salesSeries.length,
    Math.max(8, periodLen * 2, requiredSpan),
  )
  const [windowSize, setWindowSize] = useState(baseWindowSize)

  useEffect(() => {
    setWindowSize(baseWindowSize)
  }, [baseWindowSize, summary.id])

  const hasForecastInSeries = salesSeries.some((p) => p.isForecast)

  let viewStart: number
  let viewEnd: number
  if (hasForecastInSeries) {
    /** 데이터 요청은 전 구간이 오나, 창 너비는 windowSize — 오른쪽 끝(포캐스트 끝) 고정으로 맞추면 왼쪽(선택 기간)이 같이 들어가게 baseWindowSize를 키움 */
    viewEnd = lastSeriesIdx
    viewStart = Math.max(0, viewEnd - windowSize + 1)
  } else {
    const center = (periodStartIdx + periodEndIdx) / 2
    const half = Math.floor(windowSize / 2)
    viewStart = Math.max(0, Math.round(center) - half)
    viewEnd = Math.min(lastSeriesIdx, viewStart + windowSize - 1)
    if (viewEnd - viewStart + 1 < windowSize) {
      viewStart = Math.max(0, viewEnd - windowSize + 1)
    }
  }

  const chartData = useMemo(() => {
    const firstForecastIdx = salesSeries.findIndex((point) => point.isForecast)
    const hasForecast = firstForecastIdx !== -1

    const out: Array<typeof salesSeries[number] & {
      actual: number | null
      competitorActual: number | null
      forecastLink: number | null
    }> = []

    for (let idx = 0; idx < salesSeries.length; idx += 1) {
      const point = salesSeries[idx]!
      out.push({
        ...point,
        actual: point.isForecast ? null : point.sales,
        competitorActual: point.isForecast ? null : point.competitorSales,
        forecastLink: hasForecast && (idx === firstForecastIdx - 1 || idx >= firstForecastIdx)
          ? point.sales
          : null,
      })
    }
    return out
  }, [salesSeries])

  const trendWindowData = useMemo(
    () => chartData.slice(viewStart, viewEnd + 1).map((row, i) => ({ ...row, idx: i })),
    [chartData, viewEnd, viewStart],
  )

  /** 월 포인트가 많을 때 가로축 라벨 밀도 상향 */
  const salesTrendChartDense = trendWindowData.length >= 18

  const shiftedPeriodShade = useMemo(() => {
    const min = -0.5
    const max = Math.max(0, viewEnd - viewStart) + 0.5
    const x1 = Math.max(min, periodShade.x1 - viewStart)
    const x2 = Math.min(max, periodShade.x2 - viewStart)
    return { x1, x2: Math.max(x1, x2) }
  }, [periodShade.x1, periodShade.x2, viewEnd, viewStart])

  const shiftedForecastShade = useMemo(() => {
    if (!forecastShade) return null
    const min = -0.5
    const max = Math.max(0, viewEnd - viewStart) + 0.5
    const x1 = Math.max(min, forecastShade.x1 - viewStart)
    const x2 = Math.min(max, forecastShade.x2 - viewStart)
    if (x2 < x1) return null
    return { x1, x2 }
  }, [forecastShade, viewEnd, viewStart])

  /** 현재 가로축에 보이는 구간만 반영해 Y축 상한을 데이터에 맞춤(Recharts 기본 nice tick이 6000 등으로 과하게 올라가는 것 방지) */
  const salesTrendYMax = useMemo(() => {
    let m = 0
    const from = Math.max(0, Math.min(viewStart, chartData.length - 1))
    const to = Math.max(from, Math.min(viewEnd, chartData.length - 1))
    for (let i = from; i <= to; i += 1) {
      const row = chartData[i]
      if (!row) continue
      m = Math.max(
        m,
        salesTrendVisible.self ? row.actual ?? 0 : 0,
        salesTrendVisible.self ? row.forecastLink ?? 0 : 0,
        salesTrendVisible.competitor ? row.competitorActual ?? 0 : 0,
      )
    }
    if (m <= 0) return 100
    return Math.ceil(m * 1.06)
  }, [chartData, salesTrendVisible.competitor, salesTrendVisible.self, viewStart, viewEnd])

  const toggleSalesTrendSeries = (series: 'self' | 'competitor') => {
    setSalesTrendVisible((prev) => {
      return { ...prev, [series]: !prev[series] }
    })
  }

  useEffect(() => {
    const onDocumentMouseDown = (event: MouseEvent) => {
      const path = event.composedPath()
      const clickedInsideDrawer = drawerRef.current ? path.includes(drawerRef.current) : false
      if (clickedInsideDrawer) return

      const clickedKeepOpenArea = path.some((node) => {
        if (!(node instanceof Element)) return false
        return Boolean(node.closest(DRAWER_KEEP_OPEN_SELECTOR))
      })
      if (clickedKeepOpenArea) return

      onClose()
    }

    document.addEventListener('mousedown', onDocumentMouseDown)
    return () => document.removeEventListener('mousedown', onDocumentMouseDown)
  }, [onClose])

  useEffect(() => {
    if (!onRequestNavigateAdjacent || disableAdjacentNavigation) return
    const ready =
      expandPaneOpen && secondaryDetail != null && secondaryDetailError == null
    if (!ready) return

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
      const target = e.target as HTMLElement | null
      if (target?.closest('input, textarea, select, [contenteditable="true"]')) return
      if (target?.closest('[data-filter-combo-panel]')) return
      e.preventDefault()
      const direction: AdjacentDirection = e.key === 'ArrowRight' ? 'next' : 'prev'
      void Promise.resolve(onRequestNavigateAdjacent(direction))
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [
    disableAdjacentNavigation,
    expandPaneOpen,
    onRequestNavigateAdjacent,
    secondaryDetail,
    secondaryDetailError,
  ])

  const onChartWheel = (event: WheelEvent<HTMLDivElement>) => {
    if (!chartHovered) return
    event.preventDefault()
    const next = event.deltaY > 0 ? windowSize + 2 : windowSize - 2
    const minWindow = Math.max(periodLen + 2, 6)
    setWindowSize(Math.max(minWindow, Math.min(salesSeries.length, next)))
  }

  const imageUrl = `https://placehold.co/640x360?text=${encodeURIComponent(summary.name)}`
  const salesMetricsError = salesInsightError ?? channelsError

  return (
    <aside
      ref={drawerRef}
      className={`${styles.drawer} ${expandPaneOpen ? styles.drawerWithExpandPane : ''} ${closing ? styles.drawerClosing : ''}`}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <div className={styles.drawerColumn}>
        <button
          type="button"
          className={styles.drawerExpandToggle}
          onClick={() => setExpandPaneOpen((v) => !v)}
          aria-expanded={expandPaneOpen}
          aria-label={expandPaneOpen ? '추가 영역 닫기' : '추가 영역 열기'}
        >
          <svg
            className={styles.drawerExpandToggleIcon}
            viewBox="0 0 24 24"
            aria-hidden="true"
            focusable="false"
          >
            {expandPaneOpen ? (
              <path
                d="M8 5.5L17 12L8 18.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ) : (
              <path
                d="M16 5.5L7 12L16 18.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}
          </svg>
        </button>
        <div className={styles.drawerHead}>
          <div className={styles.drawerHeadTitle}>
            <strong>상품 인사이트</strong>
            <span className={styles.periodMeta}>기간: {selectedStart} ~ {selectedEnd}</span>
          </div>
          <button
            type="button"
            className={`${styles.iconCloseButton} ${styles.drawerClose}`}
            onClick={onClose}
            aria-label="드로어 닫기"
          />
        </div>
        <div className={styles.drawerBody}>
        <ComponentErrorBoundary page={pageName} unit="PrimaryProductSummaryCard">
        <div className={`${styles.card} ${styles.productSummaryCard} ${expandPaneOpen ? styles.productSummaryCardMetaCollapsed : ''}`}>
          <div className={`${styles.metaChips} ${expandPaneOpen ? styles.metaChipsCollapsed : ''}`}>
            <span className={styles.metaChip}>{summary.brand}</span>
            <span className={styles.metaChip}>{summary.category}</span>
            <span className={styles.metaChip}>{summary.productCode}</span>
            <span className={styles.metaChip}>{summary.name}</span>
          </div>
          <div className={styles.productImageWrap}>
            <img className={styles.productImage} src={imageUrl} alt={summary.name} />
          </div>
        </div>
        </ComponentErrorBoundary>
        <ComponentErrorBoundary page={pageName} unit="PrimarySalesMetricsCard">
        {salesMetricsError != null ? (
          <div className={`${styles.card} ${styles.drawerSalesMetricsCard}`}>
            <div className={styles.cardTitle}>
              판매 정보
              <ApiUnitErrorBadge error={salesMetricsError} />
            </div>
            <p className={styles.drawerErrorText}>판매 정보를 불러오지 못했습니다.</p>
          </div>
        ) : salesInsight == null ? (
          <div className={`${styles.card} ${styles.drawerSalesMetricsCard}`}>
            <div className={styles.cardTitle}>판매 정보</div>
            <p className={styles.drawerLoadingText}>판매 정보를 불러오는 중…</p>
          </div>
        ) : (
          <SalesMetricsCard
            targetPeriodDays={salesInsight.targetPeriodDays}
            sales={{
              channelLabel: salesInsight.competitorChannelLabel,
              self: salesInsight.self,
              competitor: salesInsight.competitor,
            }}
            channelFilter={{
              channelId,
              competitorChannels,
              error: channelsError,
              onChannelChange: setChannelId,
            }}
          />
        )}
        </ComponentErrorBoundary>
        <ComponentErrorBoundary page={pageName} unit="PrimarySalesTrendCard">
        <div className={`${styles.card} ${styles.drawerSalesTrendCard}`}>
          <div className={styles.salesTrendTitleRow}>
            <div className={styles.cardTitle}>
              판매추이(월간)
            </div>
            <div className={styles.salesTrendControls}>
              <div className={styles.forecastMonthsControl}>
                <span className={styles.forecastMonthsLabel} id={forecastMonthsLabelId}>
                  예측 개월
                </span>
                <div className={styles.forecastComboWrap} ref={forecastComboRef}>
                  <button
                    type="button"
                    className={styles.forecastComboTrigger}
                    aria-haspopup="listbox"
                    aria-expanded={forecastComboOpen}
                    aria-labelledby={forecastMonthsLabelId}
                    aria-label={`판매추이 포캐스트 개월 수, 현재 ${forecastMonths}`}
                    onClick={() => setForecastComboOpen((o) => !o)}
                  >
                    {forecastMonths}
                  </button>
                  {forecastComboOpen && (
                    <ul
                      className={styles.forecastComboList}
                      role="listbox"
                      aria-labelledby={forecastMonthsLabelId}
                      onWheel={(e) => e.stopPropagation()}
                    >
                      {Array.from({ length: 24 }, (_, i) => i + 1).map((n) => (
                        <li key={n} role="presentation">
                          <button
                            type="button"
                            role="option"
                            aria-selected={n === forecastMonths}
                            className={
                              n === forecastMonths
                                ? `${styles.forecastComboOption} ${styles.forecastComboOptionSelected}`
                                : styles.forecastComboOption
                            }
                            onClick={() => {
                              onForecastMonthsChange(n)
                              setForecastComboOpen(false)
                            }}
                          >
                            {n}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
              <div className={styles.trendSeriesToggle} aria-label="판매추이 표시 항목">
                <button
                  type="button"
                  aria-pressed={salesTrendVisible.self}
                  className={
                    salesTrendVisible.self
                      ? `${styles.trendSeriesButton} ${styles.trendSeriesButtonSelected}`
                      : styles.trendSeriesButton
                  }
                  onClick={() => toggleSalesTrendSeries('self')}
                >
                  자사
                </button>
                <button
                  type="button"
                  aria-pressed={salesTrendVisible.competitor}
                  className={
                    salesTrendVisible.competitor
                      ? `${styles.trendSeriesButton} ${styles.trendSeriesButtonSelected}`
                      : styles.trendSeriesButton
                  }
                  onClick={() => toggleSalesTrendSeries('competitor')}
                >
                  {salesInsight?.competitorChannelLabel ?? KO.labelCompetitorChannel}
                </button>
              </div>
            </div>
          </div>
          <div
            onMouseEnter={() => setChartHovered(true)}
            onMouseLeave={() => setChartHovered(false)}
            onWheel={onChartWheel}
          >
            <div ref={salesTrendChartClipRef} className={styles.chartClipWrap}>
              <SalesTrendChart
                data={trendWindowData}
                height={salesTrendChartDense ? 232 : 210}
                yMax={salesTrendYMax}
                allowEscapeViewBox={{ x: false, y: false }}
                periodShade={shiftedPeriodShade}
                forecastShade={shiftedForecastShade}
                minTickGap={salesTrendChartDense ? 0 : 8}
                interval={salesTrendChartDense ? 0 : 'preserveStartEnd'}
                tickAngle={salesTrendChartDense ? -38 : 0}
                tickHeight={salesTrendChartDense ? 42 : undefined}
                lines={[
                  ...(salesTrendVisible.self
                    ? [
                        { dataKey: 'actual', stroke: '#2563eb' },
                        { dataKey: 'forecastLink', stroke: '#2563eb', strokeDasharray: '4 4' },
                      ]
                    : []),
                  ...(salesTrendVisible.competitor
                    ? [{ dataKey: 'competitorActual', stroke: '#e11d48' }]
                    : []),
                ]}
                tooltipValueFormatter={(value, name) => {
                  if (name === 'actual') return [formatGroupedNumber(value), '판매 실적']
                  if (name === 'competitorActual') return [formatGroupedNumber(value), `${salesInsight?.competitorChannelLabel ?? KO.labelCompetitorChannel} 판매`]
                  if (name === 'forecastLink') return [formatGroupedNumber(value), '판매 예측']
                  return [formatGroupedNumber(value), name]
                }}
                tooltipLabelFormatter={(row) => String(row.date ?? '')}
                tickFormatter={(row) => String(row.date ?? '')}
              />
            </div>
          </div>
        </div>
        </ComponentErrorBoundary>
      </div>
      </div>
      <div
        className={`${styles.drawerExpandPane} ${expandPaneOpen ? styles.drawerExpandPaneOpen : ''}`}
        aria-hidden={!expandPaneOpen}
      >
        <div className={styles.drawerExpandPaneInner}>
          {expandPaneOpen && (
            secondaryDetailError != null ? (
              <div className={styles.drawerSecondaryLoading}>
                2차 데이터를 불러오지 못했습니다.
                <ApiUnitErrorBadge error={secondaryDetailError} />
              </div>
            ) : secondaryDetail === null ? (
              <div className={styles.drawerSecondaryLoading}>
                2차 데이터를 불러오는 중…
              </div>
            ) : (
              <ProductSecondaryPanel
                primary={summary}
                secondary={secondaryDetail}
                periodStart={selectedStart}
                periodEnd={selectedEnd}
                forecastMonths={forecastMonths}
                pageName="ProductSummaryDrawer > ProductSecondaryPanel"
                prefillFromSnapshot={hydrateForPanel}
                candidateItemContext={candidateItemContext ?? null}
                channelState={{
                  channelId,
                  competitorChannels,
                  onChannelChange: setChannelId,
                }}
              />
            )
          )}
        </div>
      </div>
    </aside>
  )
}

export const ProductSummaryDrawer = ({
  summary,
  stockTrend,
  onClose,
  periodStart,
  periodEnd,
  forecastMonths,
  onForecastMonthsChange,
  hydrateSnapshot,
  initialExpandSecondary,
  candidateItemContext,
  onRequestNavigateAdjacent,
  disableAdjacentNavigation,
  suppressDocumentLayoutShift,
  closing,
}: {
  summary: ProductPrimarySummary | null
  stockTrend: ProductStockTrendPoint[]
  onClose: () => void
  periodStart: string
  periodEnd: string
  forecastMonths: number
  onForecastMonthsChange: (months: number) => void
  hydrateSnapshot?: OrderSnapshotDocumentV1 | null
  initialExpandSecondary?: boolean
  candidateItemContext?: CandidateItemPanelContext | null
  onRequestNavigateAdjacent?: (direction: AdjacentDirection) => void | Promise<void>
  disableAdjacentNavigation?: boolean
  suppressDocumentLayoutShift?: boolean
  closing?: boolean
}) => {
  if (!summary) return null
  return (
    <ProductSummaryDrawerContent
      summary={summary}
      stockTrend={stockTrend}
      onClose={onClose}
      periodStart={periodStart}
      periodEnd={periodEnd}
      forecastMonths={forecastMonths}
      onForecastMonthsChange={onForecastMonthsChange}
      hydrateSnapshot={hydrateSnapshot}
      initialExpandSecondary={initialExpandSecondary}
      candidateItemContext={candidateItemContext}
      onRequestNavigateAdjacent={onRequestNavigateAdjacent}
      disableAdjacentNavigation={disableAdjacentNavigation}
      suppressDocumentLayoutShift={suppressDocumentLayoutShift}
      closing={closing}
    />
  )
}
