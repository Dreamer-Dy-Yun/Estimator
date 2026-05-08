import { type SetStateAction, useCallback, useEffect, useRef, useState } from 'react'
import { ApiUnitErrorBadge } from '../../../components/ApiUnitErrorBadge'
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
  const pageName = 'ProductDrawer'
  const drawerRef = useRef<HTMLElement | null>(null)
  const [expandPaneState, setExpandPaneState] = useState(() => ({
    productId: summary.id,
    initialExpandSecondary: !!initialExpandSecondary,
    open: !!initialExpandSecondary,
  }))
  const expandPaneOpen =
    expandPaneState.productId === summary.id
    && expandPaneState.initialExpandSecondary === !!initialExpandSecondary
      ? expandPaneState.open
      : !!initialExpandSecondary
  const setExpandPaneOpen = useCallback((next: SetStateAction<boolean>) => {
    setExpandPaneState((prev) => {
      const previousOpen =
        prev.productId === summary.id
        && prev.initialExpandSecondary === !!initialExpandSecondary
          ? prev.open
          : !!initialExpandSecondary
      return {
        productId: summary.id,
        initialExpandSecondary: !!initialExpandSecondary,
        open: typeof next === 'function' ? next(previousOpen) : next,
      }
    })
  }, [initialExpandSecondary, summary.id])
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

  const selectedChannelReady = competitorChannels.some((channel) => channel.id === channelId)
  const selectedChannelMissing = channelId !== '' && !selectedChannelReady

  useEffect(() => {
    if (!onRequestNavigateAdjacent || disableAdjacentNavigation) return
    const ready =
      expandPaneOpen && selectedChannelReady && secondaryDetail != null && secondaryDetailError == null
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
    selectedChannelReady,
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
            channelsError != null ? (
              <div className={styles.drawerSecondaryLoading}>
                경쟁 채널 데이터를 불러오지 못했습니다.
                <ApiUnitErrorBadge error={channelsError} />
              </div>
            ) : !selectedChannelReady ? (
              <div className={styles.drawerSecondaryLoading}>
                {selectedChannelMissing
                  ? '선택된 경쟁 채널이 현재 채널 목록에 없습니다.'
                  : '경쟁 채널 데이터를 불러오는 중...'}
              </div>
            ) : secondaryDetailError != null ? (
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
