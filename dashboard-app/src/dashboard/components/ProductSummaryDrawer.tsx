import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type WheelEvent } from 'react'
import { ApiUnitErrorBadge } from '../../components/ApiUnitErrorBadge'
import { ComponentErrorBoundary } from '../../components/ComponentErrorBoundary'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { ProductSecondaryDetail, ProductStockTrendPoint } from '../../api'
import { dashboardApi } from '../../api'
import type { ApiUnitErrorInfo, ProductPrimarySummary } from '../../types'
import type { AdjacentDirection } from '../../utils/adjacentListNavigation'
import { formatGroupedNumber, formatPercent } from '../../utils/format'
import { PortalHelpMark, PortalHelpPopoverLayer } from './PortalHelpPopover'
import { SalesTrendChart } from './trend/SalesTrendChart'
import { buildShadeRanges, normalizeMonthKey } from './trend/trendRangeUtils'
import { usePortalHelpPopover } from './usePortalHelpPopover'
import { ProductSecondaryPanel } from './product-secondary/ProductSecondaryPanel'
import type { CandidateItemPanelContext } from './product-secondary/candidateActionCards'
import type { OrderSnapshotDocumentV1 } from '../../snapshot/orderSnapshotTypes'
import styles from './common.module.css'

const SEASON_MONTH_LABELS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'] as const

const formatSeasonMonthLabel = (m: unknown) => {
  const n = typeof m === 'number' ? m : Number(m)
  if (Number.isNaN(n)) return String(m ?? '')
  const i = Math.trunc(n) - 1
  return i >= 0 && i < 12 ? SEASON_MONTH_LABELS[i] : String(m)
}

/** 툴팁 전용 — 축은 JAN/FEB, 호버 시 1월·2월 */
const formatSeasonMonthTooltipLabel = (m: unknown) => {
  const n = typeof m === 'number' ? m : Number(m)
  if (Number.isNaN(n)) return String(m ?? '')
  const month = Math.trunc(n)
  return month >= 1 && month <= 12 ? `${month}월` : String(m)
}

