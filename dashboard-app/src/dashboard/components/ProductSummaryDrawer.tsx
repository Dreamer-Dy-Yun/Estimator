import { useEffect, useMemo, useRef, useState } from 'react'
import { ApiUnitErrorBadge } from '../../components/ApiUnitErrorBadge'
import { ComponentErrorBoundary } from '../../components/ComponentErrorBoundary'
import type { ProductStockTrendPoint } from '../../api'
import type { ProductPrimarySummary } from '../../types'
import type { AdjacentDirection } from '../../utils/adjacentListNavigation'
import { normalizeMonthKey } from './trend/trendRangeUtils'
import { ProductSecondaryPanel } from './product-secondary/ProductSecondaryPanel'
import type { CandidateItemPanelContext } from './product-secondary/candidateActionCards'
import { ProductMonthlyTrendContainer } from './product-summary/ProductMonthlyTrendContainer'
import { ProductSalesMetricsContainer } from './product-summary/ProductSalesMetricsContainer'
import { useCompetitorChannels } from './product-summary/useCompetitorChannels'
import { useProductSecondaryDetail } from './product-summary/useProductSecondaryDetail'
import type { OrderSnapshotDocumentV1 } from '../../snapshot/orderSnapshotTypes'
import { DRAWER_KEEP_OPEN_SELECTOR } from '../drawer/drawerDom'
import { setBodyPrimaryDrawerOpen } from '../drawer/primaryDrawerBody'
import styles from './common.module.css'

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
  onRequestNavigateAdjacent?: (direction: AdjacentDirection) => void | Promise<void>
  disableAdjacentNavigation?: boolean
  suppressDocumentLayoutShift?: boolean
  closing?: boolean
}) {
  void stockTrend

  const pageName = 'ProductSummaryDrawer'
  const drawerRef = useRef<HTMLElement | null>(null)
  const [expandPaneOpen, setExpandPaneOpen] = useState(!!initialExpandSecondary)
  const {
    competitorChannels,
    channelId,
    setChannelId,
    channelsError,
  } = useCompetitorChannels(pageName)
  const {
    secondaryDetail,
    secondaryDetailError,
    hydrateForPanel,
  } = useProductSecondaryDetail({
    productId: summary.id,
    expandPaneOpen,
    hydrateSnapshot,
    pageName,
  })

  useEffect(() => {
    if (suppressDocumentLayoutShift) return
    setBodyPrimaryDrawerOpen(true)
    return () => setBodyPrimaryDrawerOpen(false)
  }, [suppressDocumentLayoutShift])

  useEffect(() => {
    setExpandPaneOpen(!!initialExpandSecondary)
  }, [summary.id, initialExpandSecondary])

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

  const selectedStart = normalizeMonthKey(periodStart)
  const selectedEnd = normalizeMonthKey(periodEnd)
  const competitorChannelLabel = useMemo(
    () => competitorChannels.find((ch) => ch.id === channelId)?.label ?? '',
    [channelId, competitorChannels],
  )
  const imageUrl = `https://placehold.co/640x360?text=${encodeURIComponent(summary.name)}`

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
            <ProductSalesMetricsContainer
              productId={summary.id}
              startDate={periodStart}
              endDate={periodEnd}
              channelId={channelId}
              competitorChannels={competitorChannels}
              channelsError={channelsError}
              onChannelChange={setChannelId}
              pageName={pageName}
            />
          </ComponentErrorBoundary>

          <ComponentErrorBoundary page={pageName} unit="PrimarySalesTrendCard">
            <ProductMonthlyTrendContainer
              productId={summary.id}
              fallbackTrend={summary.monthlySalesTrend}
              periodStart={periodStart}
              periodEnd={periodEnd}
              forecastMonths={forecastMonths}
              onForecastMonthsChange={onForecastMonthsChange}
              channelId={channelId}
              fallbackChannelLabel={competitorChannelLabel}
              pageName={pageName}
            />
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
                2차 데이터를 불러오는 중...
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
