import type { ReturnValue } from './hooks/useSecondaryAiCommentState'
import type { PortalHelpPlacement } from '../../PortalHelpPopover'
import type { InboundDueDateDefaults } from './hooks/useSecondaryInboundDueDates'
import type { SecondaryHelpId } from './secondaryDrawerTypes'
import { useCallback } from 'react'
import type { ProductComparisonBaseSubjectRef, ProductComparisonTarget } from '../../../../api'
import { useAppToast } from '../../../../components/AppToastContext'
import type { ProductPrimarySummary, ProductSecondaryDetail } from '../../../../types'
import type { OrderSnapshotDocument } from '../../../../snapshot/orderSnapshotTypes'
import type { ProductMonthlyTrendChartPoint } from '../primary/monthlyTrendChartModel'
import type { CandidateItemPanelContext } from './secondaryDrawerTypes'
import type { SecondaryConfirmedRound } from './model/secondaryConfirmedRoundModel'
import { useSecondaryAiCommentState } from './hooks/useSecondaryAiCommentState'
import {
  useSecondaryDrawerDraftEmission,
  useSecondaryDrawerLiveUnitDefaults,
  useSecondaryDrawerSnapshotController,
} from './hooks/useSecondaryDrawerSnapshotController'
import { useSecondaryForecastModel } from './hooks/useSecondaryForecastModel'
import { useSecondaryHelpController } from './hooks/useSecondaryHelpController'
import { useSecondaryInboundDueDates } from './hooks/useSecondaryInboundDueDates'
import { KO } from '../ko'
import { ProductSecondaryDrawerContent } from './ProductSecondaryDrawerContent'

export type { CandidateItemPanelContext }

export type Props = {
  primary: ProductPrimarySummary
  secondary: ProductSecondaryDetail
  periodStart: string
  periodEnd: string
  selectedStartMonth: string
  selectedEndMonth: string
  forecastMonths: number
  monthlySalesTrend: ProductMonthlyTrendChartPoint[] | null
  companyUuid?: string
  baseSubject: ProductComparisonBaseSubjectRef
  selfCompanyLabel: string
  pageName?: string
  prefillFromSnapshot?: OrderSnapshotDocument | null
  candidateItemContext?: CandidateItemPanelContext | null
  comparisonState: {
    comparisonTarget: ProductComparisonTarget | null
    onComparisonSubjectChange: (next: ProductComparisonTarget) => void
  }
}

