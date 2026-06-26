import type { ProductComparisonBaseSubjectRef, ProductComparisonTarget, ProductSecondaryDetail } from '../../../api'
import type { ApiUnitErrorInfo } from '../../../types'
import { useEffect, useMemo, useRef, useState } from 'react'
import { getCompanyUuidForOptionalScope } from '../../../api'
import { useAuth } from '../../../auth/AuthContext'
import { LoadingSpinner } from '../../../components/LoadingSpinner'
import type { ProductPrimarySummary } from '../../../types'
import type { AdjacentDirection } from '../../../utils/adjacentListNavigation'
import { normalizeMonthKey } from '../trend/trendRangeUtils'
import { ProductPrimaryDrawer } from './primary/ProductPrimaryDrawer'
import type { ProductMonthlyTrendChartPoint } from './primary/monthlyTrendChartModel'
import { ProductDrawerSecondaryPane } from './ProductDrawerSecondaryPane'
import type { CandidateItemPanelContext } from './secondary/secondaryDrawerTypes'
import { useProductComparisonTargets } from './useProductComparisonTargets'
import { useProductDrawerKeyboard } from './useProductDrawerKeyboard'
import { useSecondaryDrawerDetail } from './secondary/useSecondaryDrawerDetail'
import type { OrderSnapshotDocument } from '../../../snapshot/orderSnapshotTypes'
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
  hydrateSnapshot?: OrderSnapshotDocument | null
  initialExpandSecondary?: boolean
  secondaryEnabled?: boolean
  candidateItemContext?: CandidateItemPanelContext | null
  onRequestNavigateAdjacent?: (direction: AdjacentDirection) => void | Promise<void>
  onSecondaryOpenChange?: (open: boolean) => void
  disableAdjacentNavigation?: boolean
  keyboardShortcutsDisabled?: boolean
  suppressDocumentLayoutShift?: boolean
  closing?: boolean
}

