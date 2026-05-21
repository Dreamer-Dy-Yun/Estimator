import { useCallback, useMemo } from 'react'
import type { SecondaryCompetitorChannel } from '../../../../api'
import { useAppToast } from '../../../../components/AppToastContext'
import type { ProductPrimarySummary, ProductSecondaryDetail } from '../../../../types'
import type { OrderSnapshotDocumentV1 } from '../../../../snapshot/orderSnapshotTypes'
import type { CandidateItemPanelContext } from './candidateActionCards'
import { useSecondaryAiCommentState } from './hooks/useSecondaryAiCommentState'
import {
  useSecondaryDrawerDraftEmission,
  useSecondaryDrawerLiveUnitDefaults,
  useSecondaryDrawerSnapshotController,
} from './hooks/useSecondaryDrawerSnapshotController'
import { useSecondaryForecastModel } from './hooks/useSecondaryForecastModel'
import { useSecondaryHelpController } from './hooks/useSecondaryHelpController'
import { useSecondaryLeadTimeDates } from './hooks/useSecondaryLeadTimeDates'
import { ProductSecondaryDrawerContent } from './ProductSecondaryDrawerContent'

export type { CandidateItemPanelContext }

const SAFETY_STOCK_MODE: 'manual' | 'formula' = 'formula'
const MANUAL_SAFETY_STOCK = 0
const SERVICE_LEVEL_PCT = 95

type Props = {
  primary: ProductPrimarySummary
  secondary: ProductSecondaryDetail
  periodStart: string
  periodEnd: string
  /** 오더 스냅샷용: 월간 포캐스트 개월 수 */
  forecastMonths: number
  selfCompanyLabel: string
  pageName?: string
  /** 후보군 등에서 불러온 저장 스냅샷으로 폼·확정 수량 복원 */
  prefillFromSnapshot?: OrderSnapshotDocumentV1 | null
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
    defaultLeadTime,
    minOrderDate,
    leadTimeStartDate,
    leadTimeEndDate,
    leadTimeDays,
    setLeadTimeStartDate,
    setLeadTimeEndDate,
    handleCurrentOrderDateChange,
    handleNextOrderDateChange,
    resetLeadTimeToLive,
  } = useSecondaryLeadTimeDates()

  const viewPeriodStart = periodStart
  const viewPeriodEnd = periodEnd

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
    periodStart: viewPeriodStart,
    periodEnd: viewPeriodEnd,
    forecastMonths,
    channel,
    candidateItemContext,
  })

  const snapshotController = useSecondaryDrawerSnapshotController({
    prefillFromSnapshot,
    candidateItemContext,
    primarySkuGroupKey: primary.skuGroupKey,
    primaryPrice: primary.price,
    defaultLeadTime,
    minOrderDate,
    onChannelChange,
    setLeadTimeStartDate,
    setLeadTimeEndDate,
    setAiPrompt,
    setAiComment,
    resetLeadTimeToLive,
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
    prefillFromSnapshot,
    candidateItemContext,
    channel,
    viewPeriodStart,
    viewPeriodEnd,
    snapshotConfirmBySize,
    useSnapshotConfirmBaseline: snapshotConfirmBaselineActive,
    dailyMeanClient,
    setDailyMeanClient,
    leadTimeStartDate,
    leadTimeEndDate,
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
    safetyStockMode: SAFETY_STOCK_MODE,
    manualSafetyStock: MANUAL_SAFETY_STOCK,
    serviceLevelPct: SERVICE_LEVEL_PCT,
    hasSavedSnapshot,
    showToast,
  })
  const { selfCol } = model
  const buildCurrentSnapshot = model.buildSnapshot

  useSecondaryDrawerLiveUnitDefaults({
    prefillFromSnapshot,
    primarySkuGroupKey: primary.skuGroupKey,
    liveOrderUnitSource: selfCol,
    applyLiveOrderUnitInputs,
  })

  const handleRequestAiComment = useCallback(() => {
    requestAiComment(buildCurrentSnapshot())
  }, [buildCurrentSnapshot, requestAiComment])
  const handleResetToLiveClick = useCallback(() => {
    handleResetToLive(selfCol)
  }, [handleResetToLive, selfCol])

  useSecondaryDrawerDraftEmission({
    appliedPrefillKey,
    candidateItemContext,
    buildCurrentSnapshot,
    prefillKey,
    snapshotConfirmBaselineActive,
  })

  return (
    <ProductSecondaryDrawerContent
      pageName={pageName}
      primary={primary}
      channel={channel}
      candidateItemContext={candidateItemContext}
      hasSavedSnapshot={hasSavedSnapshot}
      showingConfirmedValues={snapshotConfirmBaselineActive}
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
      minOrderDate={minOrderDate}
      leadTimeStartDate={leadTimeStartDate}
      leadTimeEndDate={leadTimeEndDate}
      bufferStock={bufferStock}
      unitCostInput={unitCostInput}
      unitPriceInput={unitPriceInput}
      expectedFeeRatePct={expectedFeeRatePct}
      onCurrentOrderDateChange={handleCurrentOrderDateChange}
      onNextOrderDateChange={handleNextOrderDateChange}
      onBufferStockChange={setBufferStock}
      onUnitCostChange={setUnitCostInput}
      onUnitPriceChange={setUnitPriceInput}
      onExpectedFeeRatePctChange={setExpectedFeeRatePct}
      portalHelp={portalHelp}
      helpIds={helpIds}
    />
  )
}