type DrawerHelpId = 'seasonality' | 'kpiPrice' | 'kpiQty' | 'kpiStock'

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
}) {
  const seasonalityHelpId = useId()
  const forecastMonthsLabelId = useId()
  const kpiPriceHelpId = useId()
  const kpiQtyHelpId = useId()
  const kpiStockHelpId = useId()
  const portalHelp = usePortalHelpPopover<DrawerHelpId>()
  const { close: closePortalHelp } = portalHelp

  const drawerRef = useRef<HTMLElement | null>(null)
  const forecastComboRef = useRef<HTMLDivElement | null>(null)
  const salesTrendChartClipRef = useRef<HTMLDivElement | null>(null)
  const [forecastComboOpen, setForecastComboOpen] = useState(false)
  const [salesTrendChartClipWidth, setSalesTrendChartClipWidth] = useState(320)
  const kpiCloseTimerRef = useRef<number | null>(null)

  useEffect(() => {
    closePortalHelp()
  }, [summary.id, closePortalHelp])

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

  useLayoutEffect(() => {
    const el = salesTrendChartClipRef.current
    if (!el) return
    if (typeof ResizeObserver === 'undefined') {
      setSalesTrendChartClipWidth(Math.max(200, el.clientWidth))
      return
    }
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width
      if (w && w > 0) setSalesTrendChartClipWidth(w)
    })
    ro.observe(el)
    setSalesTrendChartClipWidth(Math.max(200, el.clientWidth))
    return () => ro.disconnect()
  }, [summary.id])

  const [chartHovered, setChartHovered] = useState(false)
  const [kpiHovered, setKpiHovered] = useState(false)
  /** 'all' = 전체 상품 합계, 그 외 = 사이즈 코드(sizeMix.size) */
  const [selectedSizeKey, setSelectedSizeKey] = useState<'all' | string>('all')
  /** 왼쪽 확장 패널(추가 콘텐츠 영역) */
  const [expandPaneOpen, setExpandPaneOpen] = useState(!!initialExpandSecondary)
  const [secondaryDetail, setSecondaryDetail] = useState<ProductSecondaryDetail | null>(null)
  const [secondaryDetailError, setSecondaryDetailError] = useState<ApiUnitErrorInfo | null>(null)

  useEffect(() => {
    setChartHovered(false)
    setKpiHovered(false)
    setSelectedSizeKey('all')
  }, [summary.id])

  const pageName = 'ProductSummaryDrawer'
  const makeApiErrorInfo = (request: string, err: unknown): ApiUnitErrorInfo => ({
    checkedAt: new Date().toISOString(),
    page: pageName,
    request,
    error: err instanceof Error ? err.message : String(err),
  })

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

  const sizeBreakdown = useMemo(
    () =>
      summary.sizeMix.map((item) => ({
        size: item.size,
        price: item.avgPrice,
        qty: item.qty,
        stock: item.availableStock,
      })),
    [summary.sizeMix],
  )

  const displayKpi = useMemo(() => {
    const base = {
      price: summary.price,
      qty: summary.qty,
      stock: summary.availableStock,
    }
    if (selectedSizeKey === 'all') return base
    const row = sizeBreakdown.find((r) => r.size === selectedSizeKey)
    if (!row) return base
    return { price: row.price, qty: row.qty, stock: row.stock }
  }, [summary.availableStock, summary.price, summary.qty, selectedSizeKey, sizeBreakdown])

  /** 선택된 사이즈(전체=1)에 맞춰 월별 판매 추이 스케일 — 사이즈 판매량 ÷ 품번 합계 */
  const trendScale = useMemo(() => {
    if (selectedSizeKey === 'all') return 1
    const row = summary.sizeMix.find((s) => s.size === selectedSizeKey)
    if (!row || summary.qty <= 0) return 1
    return row.qty / summary.qty
  }, [summary.qty, summary.sizeMix, selectedSizeKey])

  const salesSeries = useMemo(() => summary.monthlySalesTrend.map((point, idx) => ({
    ...point,
    idx,
    sales: Math.round(point.sales * trendScale),
  })), [summary.monthlySalesTrend, trendScale])

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

  const seasonChartData = useMemo(
    () => summary.seasonality.map((row) => ({
      month: row.month,
      ratio: row.ratio,
    })),
    [summary.seasonality],
  )

  const chartData = useMemo(() => {
    const stockByDate = new Map(stockTrend.map((row) => [row.date, row.stock]))
    const inboundByDate = new Map(stockTrend.map((row) => [row.date, row.inboundExpected ?? 0]))
    const firstForecastIdx = salesSeries.findIndex((point) => point.isForecast)
    const hasForecast = firstForecastIdx !== -1

    const out: Array<typeof salesSeries[number] & {
      actual: number | null
      forecast: number | null
      stockBar: number
      inboundAccumBar: number
      forecastLink: number | null
    }> = []

    let inboundAccum = 0
    let forecastResidualStock = 0

    for (let idx = 0; idx < salesSeries.length; idx += 1) {
      const point = salesSeries[idx]!
      const inboundMonthly = Math.round((inboundByDate.get(point.date) ?? 0) * trendScale)
      const baseStock = Math.round((stockByDate.get(point.date) ?? 0) * trendScale)
      let stockBar = baseStock
      if (hasForecast && point.isForecast) {
        if (idx === firstForecastIdx) {
          const prevDate = salesSeries[idx - 1]?.date ?? point.date
          const currentStock = Math.round(
            (stockByDate.get(prevDate) ?? 0) * trendScale,
          )
          forecastResidualStock = Math.max(0, Math.round(currentStock * 0.9))
          inboundAccum = Math.max(0, inboundMonthly)
        } else {
          inboundAccum += inboundMonthly
          let remainDemand = Math.max(0, Math.round(point.sales))
          const consumeStock = Math.min(forecastResidualStock, remainDemand)
          forecastResidualStock -= consumeStock
          remainDemand -= consumeStock
          if (remainDemand > 0) {
            inboundAccum = Math.max(0, inboundAccum - remainDemand)
          }
        }
        stockBar = forecastResidualStock
      } else {
        inboundAccum += inboundMonthly
      }
      out.push({
        ...point,
        actual: point.isForecast ? null : point.sales,
        forecast: point.isForecast ? point.sales : null,
        stockBar,
        inboundAccumBar: inboundAccum,
        forecastLink: hasForecast && (idx === firstForecastIdx - 1 || idx >= firstForecastIdx)
          ? point.sales
          : null,
      })
    }
    return out
  }, [salesSeries, stockTrend, trendScale])

  const trendWindowData = useMemo(
    () => chartData.slice(viewStart, viewEnd + 1).map((row, i) => ({ ...row, idx: i })),
    [chartData, viewEnd, viewStart],
  )

  /** 월 포인트가 많을 때 가로축 라벨 밀도 상향 */
  const salesTrendChartDense = trendWindowData.length >= 18

  /** 차트 플롯 가로 폭 ÷ 보이는 막대(월) 수 — 뷰포트·줌에 맞춰 스택 막대 폭 자동 */
  const trendStackBarSize = useMemo(() => {
    const n = trendWindowData.length
    if (n <= 0) return 10
    const inner = Math.max(140, salesTrendChartClipWidth - 52)
    const band = inner / n
    const raw = Math.round(band * 0.62)
    return Math.max(6, Math.min(18, raw))
  }, [salesTrendChartClipWidth, trendWindowData.length])

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
        row.sales,
        row.stockBar,
        row.stockBar + row.inboundAccumBar,
        row.actual ?? 0,
        row.forecastLink ?? 0,
      )
    }
    if (m <= 0) return 100
    return Math.ceil(m * 1.06)
  }, [chartData, viewStart, viewEnd])

  useEffect(() => {
    const onDocumentMouseDown = (event: MouseEvent) => {
      const path = event.composedPath()
      const clickedInsideDrawer = drawerRef.current ? path.includes(drawerRef.current) : false
      if (clickedInsideDrawer) return

      const clickedKeepOpenArea = path.some((node) => {
        if (!(node instanceof Element)) return false
        return Boolean(node.closest('[data-drawer-keep-open="true"]'))
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

  useEffect(() => {
    return () => {
      if (kpiCloseTimerRef.current) {
        window.clearTimeout(kpiCloseTimerRef.current)
      }
    }
  }, [])

  const openKpiPanel = () => {
    if (kpiCloseTimerRef.current) {
      window.clearTimeout(kpiCloseTimerRef.current)
      kpiCloseTimerRef.current = null
    }
    setKpiHovered(true)
  }

  const closeKpiPanel = () => {
    if (kpiCloseTimerRef.current) window.clearTimeout(kpiCloseTimerRef.current)
    kpiCloseTimerRef.current = window.setTimeout(() => {
      setKpiHovered(false)
      kpiCloseTimerRef.current = null
    }, 180)
  }

  const onChartWheel = (event: WheelEvent<HTMLDivElement>) => {
    if (!chartHovered) return
    event.preventDefault()
    const next = event.deltaY > 0 ? windowSize + 2 : windowSize - 2
    const minWindow = Math.max(periodLen + 2, 6)
    setWindowSize(Math.max(minWindow, Math.min(salesSeries.length, next)))
  }

  const getDrawerHelpTooltipId = (id: DrawerHelpId) =>
    id === 'seasonality'
      ? seasonalityHelpId
      : id === 'kpiPrice'
        ? kpiPriceHelpId
        : id === 'kpiQty'
          ? kpiQtyHelpId
          : kpiStockHelpId

  const imageUrl = `https://placehold.co/640x360?text=${encodeURIComponent(summary.name)}`

  return (
    <aside
      ref={drawerRef}
      className={`${styles.drawer} ${expandPaneOpen ? styles.drawerWithExpandPane : ''}`}
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
        <div className={`${styles.card} ${styles.productSummaryCard}`}>
          <div className={styles.metaChips}>
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
        <ComponentErrorBoundary page={pageName} unit="PrimaryKpiCard">
        <div
          className={styles.kpiHoverZone}
          onMouseEnter={openKpiPanel}
          onMouseLeave={closeKpiPanel}
        >
          <div className={`${styles.kpiGrid} ${styles.kpiGrid3}`}>
            <div className={styles.kpi}>
              <div className={`${styles.kpiLabel} ${styles.kpiLabelWithHelp}`}>
                판매가
                <PortalHelpMark
                  helpId="kpiPrice"
                  placement="below"
                  labelId={kpiPriceHelpId}
                  markClassName={styles.helpMark}
                  help={portalHelp}
                  stopMouseDownPropagation
                />
              </div>
              <div className={styles.kpiValue}>{formatGroupedNumber(displayKpi.price)}</div>
            </div>
            <div className={styles.kpi}>
              <div className={`${styles.kpiLabel} ${styles.kpiLabelWithHelp}`}>
                판매량
                <PortalHelpMark
                  helpId="kpiQty"
                  placement="below"
                  labelId={kpiQtyHelpId}
                  markClassName={styles.helpMark}
                  help={portalHelp}
                  stopMouseDownPropagation
                />
              </div>
              <div className={styles.kpiValue}>{formatGroupedNumber(displayKpi.qty)}</div>
            </div>
            <div className={styles.kpi}>
              <div className={`${styles.kpiLabel} ${styles.kpiLabelWithHelp}`}>
                재고
                <PortalHelpMark
                  helpId="kpiStock"
                  placement="below"
                  labelId={kpiStockHelpId}
                  markClassName={styles.helpMark}
                  help={portalHelp}
                  stopMouseDownPropagation
                />
              </div>
              <div className={styles.kpiValue}>{formatGroupedNumber(displayKpi.stock)}</div>
            </div>
          </div>
          {kpiHovered && (
            <div
              className={styles.sizeHoverPanel}
              onMouseEnter={openKpiPanel}
              onMouseLeave={closeKpiPanel}
            >
              <div className={styles.sizeHoverTableWrap}>
                <table className={styles.sizeHoverTable}>
                  <thead>
                    <tr>
                      <th>사이즈</th>
                      <th>판매가(KRW)</th>
                      <th>판매량(EA)</th>
                      <th>재고(EA)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      className={`${styles.sizeHoverRow} ${styles.sizeHoverRowAll} ${styles.sizeHoverRowPinned} ${selectedSizeKey === 'all' ? styles.sizeHoverRowSelected : ''}`}
                      onClick={() => setSelectedSizeKey('all')}
                    >
                      <td>전체</td>
                      <td>{formatGroupedNumber(summary.price)}</td>
                      <td>{formatGroupedNumber(summary.qty)}</td>
                      <td>{formatGroupedNumber(summary.availableStock)}</td>
                    </tr>
                    {sizeBreakdown.map((row) => (
                      <tr
                        key={row.size}
                        className={`${styles.sizeHoverRow} ${selectedSizeKey === row.size ? styles.sizeHoverRowSelected : ''}`}
                        onClick={() => setSelectedSizeKey(row.size)}
                      >
                        <td>{row.size}</td>
                        <td>{formatGroupedNumber(row.price)}</td>
                        <td>{formatGroupedNumber(row.qty)}</td>
                        <td>{formatGroupedNumber(row.stock)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
        </ComponentErrorBoundary>
        <ComponentErrorBoundary page={pageName} unit="PrimarySalesTrendCard">
        <div className={styles.card}>
          <div className={styles.salesTrendTitleRow}>
            <div className={styles.cardTitle}>
              판매추이(월간)
              {selectedSizeKey !== 'all' && (
                <span className={styles.trendSizeBadge}> · {selectedSizeKey}</span>
              )}
            </div>
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
                bars={[
                  {
                    dataKey: 'stockBar',
                    name: '실재고',
                    stackId: 'stockInbound',
                    fill: '#149632',
                    fillOpacity: 0.58,
                    barSize: trendStackBarSize,
                  },
                  {
                    dataKey: 'inboundAccumBar',
                    name: '예상 재고',
                    stackId: 'stockInbound',
                    fill: '#ef4444',
                    fillOpacity: 0.42,
                    barSize: trendStackBarSize,
                  },
                ]}
                lines={[
                  { dataKey: 'actual', stroke: '#0f172a' },
                  { dataKey: 'forecastLink', stroke: '#2563eb', strokeDasharray: '4 4' },
                ]}
                tooltipValueFormatter={(value, name) => {
                  if (name === 'stockBar') return [formatGroupedNumber(value), '실재고']
                  if (name === 'inboundAccumBar') return [formatGroupedNumber(value), '예상 재고']
                  if (name === 'actual') return [formatGroupedNumber(value), '판매 실적']
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
        <ComponentErrorBoundary page={pageName} unit="PrimarySeasonalityCard">
        <div className={styles.card}>
          <div className={styles.trendHead}>
            <div className={`${styles.cardTitle} ${styles.cardTitleWithHelp}`}>
              계절성
              <PortalHelpMark
                helpId="seasonality"
                placement="above"
                labelId={seasonalityHelpId}
                markClassName={styles.helpMark}
                help={portalHelp}
              />
            </div>
            <div className={styles.periodMeta}>연간 월별 비중 (합계 100%)</div>
          </div>
          <div className={styles.chartClipWrap}>
            <ResponsiveContainer width="100%" height={100}>
              <AreaChart data={seasonChartData} margin={{ top: 6, right: 12, bottom: 4, left: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey="month"
                type="category"
                ticks={[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]}
                tickFormatter={formatSeasonMonthLabel}
                tick={{ fontSize: 10 }}
              />
              <YAxis
                domain={[0, 'auto']}
                tickFormatter={(v) => formatPercent(v * 100)}
                tick={{ fontSize: 9 }}
                width={44}
                tickMargin={4}
              />
              <Tooltip
                allowEscapeViewBox={{ x: false, y: false }}
                offset={6}
                wrapperStyle={{ outline: 'none' }}
                contentStyle={{ whiteSpace: 'nowrap' }}
                formatter={(value) => formatPercent(Number(value ?? 0) * 100)}
                labelFormatter={formatSeasonMonthTooltipLabel}
              />
              <Area
                type="monotone"
                dataKey="ratio"
                stroke="#0f766e"
                strokeWidth={1.5}
                fill="#5eead4"
                fillOpacity={0.35}
              />
            </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        </ComponentErrorBoundary>
      </div>
      <PortalHelpPopoverLayer
        help={portalHelp}
        popoverClassName={styles.helpPopoverPortal}
        getTooltipId={getDrawerHelpTooltipId}
      >
        {(hid) => (
          <>
            {hid === 'seasonality' && (
              <>
                <p>각 연도의 <strong>동월</strong>(1월끼리, 2월끼리 …)을 </p>
                <p>평균한 비율입니다.</p>
                <p>데이터가 부족하면 표시되지 않을 수 있습니다.</p>
                <p>※판매 전략이나 이벤트에 의해 오염될 수 있습니다.</p>
              </>
            )}
            {hid === 'kpiPrice' && (
              <>
                <p>선택한 기간·사이즈 기준 <strong>평균 판매 단가</strong>입니다.</p>
                <p>사이즈를 고르면 API가 내려주는 <strong>해당 사이즈 평균 단가</strong>를 보여 줍니다. 전체는 품번 단위 값입니다.</p>
              </>
            )}
            {hid === 'kpiQty' && (
              <>
                <p>선택한 기간 동안의 <strong>판매 수량 합</strong>입니다.</p>
                <p>사이즈를 고르면 API가 내려주는 <strong>해당 사이즈 판매량</strong>을 보여 줍니다. 전체는 품번 단위 합계입니다.</p>
              </>
            )}
            {hid === 'kpiStock' && (
              <>
                <p><strong>현재 시점 가용 재고</strong> 수량입니다.</p>
                <p>사이즈를 고르면 API가 내려주는 <strong>해당 사이즈 실재고</strong>를 보여 줍니다. 전체는 품번 단위 합계입니다.</p>
              </>
            )}
          </>
        )}
      </PortalHelpPopoverLayer>
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
    />
  )
}