export function ProductSecondaryDrawer({
  primary,
  secondary,
  periodStart,
  periodEnd,
  selectedStartMonth,
  selectedEndMonth,
  forecastMonths,
  monthlySalesTrend,
  companyUuid,
  baseSubject,
  selfCompanyLabel,
  pageName = 'ProductSecondaryDrawer',
  prefillFromSnapshot = null,
  candidateItemContext = null,
  comparisonState,
}: Props) : React.JSX.Element {
  const {
    comparisonTarget,
    onComparisonSubjectChange,
  }: {
    comparisonTarget: ProductComparisonTarget | null
    onComparisonSubjectChange: (next: ProductComparisonTarget) => void
  } = comparisonState
  const { portalHelp, helpIds }: { portalHelp: { activeId: SecondaryHelpId | null; activePlacement: PortalHelpPlacement; position: { top: number; left: number; }; setAnchor: (id: SecondaryHelpId) => (el: HTMLElement | null) => void; open: (id: SecondaryHelpId, placement: PortalHelpPlacement) => void; updateMeasuredBox: (measuredWidth: number, measuredHeight: number) => void; scheduleClose: () => void; cancelClose: () => void; close: () => void; }; helpIds: { confirmOrder: string; orderQtyCalc: string; expectedOpProfitRate: string; totalOrderBalance: string; sizeRecQty: string; salesForecastSizeOrder: string; inboundSplitSchedule: string; }; } = useSecondaryHelpController()
  const { showToast }: ReturnType<typeof useAppToast> = useAppToast()
  const {
    defaultInboundDueDates,
    minOrderDate,
    currentOrderInboundDueDate,
    nextOrderInboundDueDate,
    orderCoverageDays,
    setCurrentOrderInboundDueDate,
    setNextOrderInboundDueDate,
    handleCurrentOrderInboundDueDateChange,
    handleNextOrderInboundDueDateChange,
    resetInboundDueDatesToLive,
  }: { defaultInboundDueDates: InboundDueDateDefaults; minOrderDate: string; currentOrderInboundDueDate: string; nextOrderInboundDueDate: string; orderCoverageDays: number; setCurrentOrderInboundDueDate: React.Dispatch<React.SetStateAction<string>>; setNextOrderInboundDueDate: React.Dispatch<React.SetStateAction<string>>; handleCurrentOrderInboundDueDateChange: (next: string) => void; handleNextOrderInboundDueDateChange: (next: string) => void; resetInboundDueDatesToLive: () => void; } = useSecondaryInboundDueDates()

  if (comparisonTarget == null) throw new Error('ProductSecondaryDrawer: comparisonTarget is required.')

  const {
    aiComment,
    aiCommentLoading,
    aiCommentError,
    requestAiComment,
    setAiComment,
  }: ReturnValue = useSecondaryAiCommentState({
    pageName,
    skuGroupKey: primary.skuGroupKey,
    periodStart,
    periodEnd,
    forecastMonths,
    baseSubject,
    comparisonTarget,
    candidateItemContext,
  })

  const snapshotController = useSecondaryDrawerSnapshotController({
    prefillFromSnapshot,
    candidateItemContext,
    primarySkuGroupKey: primary.skuGroupKey,
    primaryPrice: primary.price,
    defaultInboundDueDates,
    minOrderDate,
    onComparisonSubjectChange,
    setCurrentOrderInboundDueDate,
    setNextOrderInboundDueDate,
    setAiComment,
    resetInboundDueDatesToLive,
  })
  const {
    dailyMeanClient,
    setDailyMeanClient,
    bufferStock,
    setBufferStock,
    unitCostInput,
    setUnitCostInput,
    unitPriceInput,
    setUnitPriceInput,
    expectedFeeRatePct,
    setExpectedFeeRatePct,
    selfWeightPct,
    setSelfWeightPct,
    confirmBySize,
    setConfirmBySize,
    hasSavedSnapshot,
    prefillKey,
    appliedPrefillKey,
    snapshotConfirmBySize,
    snapshotConfirmBaselineActive,
    confirmedBaselineDraftDirty,
    markConfirmedBaselineDraftDirty,
    applyLiveOrderUnitInputs,
    handleResetToLive,
    handleRestoreConfirmed,
    confirmedRounds,
    setConfirmedRounds,
  } = snapshotController
  const confirmedSnapshotBaselineActive: boolean = snapshotConfirmBaselineActive && !confirmedBaselineDraftDirty
  const snapshotDataBaselineActive: boolean =
    prefillFromSnapshot != null &&
    prefillKey != null &&
    appliedPrefillKey === prefillKey &&
    !confirmedBaselineDraftDirty

  const model = useSecondaryForecastModel({
    primary,
    secondary,
    pageName,
    periodStart,
    periodEnd,
    selectedStartMonth,
    selectedEndMonth,
    forecastMonths,
    monthlySalesTrend,
    companyUuid,
    baseSubject,
    prefillFromSnapshot,
    candidateItemContext,
    comparisonTarget,
    snapshotConfirmBySize,
    useSnapshotDataBaseline: snapshotDataBaselineActive,
    dailyMeanClient,
    setDailyMeanClient,
    currentOrderInboundDueDate,
    nextOrderInboundDueDate,
    orderCoverageDays,
    selfWeightPct,
    bufferStock,
    confirmBySize,
    setConfirmBySize,
    confirmedRounds,
    setConfirmedRounds,
    unitPriceInput,
    unitCostInput,
    expectedFeeRatePct,
    aiComment,
    hasSavedSnapshot,
    showToast,
  })
  const { selfCol, buildSnapshot } = model

  useSecondaryDrawerLiveUnitDefaults({
    prefillFromSnapshot,
    primarySkuGroupKey: primary.skuGroupKey,
    liveOrderUnitSource: selfCol,
    applyLiveOrderUnitInputs,
  })

  const handleRequestAiComment: () => void = useCallback(() : void => {
    if (!model.snapshotReady) {
      showToast(KO.msgStockOrderCalcRequired, { variant: 'error' })
      return
    }
    markConfirmedBaselineDraftDirty()
    requestAiComment(buildSnapshot())
  }, [buildSnapshot, markConfirmedBaselineDraftDirty, model.snapshotReady, requestAiComment, showToast])
  const handleResetToLiveClick: () => void = useCallback(() : void => {
    if (selfCol == null) {
      showToast(KO.msgSalesInsightRequired, { variant: 'error' })
      return
    }
    handleResetToLive(selfCol)
  }, [handleResetToLive, selfCol, showToast])
  const handleCurrentOrderInboundDueDateDraftChange: (value: string) => void = useCallback((value: string) : void => {
    markConfirmedBaselineDraftDirty()
    setConfirmedRounds([])
    handleCurrentOrderInboundDueDateChange(value)
  }, [handleCurrentOrderInboundDueDateChange, markConfirmedBaselineDraftDirty, setConfirmedRounds])
  const handleNextOrderInboundDueDateDraftChange: (value: string) => void = useCallback((value: string) : void => {
    markConfirmedBaselineDraftDirty()
    setConfirmedRounds([])
    handleNextOrderInboundDueDateChange(value)
  }, [handleNextOrderInboundDueDateChange, markConfirmedBaselineDraftDirty, setConfirmedRounds])
  const handleConfirmedRoundsChange: (next: SecondaryConfirmedRound[]) => void = useCallback((next: SecondaryConfirmedRound[]) : void => {
    setConfirmedRounds(next)
  }, [setConfirmedRounds])

  useSecondaryDrawerDraftEmission({
    appliedPrefillKey,
    canBuildSnapshot: model.snapshotReady,
    candidateItemContext,
    buildSnapshot,
    prefillKey,
    snapshotConfirmBaselineActive,
    confirmedBaselineDraftDirty,
  })

  return (
    <ProductSecondaryDrawerContent
      pageName={pageName}
      primary={primary}
      comparisonLabel={comparisonTarget.label}
      candidateItemContext={candidateItemContext}
      hasSavedSnapshot={hasSavedSnapshot}
      showingConfirmedValues={confirmedSnapshotBaselineActive}
      onResetToLive={handleResetToLiveClick}
      onRestoreConfirmed={handleRestoreConfirmed}
      model={model}
      aiComment={aiComment}
      aiCommentLoading={aiCommentLoading}
      aiCommentError={aiCommentError}
      onRequestAiComment={handleRequestAiComment}
      selfCompanyLabel={selfCompanyLabel}
      selfWeightPct={selfWeightPct}
      onSelfWeightPctChange={setSelfWeightPct}
      orderInputFields={{
        minOrderDate,
        currentOrderInboundDueDate,
        nextOrderInboundDueDate,
        bufferStock,
        unitCost: unitCostInput,
        unitPrice: unitPriceInput,
        expectedFeeRatePct,
      }}
      orderInputActions={{
        onCurrentOrderInboundDueDateChange: handleCurrentOrderInboundDueDateDraftChange,
        onNextOrderInboundDueDateChange: handleNextOrderInboundDueDateDraftChange,
        onBufferStockChange: setBufferStock,
        onUnitCostChange: setUnitCostInput,
        onUnitPriceChange: setUnitPriceInput,
        onExpectedFeeRatePctChange: setExpectedFeeRatePct,
      }}
      confirmedRounds={confirmedRounds}
      onConfirmedRoundsChange={handleConfirmedRoundsChange}
      portalHelp={portalHelp}
      helpIds={helpIds}
    />
  )
}
