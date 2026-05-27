import { useEffect, useRef, useState } from 'react'
import { getCompanyUuidForOptionalScope } from '../../../api'
import { useAuth } from '../../../auth/AuthContext'
import { LoadingSpinner } from '../../../components/LoadingSpinner'
import type { ProductPrimarySummary } from '../../../types'
import type { AdjacentDirection } from '../../../utils/adjacentListNavigation'
import { normalizeMonthKey } from '../trend/trendRangeUtils'
import { ProductPrimaryDrawer } from './primary/ProductPrimaryDrawer'
import { ProductDrawerSecondaryPane } from './ProductDrawerSecondaryPane'
import type { CandidateItemPanelContext } from './secondary/secondaryDrawerTypes'
import { useCompetitorChannels } from './useCompetitorChannels'
import { useProductDrawerKeyboard } from './useProductDrawerKeyboard'
import { useSecondaryDrawerDetail } from './secondary/useSecondaryDrawerDetail'
import type { OrderSnapshotDocumentV2 } from '../../../snapshot/orderSnapshotTypes'
import { shouldKeepDrawerOpenOnOutsideMouseDown } from '../../drawer/drawerDom'
import { setBodyPrimaryDrawerOpen } from '../../drawer/primaryDrawerBody'
import styles from '../common.module.css'

type ProductDrawerSharedProps = {
  onClose: () => void
  periodStart: string
  periodEnd: string
  forecastMonths: number
  selfCompanyLabel: string
  onForecastMonthsChange: (months: number) => void
  hydrateSnapshot?: OrderSnapshotDocumentV2 | null
  initialExpandSecondary?: boolean
  secondaryEnabled?: boolean
  candidateItemContext?: CandidateItemPanelContext | null
  onRequestNavigateAdjacent?: (direction: AdjacentDirection) => void | Promise<void>
  disableAdjacentNavigation?: boolean
  suppressDocumentLayoutShift?: boolean
  closing?: boolean
}

type ProductDrawerContentProps = ProductDrawerSharedProps & {
  summary: ProductPrimarySummary
  companyUuid?: string
}

type ProductDrawerProps = ProductDrawerSharedProps & {
  summary: ProductPrimarySummary | null
  loading?: boolean
  companyUuid?: string
}

function ProductDrawerContent({
  summary,
  onClose,
  periodStart,
  periodEnd,
  companyUuid,
  forecastMonths,
  selfCompanyLabel,
  onForecastMonthsChange,
  hydrateSnapshot,
  initialExpandSecondary,
  secondaryEnabled = true,
  candidateItemContext,
  onRequestNavigateAdjacent,
  disableAdjacentNavigation,
  suppressDocumentLayoutShift,
  closing = false,
}: ProductDrawerContentProps) {
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

      if (shouldKeepDrawerOpenOnOutsideMouseDown(event)) return

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
        companyUuid={companyUuid}
        selectedStart={selectedStart}
        selectedEnd={selectedEnd}
        forecastMonths={forecastMonths}
        selfCompanyLabel={selfCompanyLabel}
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
          companyUuid={companyUuid}
          selfCompanyLabel={selfCompanyLabel}
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
  companyUuid: companyUuidProp,
  ...contentProps
}: ProductDrawerProps) => {
  const { selectedCompanyUuid } = useAuth()
  const companyUuid = companyUuidProp ?? getCompanyUuidForOptionalScope(selectedCompanyUuid)

  if (!summary) {
    if (!loading) return null
    return <ProductDrawerLoadingPanel closing={contentProps.closing} onClose={contentProps.onClose} />
  }
  return (
    <ProductDrawerContent
      {...contentProps}
      summary={summary}
      companyUuid={companyUuid}
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
