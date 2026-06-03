import type { ProductSecondaryDetail, SecondaryCompetitorChannel } from '../../../api'
import type { ApiUnitErrorInfo } from '../../../types'
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

export type ProductDrawerSharedProps = {
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
  keyboardShortcutsDisabled?: boolean
  suppressDocumentLayoutShift?: boolean
  closing?: boolean
}

export type ProductDrawerContentProps = ProductDrawerSharedProps & {
  summary: ProductPrimarySummary
  companyUuid?: string
}

export type ProductDrawerProps = ProductDrawerSharedProps & {
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
  keyboardShortcutsDisabled,
  suppressDocumentLayoutShift,
  closing = false,
}: ProductDrawerContentProps) : React.JSX.Element {
  const pageName = 'ProductDrawer' as const
  const drawerRef: React.RefObject<HTMLElement | null> = useRef<HTMLElement | null>(null)
  const [expandPaneOpenState, setExpandPaneOpen]: [boolean, React.Dispatch<React.SetStateAction<boolean>>] = useState(() : boolean => !!initialExpandSecondary)
  const expandPaneOpen: boolean = secondaryEnabled && expandPaneOpenState
  const {
    competitorChannels,
    channelId,
    setChannelId,
    channelsError,
  }: { competitorChannels: SecondaryCompetitorChannel[]; channelId: string; setChannelId: React.Dispatch<React.SetStateAction<string>>; channelsError: ApiUnitErrorInfo | null; } = useCompetitorChannels(pageName)
  const {
    secondaryDetail,
    secondaryDetailError,
    hydrateForPanel,
  }: { secondaryDetail: ProductSecondaryDetail | null; secondaryDetailError: ApiUnitErrorInfo | null; hydrateForPanel: OrderSnapshotDocumentV2 | null; } = useSecondaryDrawerDetail({
    skuGroupKey: summary.skuGroupKey,
    expandPaneOpen,
    companyUuid,
    hydrateSnapshot,
    pageName,
  })

  useEffect(() : (() => void) | undefined => {
    if (suppressDocumentLayoutShift) return
    setBodyPrimaryDrawerOpen(true)
    return () : void => setBodyPrimaryDrawerOpen(false)
  }, [suppressDocumentLayoutShift])

  useEffect(() : () => void => {
    const onDocumentMouseDown: (event: MouseEvent) => void = (event: MouseEvent) : void => {
      const path: EventTarget[] = event.composedPath()
      const clickedInsideDrawer: boolean = drawerRef.current ? path.includes(drawerRef.current) : false
      if (clickedInsideDrawer) return

      if (shouldKeepDrawerOpenOnOutsideMouseDown(event)) return

      onClose()
    }

    document.addEventListener('mousedown', onDocumentMouseDown)
    return () : void => document.removeEventListener('mousedown', onDocumentMouseDown)
  }, [onClose])

  const selectedChannelReady: boolean = competitorChannels.some((channel: SecondaryCompetitorChannel) : boolean => channel.id === channelId)
  const selectedChannelMissing: boolean = channelId !== '' && !selectedChannelReady

  useProductDrawerKeyboard({
    closing,
    expandPaneOpen,
    setExpandPaneOpen,
    onClose,
    onRequestNavigateAdjacent,
    disableAdjacentNavigation,
    disabled: keyboardShortcutsDisabled,
    secondaryEnabled,
  })

  const selectedStartMonth: string = normalizeMonthKey(periodStart)
  const selectedEndMonth: string = normalizeMonthKey(periodEnd)

  return (
    <aside
      ref={drawerRef}
      className={`${styles.drawer} ${secondaryEnabled && expandPaneOpen ? styles.drawerWithExpandPane : ''} ${closing ? styles.drawerClosing : ''}`}
      onMouseDown={(e: React.MouseEvent<HTMLElement, MouseEvent>) : void => e.stopPropagation()}
      onClick={(e: React.MouseEvent<HTMLElement, MouseEvent>) : void => e.stopPropagation()}
    >
      <ProductPrimaryDrawer
        summary={summary}
        periodStart={periodStart}
        periodEnd={periodEnd}
        companyUuid={companyUuid}
        selectedStart={selectedStartMonth}
        selectedEnd={selectedEndMonth}
        forecastMonths={forecastMonths}
        selfCompanyLabel={selfCompanyLabel}
        onForecastMonthsChange={onForecastMonthsChange}
        expandPaneOpen={expandPaneOpen}
        secondaryEnabled={secondaryEnabled}
        onToggleSecondary={() : void => setExpandPaneOpen((v: boolean) : boolean => !v)}
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
          periodStart={periodStart}
          periodEnd={periodEnd}
          selectedStartMonth={selectedStartMonth}
          selectedEndMonth={selectedEndMonth}
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

export const ProductDrawer: (props: ProductDrawerProps) => React.JSX.Element | null = ({
  summary,
  loading = false,
  companyUuid: companyUuidProp,
  ...contentProps
}: ProductDrawerProps) : React.JSX.Element | null => {
  const { selectedCompanyUuid }: ReturnType<typeof useAuth> = useAuth()
  const companyUuid: string | undefined = companyUuidProp ?? getCompanyUuidForOptionalScope(selectedCompanyUuid)

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
}) : React.JSX.Element {
  useProductDrawerKeyboard({ closing, onClose })
  return (
    <aside className={`${styles.drawer} ${closing ? styles.drawerClosing : ''}`}>
      <div className={styles.drawerLoadingPanel}>
        <LoadingSpinner label="상품 정보를 불러오는 중" />
      </div>
    </aside>
  )
}