export type ProductDrawerContentProps = ProductDrawerSharedProps & {
  summary: ProductPrimarySummary
  companyUuid?: string
  expandPaneOpen: boolean
  setExpandPaneOpen: React.Dispatch<React.SetStateAction<boolean>>
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
  secondaryEnabled = true,
  candidateItemContext,
  suppressDocumentLayoutShift,
  closing = false,
  expandPaneOpen,
  setExpandPaneOpen,
}: ProductDrawerContentProps) : React.JSX.Element {
  const pageName = 'ProductDrawer' as const
  const drawerRef: React.RefObject<HTMLElement | null> = useRef<HTMLElement | null>(null)

  const baseSubject: ProductComparisonBaseSubjectRef = useMemo(
    () : ProductComparisonBaseSubjectRef => ({
      role: 'base',
      kind: 'self-company',
      ...(companyUuid == null ? {} : { sourceId: companyUuid }),
    }),
    [companyUuid],
  )
  const {
    comparisonTargets,
    comparisonMode,
    comparisonTarget,
    targetsLoading,
    targetsError,
    setComparisonMode,
    setComparisonTargetId,
    setComparisonSubject,
  }: {
    comparisonTargets: ProductComparisonTarget[]
    comparisonMode: ProductComparisonTarget['kind']
    comparisonTarget: ProductComparisonTarget | null
    targetsLoading: boolean
    targetsError: ApiUnitErrorInfo | null
    setComparisonMode: React.Dispatch<React.SetStateAction<ProductComparisonTarget['kind']>>
    setComparisonTargetId: (next: string) => void
    setComparisonSubject: (next: ProductComparisonTarget) => void
  } = useProductComparisonTargets({ pageName, base: baseSubject })
  const {
    secondaryDetail,
    secondaryDetailError,
    hydrateForPanel,
  }: { secondaryDetail: ProductSecondaryDetail | null; secondaryDetailError: ApiUnitErrorInfo | null; hydrateForPanel: OrderSnapshotDocument | null; } = useSecondaryDrawerDetail({
    skuGroupKey: summary.skuGroupKey,
    expandPaneOpen,
    baseSubject,
    comparisonTarget,
    hydrateSnapshot,
    pageName,
  })
  const [monthlySalesTrend, setMonthlySalesTrend]: [ProductMonthlyTrendChartPoint[] | null, React.Dispatch<React.SetStateAction<ProductMonthlyTrendChartPoint[] | null>>] = useState<ProductMonthlyTrendChartPoint[] | null>(() => hydrateForPanel?.drawer1.monthlySalesTrend ?? null)
  const monthlyTrendSkuGroupKeyRef: React.MutableRefObject<string> = useRef(summary.skuGroupKey)

  useEffect(() : () => void => {
    let alive: boolean = true
    queueMicrotask(() : void => {
      if (!alive) return
      const nextMonthlySalesTrend: ProductMonthlyTrendChartPoint[] | null = hydrateForPanel?.drawer1.monthlySalesTrend ?? null
      const skuChanged: boolean = summary.skuGroupKey !== monthlyTrendSkuGroupKeyRef.current
      if (nextMonthlySalesTrend != null) {
        setMonthlySalesTrend(nextMonthlySalesTrend)
      } else if (skuChanged) {
        setMonthlySalesTrend(null)
      }
      if (skuChanged) monthlyTrendSkuGroupKeyRef.current = summary.skuGroupKey
    })
    return () : void => {
      alive = false
    }
  }, [hydrateForPanel?.drawer1.monthlySalesTrend, summary.skuGroupKey])

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

  const selectedComparisonTargetReady: boolean = comparisonTarget != null
  const selectedComparisonTargetMissing: boolean = !targetsLoading && comparisonTarget == null

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
            baseSubject={baseSubject}
            comparisonTarget={comparisonTarget}
            selectedStart={selectedStartMonth}
        selectedEnd={selectedEndMonth}
        forecastMonths={forecastMonths}
        selfCompanyLabel={selfCompanyLabel}
        onForecastMonthsChange={onForecastMonthsChange}
        onMonthlyTrendChange={setMonthlySalesTrend}
        expandPaneOpen={expandPaneOpen}
        secondaryEnabled={secondaryEnabled}
        onToggleSecondary={() : void => setExpandPaneOpen((v: boolean) : boolean => !v)}
        onClose={onClose}
        comparisonState={{
          comparisonTargets,
          comparisonMode,
          comparisonTarget,
          targetsLoading,
          targetsError,
          onComparisonModeChange: setComparisonMode,
          onComparisonTargetChange: setComparisonTargetId,
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
          monthlySalesTrend={monthlySalesTrend}
            companyUuid={companyUuid}
            baseSubject={baseSubject}
          selfCompanyLabel={selfCompanyLabel}
          targetsError={targetsError}
          targetsLoading={targetsLoading}
          selectedComparisonTargetReady={selectedComparisonTargetReady}
          selectedComparisonTargetMissing={selectedComparisonTargetMissing}
          secondaryDetail={secondaryDetail}
          secondaryDetailError={secondaryDetailError}
          hydrateForPanel={hydrateForPanel}
          candidateItemContext={candidateItemContext}
          comparisonState={{
            comparisonTarget,
            onComparisonSubjectChange: setComparisonSubject,
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
  onClose,
  periodStart,
  periodEnd,
  forecastMonths,
  selfCompanyLabel,
  onForecastMonthsChange,
  hydrateSnapshot,
  initialExpandSecondary: initialExpandSecondaryProp,
  secondaryEnabled: secondaryEnabledProp = true,
  candidateItemContext,
  onRequestNavigateAdjacent,
  onSecondaryOpenChange,
  disableAdjacentNavigation,
  keyboardShortcutsDisabled,
  suppressDocumentLayoutShift,
  closing = false,
}: ProductDrawerProps) : React.JSX.Element | null => {
  const { selectedCompanyUuid }: ReturnType<typeof useAuth> = useAuth()
  const companyUuid: string | undefined = companyUuidProp ?? getCompanyUuidForOptionalScope(selectedCompanyUuid)
  const secondaryEnabled: boolean = secondaryEnabledProp !== false
  const initialExpandSecondary: boolean = secondaryEnabled && Boolean(initialExpandSecondaryProp)
  const [expandPaneOpenState, setExpandPaneOpen]: [boolean, React.Dispatch<React.SetStateAction<boolean>>] = useState(() : boolean => initialExpandSecondary)
  const expandPaneOpen: boolean = secondaryEnabled && expandPaneOpenState
  const initialExpandSecondaryRef: React.RefObject<boolean> = useRef(initialExpandSecondary)

  useEffect(() : void => {
    if (initialExpandSecondaryRef.current === initialExpandSecondary) return
    initialExpandSecondaryRef.current = initialExpandSecondary
    queueMicrotask(() : void => setExpandPaneOpen(initialExpandSecondary))
  }, [initialExpandSecondary])

  useEffect(() : void => {
    onSecondaryOpenChange?.(expandPaneOpen)
  }, [onSecondaryOpenChange, expandPaneOpen])

  useProductDrawerKeyboard({
    closing,
    expandPaneOpen,
    setExpandPaneOpen,
    secondaryEnabled,
    onClose,
    onRequestNavigateAdjacent,
    disableAdjacentNavigation,
    disabled: keyboardShortcutsDisabled,
  })

  if (!summary) {
    if (!loading) return null
    return (
      <ProductDrawerLoadingPanel
        closing={closing}
        expandSecondary={expandPaneOpen}
      />
    )
  }
  return (
    <ProductDrawerContent
      summary={summary}
      companyUuid={companyUuid}
      onClose={onClose}
      periodStart={periodStart}
      periodEnd={periodEnd}
      forecastMonths={forecastMonths}
      selfCompanyLabel={selfCompanyLabel}
      onForecastMonthsChange={onForecastMonthsChange}
      hydrateSnapshot={hydrateSnapshot}
      secondaryEnabled={secondaryEnabled}
      candidateItemContext={candidateItemContext}
      suppressDocumentLayoutShift={suppressDocumentLayoutShift}
      closing={closing}
      expandPaneOpen={expandPaneOpen}
      setExpandPaneOpen={setExpandPaneOpen}
    />
  )
}

function ProductDrawerLoadingPanel({
  closing,
  expandSecondary = false,
}: {
  closing?: boolean
  expandSecondary?: boolean
}) : React.JSX.Element {
  return (
    <aside className={`${styles.drawer} ${expandSecondary ? styles.drawerWithExpandPane : ''} ${closing ? styles.drawerClosing : ''}`}>
      <div className={styles.drawerLoadingPanel}>
        <LoadingSpinner label="상품 정보를 불러오는 중" />
      </div>
    </aside>
  )
}
