import type { CandidateStashSummary, SecondaryStockOrderCalcResult } from '../../../../../api'
import type { ProductSalesInsightColumn, SecondaryDailyTrendPoint, SecondaryInboundSplitSource } from '../../../../../api/types'
import type { SecondaryStockOrderDisplaySizeRow } from '../../../../../api/types/secondary'
import type { ApiUnitErrorInfo } from '../../../../../types'
import type { CandidateStashPickerOption } from '../CandidateStashPickerModal'
import type { SecondarySizeOrderDisplayRow } from '../model/secondarySizeOrderRows'
import type { ProductMonthlyTrendChartPoint } from '../../primary/monthlyTrendChartModel'
import type { SecondaryAiCommentView } from '../model/secondaryAiCommentModel'
import type { SecondaryConfirmedRound } from '../model/secondaryConfirmedRoundModel'
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ProductComparisonBaseSubjectRef, ProductComparisonTarget } from '../../../../../api'
import type { ToastContextValue } from '../../../../../components/AppToastContext'
import type { ProductPrimarySummary, ProductSecondaryDetail } from '../../../../../types'
import type { OrderSnapshotDocument } from '../../../../../snapshot/orderSnapshotTypes'
import { addIsoDays } from '../../../../../utils/date'
import type { CandidateItemPanelContext } from '../secondaryDrawerTypes'
import { SecondaryOrderDraft } from '../model/SecondaryOrderDraft'
import { buildSecondaryOrderSnapshot } from '../secondarySnapshot'
import { KO } from '../../ko'
import { useSecondaryCandidateActions } from './useSecondaryCandidateActions'
import { useSecondaryDrawerRequests } from './useSecondaryDrawerRequests'
import { useSecondaryOrderCalculations } from './useSecondaryOrderCalculations'

export type Args = {
  primary: ProductPrimarySummary
  secondary: ProductSecondaryDetail
  pageName: string
  periodStart: string
  periodEnd: string
  selectedStartMonth: string
  selectedEndMonth: string
  forecastMonths: number
  monthlySalesTrend: ProductMonthlyTrendChartPoint[] | null
  companyUuid?: string
  baseSubject: ProductComparisonBaseSubjectRef
  prefillFromSnapshot: OrderSnapshotDocument | null
  candidateItemContext: CandidateItemPanelContext | null
  comparisonTarget: ProductComparisonTarget
  snapshotConfirmBySize: Record<string, number>
  useSnapshotConfirmBaseline: boolean
  dailyMeanClient: number | null
  setDailyMeanClient: (value: number | null) => void
  currentOrderInboundDueDate: string
  nextOrderInboundDueDate: string
  orderCoverageDays: number
  selfWeightPct: number
  bufferStock: number
  confirmBySize: Record<string, number>
  setConfirmBySize: React.Dispatch<React.SetStateAction<Record<string, number>>>
  confirmedRounds: SecondaryConfirmedRound[]
  setConfirmedRounds: React.Dispatch<React.SetStateAction<SecondaryConfirmedRound[]>>
  unitPriceInput: number
  unitCostInput: number
  expectedFeeRatePct: number
  aiComment: SecondaryAiCommentView
  hasSavedSnapshot: boolean
  showToast: ToastContextValue['showToast']
}

