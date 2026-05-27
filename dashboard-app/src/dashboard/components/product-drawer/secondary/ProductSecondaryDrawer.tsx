import { useCallback, useMemo } from 'react'
import type { SecondaryCompetitorChannel } from '../../../../api'
import { useAppToast } from '../../../../components/AppToastContext'
import type { ProductPrimarySummary, ProductSecondaryDetail } from '../../../../types'
import type { OrderSnapshotDocumentV2 } from '../../../../snapshot/orderSnapshotTypes'
import type { CandidateItemPanelContext } from './secondaryDrawerTypes'
import { useSecondaryAiCommentState } from './hooks/useSecondaryAiCommentState'
import {
  useSecondaryDrawerDraftEmission,
  useSecondaryDrawerLiveUnitDefaults,
  useSecondaryDrawerSnapshotController,
} from './hooks/useSecondaryDrawerSnapshotController'
import { useSecondaryForecastModel } from './hooks/useSecondaryForecastModel'
import { useSecondaryHelpController } from './hooks/useSecondaryHelpController'
import { useSecondaryInboundDueDates } from './hooks/useSecondaryInboundDueDates'
import { ProductSecondaryDrawerContent } from './ProductSecondaryDrawerContent'

export type { CandidateItemPanelContext }

type Props = {
  primary: ProductPrimarySummary
  secondary: ProductSecondaryDetail
  periodStart: string
  periodEnd: string
  forecastMonths: number
  companyUuid?: string
  selfCompanyLabel: string
  pageName?: string
  prefillFromSnapshot?: OrderSnapshotDocumentV2 | null
  candidateItemContext?: CandidateItemPanelContext | null
  channelState: {
    channelId: string
    competitorChannels: SecondaryCompetitorChannel[]
    onChannelChange: (next: string) => void
  }
}

export function ProductSecondaryDrawer({
  primary,
  secondary,
  periodStart,
  periodEnd,
  forecastMonths,
  companyUuid,
  selfCompanyLabel,
  pageName = 'ProductSecondaryDrawer',
  prefillFromSnapshot = null,
  candidateItemContext = null,
  channelState,
}: Props) {
  const { channelId, competitorChannels, onChannelChange } = channelState
  const { portalHelp, helpIds } = useSecondaryHelpController()
  const { showToast } = useAppToast()
  const {
    defaultInboundDueDates,
    minOrderDate,
    currentOrderInboundDueDate,
    nextOrderInboundDueDate,
    leadTimeDays,
    setCurrentOrderInboundDueDate,
    setNextOrderInboundDueDate,
    handleCurrentOrderInboundDueDateChange,
    handleNextOrderInboundDueDateChange,
    resetInboundDueDatesToLive,
  } = useSecondaryInboundDueDates()

  const channel = useMemo<SecondaryCompetitorChannel>(() => {
    const selectedChannel = competitorChannels.find((ch) => ch.id === channelId)
    if (selectedChannel == null) {
      throw new Error(`ProductSecondaryDrawer: channelId "${channelId}" is not available.`)
    }
    return selectedChannel
  }, [channelId, competitorChannels])

  const {
    aiPrompt,
    aiComment,
    aiCommentLoading,
    aiCommentError,
    requestAiComment,
    setAiPrompt,
    setAiComment,
  } = useSecondaryAiCommentState({
    pageName,
    skuGroupKey: primary.skuGroupKey,
    periodStart,
    periodEnd,
    forecastMonths,
    channel,
    candidateItemContext,
  })

  const snapshotController = useSecondaryDrawerSnapshotController({
    prefillFromSnapshot,
    candidateItemContext,
    primarySkuGroupKey: primary.skuGroupKey,
    primaryPrice: primary.price,
    defaultInboundDueDates,
    minOrderDate,
    onChannelChange,
    setCurrentOrderInboundDueDate,
    setNextOrderInboundDueDate,
    setAiPrompt,
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
  } = snapshotController

  const model = useSecondaryForecastModel({
    primary,
    secondary,
    pageName,
    periodStart,
    periodEnd,
    forecastMonths,
    companyUuid,
    prefillFromSnapshot,
    candidateItemContext,
    channel,
    snapshotConfirmBySize,
    useSnapshotConfirmBaseline: snapshotConfirmBaselineActive,
    dailyMeanClient,
    setDailyMeanClient,
    currentOrderInboundDueDate,
    nextOrderInboundDueDate,
    leadTimeDays,
    selfWeightPct,
    bufferStock,
    confirmBySize,
    setConfirmBySize,
    unitPriceInput,
    unitCostInput,
    expectedFeeRatePct,
    aiPrompt,
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

  const handleRequestAiComment = useCallback(() => {
    markConfirmedBaselineDraftDirty()
    requestAiComment(buildSnapshot())
  }, [buildSnapshot, markConfirmedBaselineDraftDirty, requestAiComment])
  const handleResetToLiveClick = useCallback(() => {
    handleResetToLive(selfCol)
  }, [handleResetToLive, selfCol])
  const handleCurrentOrderInboundDueDateDraftChange = useCallback((value: string) => {
    markConfirmedBaselineDraftDirty()
    handleCurrentOrderInboundDueDateChange(value)
  }, [handleCurrentOrderInboundDueDateChange, markConfirmedBaselineDraftDirty])
  const handleNextOrderInboundDueDateDraftChange = useCallback((value: string) => {
    markConfirmedBaselineDraftDirty()
    handleNextOrderInboundDueDateChange(value)
  }, [handleNextOrderInboundDueDateChange, markConfirmedBaselineDraftDirty])

  useSecondaryDrawerDraftEmission({
    appliedPrefillKey,
    canBuildSnapshot: model.stockOrderCalculationReady,
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
      channel={channel}
      candidateItemContext={candidateItemContext}
      hasSavedSnapshot={hasSavedSnapshot}
      showingConfirmedValues={snapshotConfirmBaselineActive && !confirmedBaselineDraftDirty}
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
      portalHelp={portalHelp}
      helpIds={helpIds}
    />
  )
}
