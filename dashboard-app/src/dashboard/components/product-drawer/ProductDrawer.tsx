import { useEffect, useRef, useState } from 'react'
import { LoadingSpinner } from '../../../components/LoadingSpinner'
import type { ProductPrimarySummary } from '../../../types'
import type { AdjacentDirection } from '../../../utils/adjacentListNavigation'
import { normalizeMonthKey } from '../trend/trendRangeUtils'
import { ProductPrimaryDrawer } from './primary/ProductPrimaryDrawer'
import { ProductDrawerSecondaryPane } from './ProductDrawerSecondaryPane'
import type { CandidateItemPanelContext } from './secondary/candidateActionCards'
import { useCompetitorChannels } from './useCompetitorChannels'
import { useProductDrawerKeyboard } from './useProductDrawerKeyboard'
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
  secondaryEnabled = true,
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
  secondaryEnabled?: boolean
  candidateItemContext?: CandidateItemPanelContext | null
  onRequestNavigateAdjacent?: (direction: AdjacentDirection) => void | Promise<void>
  disableAdjacentNavigation?: boolean
  suppressDocumentLayoutShift?: boolean
  closing?: boolean
}) {
  const pageName = 'ProductDrawer'
  const drawerRef = useRef<HTMLElement | null>(null)
  const [expandPaneOpenState, setExpandPaneOpen] = useState(() => !!initialExpandSecondary)
  const expandPaneOpen = secondaryEnabled && expandPaneOpenState
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
    skuGroupKey: summary.skuGroupKey,
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

  useProductDrawerKeyboard({
    closing,
    expandPaneOpen,
    setExpandPaneOpen,
    onClose,
    onRequestNavigateAdjacent,
    disableAdjacentNavigation,
    secondaryEnabled,
  })

  const selectedStart = normalizeMonthKey(periodStart)
  const selectedEnd = normalizeMonthKey(periodEnd)

  return (
    <aside
      ref={drawerRef}
      className={`${styles.drawer} ${secondaryEnabled && expandPaneOpen ? styles.drawerWithExpandPane : ''} ${closing ? styles.drawerClosing : ''}`}
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
        secondaryEnabled={secondaryEnabled}
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

      {secondaryEnabled && (
        <ProductDrawerSecondaryPane
          open={expandPaneOpen}
          summary={summary}
          selectedStart={selectedStart}
          selectedEnd={selectedEnd}
          forecastMonths={forecastMonths}
          channelsError={channelsError}
          selectedChannelReady={selectedChannelReady}
          selectedChannelMissing={selectedChannelMissing}
          secondaryDetail={secondaryDetail}
          secondaryDetailError={secondaryDetailError}
          hydrateForPanel={hydrateForPanel}
          candidateItemContext={candidateItemContext}
          channelState={{
            channelId,
            competitorChannels,
            onChannelChange: setChannelId,
          }}
        />
      )}
    </aside>
  )
}

export const ProductDrawer = ({
  summary,
  loading = false,
  onClose,
  periodStart,
  periodEnd,
  forecastMonths,
  onForecastMonthsChange,
  hydrateSnapshot,
  initialExpandSecondary,
  secondaryEnabled,
  candidateItemContext,
  onRequestNavigateAdjacent,
  disableAdjacentNavigation,
  suppressDocumentLayoutShift,
  closing,
}: {
  summary: ProductPrimarySummary | null
  loading?: boolean
  onClose: () => void
  periodStart: string
  periodEnd: string
  forecastMonths: number
  onForecastMonthsChange: (months: number) => void
  hydrateSnapshot?: OrderSnapshotDocumentV1 | null
  initialExpandSecondary?: boolean
  secondaryEnabled?: boolean
  candidateItemContext?: CandidateItemPanelContext | null
  onRequestNavigateAdjacent?: (direction: AdjacentDirection) => void | Promise<void>
  disableAdjacentNavigation?: boolean
  suppressDocumentLayoutShift?: boolean
  closing?: boolean
}) => {
  if (!summary) {
    if (!loading) return null
    return <ProductDrawerLoadingPanel closing={closing} onClose={onClose} />
  }
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
      secondaryEnabled={secondaryEnabled}
      candidateItemContext={candidateItemContext}
      onRequestNavigateAdjacent={onRequestNavigateAdjacent}
      disableAdjacentNavigation={disableAdjacentNavigation}
      suppressDocumentLayoutShift={suppressDocumentLayoutShift}
      closing={closing}
    />
  )
}

function ProductDrawerLoadingPanel({
  closing,
  onClose,
}: {
  closing?: boolean
  onClose: () => void
}) {
  useProductDrawerKeyboard({ closing, onClose })
  return (
    <aside className={`${styles.drawer} ${closing ? styles.drawerClosing : ''}`}>
      <div className={styles.drawerLoadingPanel}>
        <LoadingSpinner label="상품 정보를 불러오는 중" />
      </div>
    </aside>
  )
}
