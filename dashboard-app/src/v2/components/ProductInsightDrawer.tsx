import { useEffect, useId, useMemo, useRef, useState, type WheelEvent } from 'react'
import { Area, AreaChart, Bar, CartesianGrid, ComposedChart, Line, ReferenceArea, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { api } from '../../api/mock'
import type { ProductDetail } from '../../types'
import { c, pct, won } from '../../utils/format'
import { PortalHelpMark, PortalHelpPopoverLayer, usePortalHelpPopover } from './PortalHelpPopover'
import styles from './v2-common.module.css'

/** YYYY-MM 형태로 맞춤 (슬래시·점 구분, findIndex 실패로 음영이 사라지는 것 방지) */
const normalizeMonthKey = (value: string) => {
  const s = value.trim().replace(/\//g, '-').replace(/\./g, '-')
  const m = s.match(/^(\d{4})-(\d{1,2})/)
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}`
  return s.slice(0, 7)
}

const findSeriesMonthIndex = (
  series: Array<{ date: string }>,
  monthKey: string,
  kind: 'start' | 'end',
) => {
  if (series.length === 0) return 0
  const exact = series.findIndex((p) => p.date === monthKey)
  if (exact !== -1) return exact
  const keys = series.map((p) => p.date)
  if (kind === 'start') {
    const i = keys.findIndex((k) => k >= monthKey)
    return i === -1 ? series.length - 1 : i
  }
  let last = -1
  for (let i = 0; i < keys.length; i += 1) {
    if (keys[i] <= monthKey) last = i
  }
  return last === -1 ? 0 : last
}

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
function ProductInsightDrawerContent({
  detail,
  onClose,
  periodStart,
  periodEnd,
}: {
  detail: ProductDetail
  onClose: () => void
  periodStart?: string
  periodEnd?: string
}) {
  const seasonalityHelpId = useId()
  const kpiPriceHelpId = useId()
  const kpiQtyHelpId = useId()
  const kpiStockHelpId = useId()
  const portalHelp = usePortalHelpPopover<DrawerHelpId>()
  const { close: closePortalHelp } = portalHelp

  useEffect(() => {
    closePortalHelp()
  }, [detail.id, closePortalHelp])

  const drawerRef = useRef<HTMLElement | null>(null)
  const kpiCloseTimerRef = useRef<number | null>(null)
  const [chartHovered, setChartHovered] = useState(false)
  const [kpiHovered, setKpiHovered] = useState(false)
  const [stockTrend, setStockTrend] = useState<Array<{ date: string; stock: number }>>([])
  /** 'all' = 전체 상품 합계, 그 외 = 사이즈 코드(sizeMix.size) */
  const [selectedSizeKey, setSelectedSizeKey] = useState<'all' | string>('all')

  const selectedStart = normalizeMonthKey(periodStart ?? '2025-01-01')
  const selectedEnd = normalizeMonthKey(periodEnd ?? '2025-12-31')

  useEffect(() => {
    setSelectedSizeKey('all')
  }, [detail.id])

  const sizeBreakdown = useMemo(
    () =>
      detail.sizeMix.map((item) => ({
        size: item.size,
        price: item.selfAvgPrice,
        qty: item.selfQty,
        stock: item.availableStock,
      })),
    [detail.sizeMix],
  )

  const displayKpi = useMemo(() => {
    if (selectedSizeKey === 'all') {
      return {
        price: detail.selfPrice,
        qty: detail.selfQty,
        stock: detail.availableStock,
      }
    }
    const row = sizeBreakdown.find((r) => r.size === selectedSizeKey)
    if (!row) {
      return {
        price: detail.selfPrice,
        qty: detail.selfQty,
        stock: detail.availableStock,
      }
    }
    return { price: row.price, qty: row.qty, stock: row.stock }
  }, [detail.availableStock, detail.selfPrice, detail.selfQty, selectedSizeKey, sizeBreakdown])

  /** 선택된 사이즈(전체=1)에 맞춰 월별 판매 추이 스케일 — 사이즈 판매량 ÷ 품번 합계 */
  const trendScale = useMemo(() => {
    if (selectedSizeKey === 'all') return 1
    const row = detail.sizeMix.find((s) => s.size === selectedSizeKey)
    if (!row || detail.selfQty <= 0) return 1
    return row.selfQty / detail.selfQty
  }, [detail.selfQty, detail.sizeMix, selectedSizeKey])

  const salesSeries = useMemo(() => detail.salesTrend.map((point, idx) => ({
    ...point,
    idx,
    sales: Math.round(point.sales * trendScale),
  })), [detail.salesTrend, trendScale])

  useEffect(() => {
    let alive = true
    api.getProductStockTrend(detail.id).then((rows) => {
      if (!alive) return
      setStockTrend(rows)
    })
    return () => { alive = false }
  }, [detail.id])

  const { periodStartIdx, periodEndIdx } = useMemo(() => {
    let start = findSeriesMonthIndex(salesSeries, selectedStart, 'start')
    let end = findSeriesMonthIndex(salesSeries, selectedEnd, 'end')
    if (end < start) {
      const t = start
      start = end
      end = t
    }
    return { periodStartIdx: start, periodEndIdx: end }
  }, [salesSeries, selectedStart, selectedEnd])

  /** 예측 구간(첫 isForecast ~ 시계열 끝) — 음영 x 범위 */
  const forecastShade = useMemo(() => {
    let first = -1
    salesSeries.forEach((point, idx) => {
      if (first === -1 && point.isForecast) first = idx
    })
    if (first === -1 || salesSeries.length === 0) return null
    return { x1: first, x2: salesSeries.length - 1 }
  }, [salesSeries])

  const periodLen = Math.max(1, periodEndIdx - periodStartIdx + 1)
  const baseWindowSize = Math.min(salesSeries.length, Math.max(8, periodLen * 2))
  const [windowSize, setWindowSize] = useState(baseWindowSize)

  useEffect(() => {
    setWindowSize(baseWindowSize)
  }, [baseWindowSize, detail.id])

  const center = (periodStartIdx + periodEndIdx) / 2
  const half = Math.floor(windowSize / 2)
  let viewStart = Math.max(0, Math.round(center) - half)
  let viewEnd = Math.min(salesSeries.length - 1, viewStart + windowSize - 1)
  if (viewEnd - viewStart + 1 < windowSize) {
    viewStart = Math.max(0, viewEnd - windowSize + 1)
  }

  const seasonChartData = useMemo(
    () => detail.seasonality.map((row) => ({
      month: row.month,
      ratio: row.ratio,
    })),
    [detail.seasonality],
  )

  const chartData = useMemo(() => {
    const stockByDate = new Map(stockTrend.map((row) => [row.date, row.stock]))
    let firstForecastIdx = -1
    salesSeries.forEach((point, idx) => {
      if (firstForecastIdx === -1 && point.isForecast) firstForecastIdx = idx
    })

    return salesSeries.map((point, idx) => ({
      ...point,
      actual: point.isForecast ? null : point.sales,
      forecast: point.isForecast ? point.sales : null,
      stockBar: Math.round((stockByDate.get(point.date) ?? 0) * trendScale),
      forecastLink: firstForecastIdx !== -1 && (idx === firstForecastIdx - 1 || idx >= firstForecastIdx)
        ? point.sales
        : null,
    }))
  }, [salesSeries, stockTrend, trendScale])

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

  const imageUrl = `https://placehold.co/640x360?text=${encodeURIComponent(detail.name)}`

  return (
    <aside
      ref={drawerRef}
      className={styles.drawer}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <div className={styles.drawerHead}>
        <strong>상품 인사이트</strong>
        <button className={styles.drawerClose} onClick={onClose}>X</button>
      </div>
      <div className={styles.drawerBody}>
        <div className={`${styles.card} ${styles.productSummaryCard}`}>
          <div className={styles.metaChips}>
            <span className={styles.metaChip}>{detail.brand}</span>
            <span className={styles.metaChip}>{detail.category}</span>
            <span className={styles.metaChip}>{detail.type}</span>
            <span className={styles.metaChip}>{detail.name}</span>
          </div>
          <div className={styles.productImageWrap}>
            <img className={styles.productImage} src={imageUrl} alt={detail.name} />
          </div>
        </div>
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
              <div className={styles.kpiValue}>{won(displayKpi.price)}</div>
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
              <div className={styles.kpiValue}>{c(displayKpi.qty)}</div>
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
              <div className={styles.kpiValue}>{c(displayKpi.stock)}</div>
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
                      <td>{won(detail.selfPrice)}</td>
                      <td>{c(detail.selfQty)}</td>
                      <td>{c(detail.availableStock)}</td>
                    </tr>
                    {sizeBreakdown.map((row) => (
                      <tr
                        key={row.size}
                        className={`${styles.sizeHoverRow} ${selectedSizeKey === row.size ? styles.sizeHoverRowSelected : ''}`}
                        onClick={() => setSelectedSizeKey(row.size)}
                      >
                        <td>{row.size}</td>
                        <td>{won(row.price)}</td>
                        <td>{c(row.qty)}</td>
                        <td>{c(row.stock)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
        <div className={styles.card}>
          <div className={styles.trendHead}>
            <div className={styles.cardTitle}>
              판매 추이
              {selectedSizeKey !== 'all' && (
                <span className={styles.trendSizeBadge}> · {selectedSizeKey}</span>
              )}
            </div>
            <div className={styles.periodMeta}>기간: {selectedStart} ~ {selectedEnd}</div>
          </div>
          <div
            onMouseEnter={() => setChartHovered(true)}
            onMouseLeave={() => setChartHovered(false)}
            onWheel={onChartWheel}
          >
            <div className={styles.chartClipWrap}>
            <ResponsiveContainer width="100%" height={210}>
              <ComposedChart
                data={chartData}
                margin={{ top: 4, right: 12, bottom: 4, left: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                {forecastShade && (
                  <ReferenceArea
                    xAxisId={0}
                    yAxisId="sales"
                    x1={forecastShade.x1}
                    x2={forecastShade.x2}
                    fill="#9eb0c9"
                    fillOpacity={0.22}
                    ifOverflow="hidden"
                  />
                )}
                <ReferenceArea
                  xAxisId={0}
                  yAxisId="sales"
                  x1={periodStartIdx}
                  x2={periodEndIdx}
                  fill="#64748b"
                  fillOpacity={0.18}
                  ifOverflow="hidden"
                />
                <XAxis
                  type="number"
                  dataKey="idx"
                  domain={[viewStart, viewEnd]}
                  tickFormatter={(value) => chartData[Math.round(value)]?.date ?? ''}
                  tick={{ fontSize: 10 }}
                  allowDataOverflow
                />
                <YAxis
                  yAxisId="sales"
                  domain={[0, salesTrendYMax]}
                  tick={{ fontSize: 9 }}
                  width={40}
                  tickMargin={4}
                />
                <Tooltip
                  allowEscapeViewBox={{ x: false, y: false }}
                  offset={6}
                  wrapperStyle={{ outline: 'none' }}
                  contentStyle={{ whiteSpace: 'nowrap' }}
                  formatter={(value) => c(Number(value))}
                  labelFormatter={(label) => chartData[Math.round(Number(label))]?.date ?? ''}
                />
                <Bar yAxisId="sales" dataKey="stockBar" fill="#149632" fillOpacity={0.52} barSize={10} />
                <Line yAxisId="sales" type="monotone" dataKey="actual" stroke="#0f172a" dot={false} />
                <Line yAxisId="sales" type="monotone" dataKey="forecastLink" stroke="#2563eb" strokeDasharray="4 4" dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
            </div>
          </div>
        </div>
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
                tickFormatter={(v) => pct(v * 100)}
                tick={{ fontSize: 9 }}
                width={44}
                tickMargin={4}
              />
              <Tooltip
                allowEscapeViewBox={{ x: false, y: false }}
                offset={6}
                wrapperStyle={{ outline: 'none' }}
                contentStyle={{ whiteSpace: 'nowrap' }}
                formatter={(value) => pct(Number(value ?? 0) * 100)}
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
                <p>각 연도의 <strong>동월</strong>(1월끼리, 2월끼리 …)을 평균한 비율입니다.</p>
                <p>데이터가 부족하면 표시되지 않을 수 있습니다.</p>
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
    </aside>
  )
}

export const ProductInsightDrawer = ({
  detail,
  onClose,
  periodStart,
  periodEnd,
}: {
  detail: ProductDetail | null
  onClose: () => void
  periodStart?: string
  periodEnd?: string
}) => {
  if (!detail) return null
  return (
    <ProductInsightDrawerContent
      detail={detail}
      onClose={onClose}
      periodStart={periodStart}
      periodEnd={periodEnd}
    />
  )
}