export function useSecondaryForecastModel(args: Args) : { stockOrderDisplay: { currentStockQtyTotal: number; totalOrderBalanceTotal: number; expectedInboundOrderBalanceTotal: number; sizeRows: SecondaryStockOrderDisplaySizeRow[]; } | null; stockOrderCalculationReady: boolean; snapshotReady: boolean; guardStockOrderCalculation: () => boolean; candidateActions: { loading: boolean; listOpen: boolean; stashes: CandidateStashPickerOption[]; selectedCandidate: CandidateStashPickerOption | null; companyScopeBlocked: boolean; companyScopeBlockReason: string; nameInput: string; noteInput: string; setNameInput: React.Dispatch<React.SetStateAction<string>>; setNoteInput: React.Dispatch<React.SetStateAction<string>>; setListOpen: React.Dispatch<React.SetStateAction<boolean>>; createCandidate: () => Promise<boolean>; confirmOrder: () => Promise<boolean>; refresh: () => Promise<CandidateStashSummary[] | null>; openPicker: () => Promise<void>; confirmCandidateItem: () => Promise<boolean>; unconfirmCandidateItem: () => Promise<boolean>; selectCandidate: (row: CandidateStashPickerOption) => void; }; buildSnapshot: () => OrderSnapshotDocument; handleConfirmQtyChange: (size: string, next: number, recommendedQty: number) => void; stockOrderDisplayInputs: { trendDailyMean: null; dailyMean: null; sigma: null; } | { trendDailyMean: number; dailyMean: number; sigma: number; }; sizeRows: SecondarySizeOrderDisplayRow[]; manualConfirmDerived: Record<string, true>; dailyTrendSizeOptions: { id: string; label: string; share: number; }[]; dailyTrend: { dailyTrendSeries: SecondaryDailyTrendPoint[]; dailyTrendLoading: boolean; dailyTrendError: ApiUnitErrorInfo | null; dailyPeriodShade: { x1: number; x2: number; }; dailyForecastShade: { x1: number; x2: number; } | null; dailyTickIndices: number[]; selectedSizeId: string; onSelectedSizeChange: (sizeId: string) => void; }; calculationBaseDate: string; inboundSplitSource: SecondaryInboundSplitSource | null; inboundSplitSourceLoading: boolean; inboundSplitSourceError: ApiUnitErrorInfo | null; stockOrderCalc: SecondaryStockOrderCalcResult | null; stockOrderCalcError: ApiUnitErrorInfo | null; stockOrderCalcLoading: boolean; selfCol: ProductSalesInsightColumn | null; compCol: ProductSalesInsightColumn | null; salesInsightError: ApiUnitErrorInfo | null; salesInsightLoading: boolean; selectedStart: string; selectedEnd: string; } {
  const {
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
    useSnapshotConfirmBaseline,
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
  }: Args = args
  const selectedStart: string = selectedStartMonth
  const selectedEnd: string = selectedEndMonth
  const forecastPeriodEndMonth: string = addIsoDays(nextOrderInboundDueDate, -1).slice(0, 7)
  const [dailyTrendSizeSelection, setDailyTrendSizeSelection]: [{ skuGroupKey: string; sizeId: string; } | null, React.Dispatch<React.SetStateAction<{ skuGroupKey: string; sizeId: string; } | null>>] = useState<{ skuGroupKey: string; sizeId: string } | null>(null)
  const selectedDailyTrendSizeId: string = dailyTrendSizeSelection?.skuGroupKey === primary.skuGroupKey ? dailyTrendSizeSelection.sizeId : 'all'
  const dailyTrendSize: string | null = selectedDailyTrendSizeId === 'all' ? null : selectedDailyTrendSizeId
  const handleDailyTrendSizeChange: (sizeId: string) => void = useCallback((sizeId: string): void => {
    setDailyTrendSizeSelection({ skuGroupKey: primary.skuGroupKey, sizeId })
  }, [primary.skuGroupKey])

  useEffect(() : void => {
    if (prefillFromSnapshot != null) return
    setDailyMeanClient(null)
  }, [primary.skuGroupKey, periodEnd, periodStart, prefillFromSnapshot, setDailyMeanClient])

  const requests: { calculationBaseDate: string; dailyTrend: { dailyTrendSeries: SecondaryDailyTrendPoint[]; dailyTrendLoading: boolean; dailyTrendError: ApiUnitErrorInfo | null; dailyPeriodShade: { x1: number; x2: number; }; dailyForecastShade: { x1: number; x2: number; } | null; dailyTickIndices: number[]; }; inboundSplitSource: SecondaryInboundSplitSource | null; inboundSplitSourceLoading: boolean; inboundSplitSourceError: ApiUnitErrorInfo | null; stockOrderCalc: SecondaryStockOrderCalcResult | null; stockOrderCalcError: ApiUnitErrorInfo | null; stockOrderCalcLoading: boolean; selfCol: ProductSalesInsightColumn | null; compCol: ProductSalesInsightColumn | null; salesInsightError: ApiUnitErrorInfo | null; salesInsightLoading: boolean; } = useSecondaryDrawerRequests({
    pageName,
    primary,
    comparisonTarget,
    periodStart,
    periodEnd,
    selectedStartMonth,
    selectedEndMonth,
    dailyTrendSize,
    baseSubject,
    forecastPeriodEndMonth,
    orderCoverageDays,
    selfWeightPct,
    dailyMeanClient,
    currentOrderInboundDueDate,
    nextOrderInboundDueDate,
  })
  const snapshotStockOrderResult: SecondaryStockOrderCalcResult | null = useSnapshotConfirmBaseline ? prefillFromSnapshot?.drawer2.stockOrderResult ?? null : null
  const activeStockOrderCalc: SecondaryStockOrderCalcResult | null = useSnapshotConfirmBaseline ? snapshotStockOrderResult : requests.stockOrderCalc
  const activeInboundSplitSource: SecondaryInboundSplitSource | null = activeStockOrderCalc?.inboundSplitSource ?? null
  const activeCalculationBaseDate: string = snapshotStockOrderResult == null
    ? requests.calculationBaseDate
    : (prefillFromSnapshot?.savedAt.slice(0, 10) ?? requests.calculationBaseDate)
  const activeStockOrderCalcLoading: boolean = snapshotStockOrderResult != null ? false : requests.stockOrderCalcLoading
  const activeStockOrderCalcError: ApiUnitErrorInfo | null = snapshotStockOrderResult != null ? null : requests.stockOrderCalcError
  const activeInboundSplitSourceLoading: boolean = snapshotStockOrderResult != null ? false : requests.inboundSplitSourceLoading
  const activeInboundSplitSourceError: ApiUnitErrorInfo | null = snapshotStockOrderResult != null ? null : requests.inboundSplitSourceError
  const salesInsightReady: boolean =
    requests.selfCol != null &&
    requests.compCol != null &&
    !requests.salesInsightLoading &&
    requests.salesInsightError == null
  const stockOrderCalculationReady: boolean = activeStockOrderCalc != null && (snapshotStockOrderResult != null || (!requests.stockOrderCalcLoading && salesInsightReady))
  const guardStockOrderCalculation: () => boolean = useCallback(() : boolean => {
    if (stockOrderCalculationReady) return true
    showToast(KO.msgStockOrderCalcRequired, { variant: 'error' })
    return false
  }, [showToast, stockOrderCalculationReady])
  const stockOrderDisplayKey: string = useMemo(() : string => {
    const d: { currentStockQtyTotal: number; totalOrderBalanceTotal: number; expectedInboundOrderBalanceTotal: number; sizeRows: SecondaryStockOrderDisplaySizeRow[]; } | undefined = activeStockOrderCalc?.display
    if (!d) return ''
    return [
      d.currentStockQtyTotal,
      d.totalOrderBalanceTotal,
      d.expectedInboundOrderBalanceTotal,
      ...d.sizeRows.map((row: SecondaryStockOrderDisplaySizeRow) : string => `${row.size}:${row.currentStockQty}:${row.totalOrderBalance}:${row.expectedInboundOrderBalance}`),
    ].join('|')
  }, [activeStockOrderCalc])

  useEffect(() : void => {
    if (useSnapshotConfirmBaseline) return
    setConfirmBySize({})
    setConfirmedRounds([])
  }, [
    useSnapshotConfirmBaseline,
    bufferStock,
    dailyMeanClient,
    nextOrderInboundDueDate,
    currentOrderInboundDueDate,
    prefillFromSnapshot,
    periodEnd,
    periodStart,
    primary.skuGroupKey,
    selectedEnd,
    selectedStart,
    selfWeightPct,
    stockOrderDisplayKey,
    setConfirmedRounds,
    setConfirmBySize,
  ])

  const calculations: { stockOrderCalculationReady: boolean; stockOrderDisplayInputs: { trendDailyMean: null; dailyMean: null; sigma: null; } | { trendDailyMean: number; dailyMean: number; sigma: number; }; sizeRows: SecondarySizeOrderDisplayRow[]; manualConfirmDerived: Record<string, true>; dailyTrendSizeOptions: { id: string; label: string; share: number; }[]; } = useSecondaryOrderCalculations({
    secondary,
    currentOrderInboundDueDate,
    nextOrderInboundDueDate,
    dailyMeanClient,
    stockOrderCalc: activeStockOrderCalc,
    stockOrderCalculationReady,
    selfWeightPct,
    bufferStock,
    confirmBySize,
    snapshotConfirmBySize,
    useSnapshotConfirmBaseline,
    snapshotSizeOrders: snapshotStockOrderResult == null ? null : prefillFromSnapshot?.drawer2.sizeOrders ?? null,
  })
  const stockOrderDisplay: { currentStockQtyTotal: number; totalOrderBalanceTotal: number; expectedInboundOrderBalanceTotal: number; sizeRows: SecondaryStockOrderDisplaySizeRow[]; } | null = stockOrderCalculationReady ? activeStockOrderCalc?.display ?? null : null
  const snapshotReady: boolean = stockOrderCalculationReady && monthlySalesTrend != null

  const buildSnapshot: () => OrderSnapshotDocument = useCallback((): OrderSnapshotDocument => {
    if (monthlySalesTrend == null) throw new Error('monthlySalesTrend is required to build order snapshot')
    if (!stockOrderCalculationReady || activeStockOrderCalc == null) throw new Error('stockOrderResult is required to build order snapshot')
    return buildSecondaryOrderSnapshot({
      primary,
      monthlySalesTrend,
      secondary,
      periodStart,
      periodEnd,
      forecastMonths,
      baseSubject,
      comparisonSubject: comparisonTarget,
      selectedStart,
      orderCoverageDays,
      stockOrderRequest: {
        currentOrderInboundDueDate,
        nextOrderInboundDueDate,
        orderCoverageDays,
        ...(dailyMeanClient == null ? {} : { dailyMeanOverride: dailyMeanClient }),
      },
      stockOrderResult: activeStockOrderCalc,
      selfWeightPct,
      bufferStock,
      aiComment,
      unitPrice: unitPriceInput,
      unitCost: unitCostInput,
      expectedFeeRatePct,
      sizeRows: calculations.sizeRows,
      confirmedRounds,
    })
  }, [
    aiComment,
    bufferStock,
    calculations.sizeRows,
    confirmedRounds,
    currentOrderInboundDueDate,
    baseSubject,
    comparisonTarget,
    dailyMeanClient,
    expectedFeeRatePct,
    forecastMonths,
    orderCoverageDays,
    monthlySalesTrend,
    nextOrderInboundDueDate,
    periodEnd,
    periodStart,
    primary,
    activeStockOrderCalc,
    secondary,
    selectedStart,
    selfWeightPct,
    stockOrderCalculationReady,
    unitCostInput,
    unitPriceInput,
  ])
  const candidateActions: { loading: boolean; listOpen: boolean; stashes: CandidateStashPickerOption[]; selectedCandidate: CandidateStashPickerOption | null; companyScopeBlocked: boolean; companyScopeBlockReason: string; nameInput: string; noteInput: string; setNameInput: React.Dispatch<React.SetStateAction<string>>; setNoteInput: React.Dispatch<React.SetStateAction<string>>; setListOpen: React.Dispatch<React.SetStateAction<boolean>>; createCandidate: () => Promise<boolean>; confirmOrder: () => Promise<boolean>; refresh: () => Promise<CandidateStashSummary[] | null>; openPicker: () => Promise<void>; confirmCandidateItem: () => Promise<boolean>; unconfirmCandidateItem: () => Promise<boolean>; selectCandidate: (row: CandidateStashPickerOption) => void; } = useSecondaryCandidateActions({
    skuGroupKey: primary.skuGroupKey,
    companyUuid,
    periodStart,
    periodEnd,
    forecastMonths,
    hasSavedSnapshot,
    candidateItemContext,
    canBuildSnapshot: snapshotReady,
    snapshotBlockReason: KO.msgStockOrderCalcRequired,
    buildSnapshot,
    showToast,
  })
  const handleConfirmQtyChange: (size: string, next: number, recommendedQty: number) => void = useCallback((size: string, next: number, recommendedQty: number) : void => {
    setConfirmBySize((prev: Record<string, number>) : Record<string, number> => new SecondaryOrderDraft({
      mode: useSnapshotConfirmBaseline ? 'snapshot' : 'live',
      manualConfirmBySize: prev,
      snapshotConfirmBySize,
    }).nextManualConfirmBySize(size, next, recommendedQty))
  }, [setConfirmBySize, snapshotConfirmBySize, useSnapshotConfirmBaseline])

  return {
    selectedStart,
    selectedEnd,
    snapshotReady,
    ...requests,
    dailyTrend: {
      ...requests.dailyTrend,
      selectedSizeId: selectedDailyTrendSizeId,
      onSelectedSizeChange: handleDailyTrendSizeChange,
    },
    ...calculations,
    stockOrderCalc: activeStockOrderCalc,
    stockOrderCalcLoading: activeStockOrderCalcLoading,
    stockOrderCalcError: activeStockOrderCalcError,
    calculationBaseDate: activeCalculationBaseDate,
    inboundSplitSource: activeInboundSplitSource,
    inboundSplitSourceLoading: activeInboundSplitSourceLoading,
    inboundSplitSourceError: activeInboundSplitSourceError,
    stockOrderDisplay,
    stockOrderCalculationReady,
    guardStockOrderCalculation,
    candidateActions,
    buildSnapshot,
    handleConfirmQtyChange,
  }
}
