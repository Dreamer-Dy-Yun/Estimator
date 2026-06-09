import type { ReturnValue } from './hooks/useSecondaryAiCommentState'
import type { LiveOrderUnitSource } from './hooks/useSecondaryDrawerSnapshotController'
import type { CandidateStashSummary, SecondaryStockOrderCalcResult } from '../../../../api'
import type { ProductSalesInsightColumn, SecondaryDailyTrendPoint } from '../../../../api/types'
import type { SecondaryStockOrderDisplaySizeRow } from '../../../../api/types/secondary'
import type { ApiUnitErrorInfo } from '../../../../types'
import type { PortalHelpPlacement } from '../../PortalHelpPopover'
import type { CandidateStashPickerOption } from './CandidateStashPickerModal'
import type { InboundDueDateDefaults } from './hooks/useSecondaryInboundDueDates'
import type { SecondarySizeOrderDisplayRow } from './model/secondarySizeOrderRows'
import type { SecondaryHelpId } from './secondaryDrawerTypes'
import { useCallback, useMemo } from 'react'
import type { ProductComparisonBaseSubjectRef, ProductComparisonTarget, SecondaryCompetitorChannel } from '../../../../api'
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
  companyUuid?: string
  baseSubject: ProductComparisonBaseSubjectRef
  selfCompanyLabel: string
  pageName?: string
  prefillFromSnapshot?: OrderSnapshotDocumentV2 | null
  candidateItemContext?: CandidateItemPanelContext | null
  channelState: {
    competitorChannelId: string
    competitorChannels: SecondaryCompetitorChannel[]
    comparisonTarget: ProductComparisonTarget | null
    onCompetitorChannelChange: (next: string) => void
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
  companyUuid,
  baseSubject,
  selfCompanyLabel,
  pageName = 'ProductSecondaryDrawer',
  prefillFromSnapshot = null,
  candidateItemContext = null,
  channelState,
}: Props) : React.JSX.Element {
  const {
    competitorChannelId,
    competitorChannels,
    comparisonTarget,
    onCompetitorChannelChange,
  }: {
    competitorChannelId: string
    competitorChannels: SecondaryCompetitorChannel[]
    comparisonTarget: ProductComparisonTarget | null
    onCompetitorChannelChange: (next: string) => void
  } = channelState
  const { portalHelp, helpIds }: { portalHelp: { activeId: SecondaryHelpId | null; activePlacement: PortalHelpPlacement; position: { top: number; left: number; }; setAnchor: (id: SecondaryHelpId) => (el: HTMLElement | null) => void; open: (id: SecondaryHelpId, placement: PortalHelpPlacement) => void; updateMeasuredBox: (measuredWidth: number, measuredHeight: number) => void; scheduleClose: () => void; cancelClose: () => void; close: () => void; }; helpIds: { confirmOrder: string; forecastQtyCalc: string; expectedOpProfitRate: string; totalOrderBalance: string; expectedInboundOrderBalance: string; sizeRecQty: string; salesForecastSizeOrder: string; }; } = useSecondaryHelpController()
  const { showToast }: ReturnType<typeof useAppToast> = useAppToast()
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
  }: { defaultInboundDueDates: InboundDueDateDefaults; minOrderDate: string; currentOrderInboundDueDate: string; nextOrderInboundDueDate: string; leadTimeDays: number; setCurrentOrderInboundDueDate: React.Dispatch<React.SetStateAction<string>>; setNextOrderInboundDueDate: React.Dispatch<React.SetStateAction<string>>; handleCurrentOrderInboundDueDateChange: (next: string) => void; handleNextOrderInboundDueDateChange: (next: string) => void; resetInboundDueDatesToLive: () => void; } = useSecondaryInboundDueDates()

  const channel: SecondaryCompetitorChannel = useMemo<SecondaryCompetitorChannel>(() : SecondaryCompetitorChannel => {
    const selectedChannel: SecondaryCompetitorChannel | undefined = competitorChannels.find((ch: SecondaryCompetitorChannel) : boolean => ch.id === competitorChannelId)
    if (selectedChannel == null) {
      throw new Error(`ProductSecondaryDrawer: competitorChannelId "${competitorChannelId}" is not available.`)
    }
    return selectedChannel
  }, [competitorChannelId, competitorChannels])

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
    companyUuid,
    channel,
    candidateItemContext,
  })

  const snapshotController: { dailyMeanClient: number | null; setDailyMeanClient: (value: React.SetStateAction<number | null>) => void; bufferStock: number; setBufferStock: (value: React.SetStateAction<number>) => void; unitCostInput: number; setUnitCostInput: (value: React.SetStateAction<number>) => void; unitPriceInput: number; setUnitPriceInput: (value: React.SetStateAction<number>) => void; expectedFeeRatePct: number; setExpectedFeeRatePct: (value: React.SetStateAction<number>) => void; selfWeightPct: number; setSelfWeightPct: (value: React.SetStateAction<number>) => void; confirmBySize: Record<string, number>; setConfirmBySize: React.Dispatch<React.SetStateAction<Record<string, number>>>; hasSavedSnapshot: boolean; prefillKey: string | null; appliedPrefillKey: string | null; snapshotConfirmBySize: { [k: string]: number; }; snapshotConfirmBaselineActive: boolean; confirmedBaselineDraftDirty: boolean; markConfirmedBaselineDraftDirty: () => void; applyLiveOrderUnitInputs: (source: LiveOrderUnitSource) => void; handleResetToLive: (liveOrderUnitSource: LiveOrderUnitSource) => void; handleRestoreConfirmed: () => void; } = useSecondaryDrawerSnapshotController({
    prefillFromSnapshot,
    candidateItemContext,
    primarySkuGroupKey: primary.skuGroupKey,
    primaryPrice: primary.price,
    defaultInboundDueDates,
    minOrderDate,
    onChannelChange: onCompetitorChannelChange,
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
  }: { dailyMeanClient: number | null; setDailyMeanClient: (value: React.SetStateAction<number | null>) => void; bufferStock: number; setBufferStock: (value: React.SetStateAction<number>) => void; unitCostInput: number; setUnitCostInput: (value: React.SetStateAction<number>) => void; unitPriceInput: number; setUnitPriceInput: (value: React.SetStateAction<number>) => void; expectedFeeRatePct: number; setExpectedFeeRatePct: (value: React.SetStateAction<number>) => void; selfWeightPct: number; setSelfWeightPct: (value: React.SetStateAction<number>) => void; confirmBySize: Record<string, number>; setConfirmBySize: React.Dispatch<React.SetStateAction<Record<string, number>>>; hasSavedSnapshot: boolean; prefillKey: string | null; appliedPrefillKey: string | null; snapshotConfirmBySize: { [k: string]: number; }; snapshotConfirmBaselineActive: boolean; confirmedBaselineDraftDirty: boolean; markConfirmedBaselineDraftDirty: () => void; applyLiveOrderUnitInputs: (source: LiveOrderUnitSource) => void; handleResetToLive: (liveOrderUnitSource: LiveOrderUnitSource) => void; handleRestoreConfirmed: () => void; } = snapshotController

  const model: { stockOrderDisplay: { currentStockQtyTotal: number; totalOrderBalanceTotal: number; expectedInboundOrderBalanceTotal: number; sizeRows: SecondaryStockOrderDisplaySizeRow[]; } | null; stockOrderCalculationReady: boolean; guardStockOrderCalculation: () => boolean; candidateActions: { loading: boolean; listOpen: boolean; stashes: CandidateStashPickerOption[]; selectedCandidate: CandidateStashPickerOption | null; companyScopeBlocked: boolean; companyScopeBlockReason: string; nameInput: string; noteInput: string; setNameInput: React.Dispatch<React.SetStateAction<string>>; setNoteInput: React.Dispatch<React.SetStateAction<string>>; setListOpen: React.Dispatch<React.SetStateAction<boolean>>; createCandidate: () => Promise<boolean>; confirmOrder: () => Promise<boolean>; refresh: () => Promise<CandidateStashSummary[] | null>; openPicker: () => Promise<void>; confirmCandidateItem: () => Promise<boolean>; unconfirmCandidateItem: () => Promise<boolean>; selectCandidate: (row: CandidateStashPickerOption) => void; }; buildSnapshot: () => OrderSnapshotDocumentV2; handleConfirmQtyChange: (size: string, next: number, recommendedQty: number) => void; stockOrderDisplayInputs: { trendDailyMean: null; dailyMean: null; sigma: null; } | { trendDailyMean: number; dailyMean: number; sigma: number; }; sizeRows: SecondarySizeOrderDisplayRow[]; manualConfirmDerived: Record<string, true>; dailyTrendSizeOptions: { id: string; label: string; share: number; }[]; dailyTrend: { dailyTrendSeries: SecondaryDailyTrendPoint[]; dailyTrendLoading: boolean; dailyTrendError: ApiUnitErrorInfo | null; dailyPeriodShade: { x1: number; x2: number; }; dailyForecastShade: { x1: number; x2: number; } | null; dailyTickIndices: number[]; }; forecastCalc: SecondaryStockOrderCalcResult | null; forecastCalcError: ApiUnitErrorInfo | null; forecastCalcLoading: boolean; selfCol: ProductSalesInsightColumn | null; compCol: ProductSalesInsightColumn | null; salesInsightError: ApiUnitErrorInfo | null; salesInsightLoading: boolean; selectedStart: string; selectedEnd: string; } = useSecondaryForecastModel({
    primary,
    secondary,
    pageName,
    periodStart,
    periodEnd,
    selectedStartMonth,
    selectedEndMonth,
    forecastMonths,
    companyUuid,
    baseSubject,
    prefillFromSnapshot,
    candidateItemContext,
    channel,
    comparisonTarget,
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
    aiComment,
    hasSavedSnapshot,
    showToast,
  })
  const { selfCol, buildSnapshot }: { stockOrderDisplay: { currentStockQtyTotal: number; totalOrderBalanceTotal: number; expectedInboundOrderBalanceTotal: number; sizeRows: SecondaryStockOrderDisplaySizeRow[]; } | null; stockOrderCalculationReady: boolean; guardStockOrderCalculation: () => boolean; candidateActions: { loading: boolean; listOpen: boolean; stashes: CandidateStashPickerOption[]; selectedCandidate: CandidateStashPickerOption | null; companyScopeBlocked: boolean; companyScopeBlockReason: string; nameInput: string; noteInput: string; setNameInput: React.Dispatch<React.SetStateAction<string>>; setNoteInput: React.Dispatch<React.SetStateAction<string>>; setListOpen: React.Dispatch<React.SetStateAction<boolean>>; createCandidate: () => Promise<boolean>; confirmOrder: () => Promise<boolean>; refresh: () => Promise<CandidateStashSummary[] | null>; openPicker: () => Promise<void>; confirmCandidateItem: () => Promise<boolean>; unconfirmCandidateItem: () => Promise<boolean>; selectCandidate: (row: CandidateStashPickerOption) => void; }; buildSnapshot: () => OrderSnapshotDocumentV2; handleConfirmQtyChange: (size: string, next: number, recommendedQty: number) => void; stockOrderDisplayInputs: { trendDailyMean: null; dailyMean: null; sigma: null; } | { trendDailyMean: number; dailyMean: number; sigma: number; }; sizeRows: SecondarySizeOrderDisplayRow[]; manualConfirmDerived: Record<string, true>; dailyTrendSizeOptions: { id: string; label: string; share: number; }[]; dailyTrend: { dailyTrendSeries: SecondaryDailyTrendPoint[]; dailyTrendLoading: boolean; dailyTrendError: ApiUnitErrorInfo | null; dailyPeriodShade: { x1: number; x2: number; }; dailyForecastShade: { x1: number; x2: number; } | null; dailyTickIndices: number[]; }; forecastCalc: SecondaryStockOrderCalcResult | null; forecastCalcError: ApiUnitErrorInfo | null; forecastCalcLoading: boolean; selfCol: ProductSalesInsightColumn | null; compCol: ProductSalesInsightColumn | null; salesInsightError: ApiUnitErrorInfo | null; salesInsightLoading: boolean; selectedStart: string; selectedEnd: string; } = model

  useSecondaryDrawerLiveUnitDefaults({
    prefillFromSnapshot,
    primarySkuGroupKey: primary.skuGroupKey,
    liveOrderUnitSource: selfCol,
    applyLiveOrderUnitInputs,
  })

  const handleRequestAiComment: () => void = useCallback(() : void => {
    markConfirmedBaselineDraftDirty()
    requestAiComment(buildSnapshot())
  }, [buildSnapshot, markConfirmedBaselineDraftDirty, requestAiComment])
  const handleResetToLiveClick: () => void = useCallback(() : void => {
    if (selfCol == null) {
      showToast(KO.msgSalesInsightRequired, { variant: 'error' })
      return
    }
    handleResetToLive(selfCol)
  }, [handleResetToLive, selfCol, showToast])
  const handleCurrentOrderInboundDueDateDraftChange: (value: string) => void = useCallback((value: string) : void => {
    markConfirmedBaselineDraftDirty()
    handleCurrentOrderInboundDueDateChange(value)
  }, [handleCurrentOrderInboundDueDateChange, markConfirmedBaselineDraftDirty])
  const handleNextOrderInboundDueDateDraftChange: (value: string) => void = useCallback((value: string) : void => {
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
