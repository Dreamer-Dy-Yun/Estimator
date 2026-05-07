import { useEffect, useRef, useState } from 'react'
import { ApiUnitErrorBadge } from '../../../components/ApiUnitErrorBadge'
import type { ProductStockTrendPoint } from '../../../api'
import type { ProductPrimarySummary } from '../../../types'
import type { AdjacentDirection } from '../../../utils/adjacentListNavigation'
import { normalizeMonthKey } from '../trend/trendRangeUtils'
import { ProductPrimaryDrawer } from './primary/ProductPrimaryDrawer'
import { ProductSecondaryDrawer } from './secondary/ProductSecondaryDrawer'
import type { CandidateItemPanelContext } from './secondary/candidateActionCards'
import { useCompetitorChannels } from './useCompetitorChannels'
import { useSecondaryDrawerDetail } from './secondary/useSecondaryDrawerDetail'
import type { OrderSnapshotDocumentV1 } from '../../../snapshot/orderSnapshotTypes'
import { DRAWER_KEEP_OPEN_SELECTOR } from '../../drawer/drawerDom'
import { setBodyPrimaryDrawerOpen } from '../../drawer/primaryDrawerBody'
import styles from '../common.module.css'

function ProductDrawerContent({
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

  const pageName = 'ProductDrawer'
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
  } = useSecondaryDrawerDetail({
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

  return (
    <aside
      ref={drawerRef}
      className={`${styles.drawer} ${expandPaneOpen ? styles.drawerWithExpandPane : ''} ${closing ? styles.drawerClosing : ''}`}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <ProductPrimaryDrawer
        summary={summary}
        periodStart={periodStart}
        periodEnd={periodEnd}
        selectedStart={selectedStart}
        selectedEnd={selectedEnd}
        forecastMonths={forecastMonths}
        onForecastMonthsChange={onForecastMonthsChange}
        expandPaneOpen={expandPaneOpen}
        onToggleSecondary={() => setExpandPaneOpen((v) => !v)}
        onClose={onClose}
        channelState={{
          channelId,
          competitorChannels,
          channelsError,
          onChannelChange: setChannelId,
        }}
        pageName={pageName}
      />

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
              <ProductSecondaryDrawer
                primary={summary}
                secondary={secondaryDetail}
                periodStart={selectedStart}
                periodEnd={selectedEnd}
                forecastMonths={forecastMonths}
                pageName="ProductDrawer > ProductSecondaryDrawer"
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

export const ProductDrawer = ({
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
    <ProductDrawerContent
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
