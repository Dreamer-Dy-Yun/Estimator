import type { CandidateStashSummary, SecondaryStockOrderCalcResult } from '../../../../../api'
import type { ProductSalesInsightColumn, SecondaryDailyTrendPoint } from '../../../../../api/types'
import type { SecondaryStockOrderDisplaySizeRow } from '../../../../../api/types/secondary'
import type { OrderSnapshotStockOrderResult } from '../../../../../snapshot/orderSnapshotTypes'
import type { ApiUnitErrorInfo } from '../../../../../types'
import type { CandidateStashPickerOption } from '../CandidateStashPickerModal'
import type { SecondarySizeOrderDisplayRow } from '../model/secondarySizeOrderRows'
import { useCallback, useEffect, useMemo } from 'react'
import type { ProductComparisonBaseSubjectRef, ProductComparisonTarget } from '../../../../../api'
import type { ToastContextValue } from '../../../../../components/AppToastContext'
import type { ProductPrimarySummary, ProductSecondaryDetail } from '../../../../../types'
import type { OrderSnapshotAiComment, OrderSnapshotDocument } from '../../../../../snapshot/orderSnapshotTypes'
import { KO } from '../../ko'
import type { CandidateItemPanelContext } from '../secondaryDrawerTypes'
import { SecondaryOrderDraft } from '../model/SecondaryOrderDraft'
import { buildSecondaryOrderSnapshot } from '../secondarySnapshot'
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
  leadTimeDays: number
  selfWeightPct: number
  bufferStock: number
  confirmBySize: Record<string, number>
  setConfirmBySize: React.Dispatch<React.SetStateAction<Record<string, number>>>
  unitPriceInput: number
  unitCostInput: number
  expectedFeeRatePct: number
  aiComment: OrderSnapshotAiComment
  hasSavedSnapshot: boolean
  showToast: ToastContextValue['showToast']
}

export function useSecondaryForecastModel(args: Args) : { stockOrderDisplay: { currentStockQtyTotal: number; totalOrderBalanceTotal: number; expectedInboundOrderBalanceTotal: number; sizeRows: SecondaryStockOrderDisplaySizeRow[]; } | null; stockOrderCalculationReady: boolean; guardStockOrderCalculation: () => boolean; candidateActions: { loading: boolean; listOpen: boolean; stashes: CandidateStashPickerOption[]; selectedCandidate: CandidateStashPickerOption | null; companyScopeBlocked: boolean; companyScopeBlockReason: string; nameInput: string; noteInput: string; setNameInput: React.Dispatch<React.SetStateAction<string>>; setNoteInput: React.Dispatch<React.SetStateAction<string>>; setListOpen: React.Dispatch<React.SetStateAction<boolean>>; createCandidate: () => Promise<boolean>; confirmOrder: () => Promise<boolean>; refresh: () => Promise<CandidateStashSummary[] | null>; openPicker: () => Promise<void>; confirmCandidateItem: () => Promise<boolean>; unconfirmCandidateItem: () => Promise<boolean>; selectCandidate: (row: CandidateStashPickerOption) => void; }; buildSnapshot: () => OrderSnapshotDocument; handleConfirmQtyChange: (size: string, next: number, recommendedQty: number) => void; stockOrderDisplayInputs: { trendDailyMean: null; dailyMean: null; sigma: null; } | { trendDailyMean: number; dailyMean: number; sigma: number; }; sizeRows: SecondarySizeOrderDisplayRow[]; manualConfirmDerived: Record<string, true>; dailyTrendSizeOptions: { id: string; label: string; share: number; }[]; dailyTrend: { dailyTrendSeries: SecondaryDailyTrendPoint[]; dailyTrendLoading: boolean; dailyTrendError: ApiUnitErrorInfo | null; dailyPeriodShade: { x1: number; x2: number; }; dailyForecastShade: { x1: number; x2: number; } | null; dailyTickIndices: number[]; }; forecastCalc: SecondaryStockOrderCalcResult | null; forecastCalcError: ApiUnitErrorInfo | null; forecastCalcLoading: boolean; selfCol: ProductSalesInsightColumn | null; compCol: ProductSalesInsightColumn | null; salesInsightError: ApiUnitErrorInfo | null; salesInsightLoading: boolean; selectedStart: string; selectedEnd: string; } {
  const {
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
    comparisonTarget,
    snapshotConfirmBySize,
    useSnapshotConfirmBaseline,
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
  }: Args = args
  const selectedStart: string = selectedStartMonth
  const selectedEnd: string = selectedEndMonth
  const forecastMeanPeriodEnd: string = nextOrderInboundDueDate.slice(0, 7)

  useEffect(() : void => {
    if (prefillFromSnapshot != null) return
    setDailyMeanClient(null)
  }, [primary.skuGroupKey, periodEnd, periodStart, prefillFromSnapshot, setDailyMeanClient])

  const requests: { dailyTrend: { dailyTrendSeries: SecondaryDailyTrendPoint[]; dailyTrendLoading: boolean; dailyTrendError: ApiUnitErrorInfo | null; dailyPeriodShade: { x1: number; x2: number; }; dailyForecastShade: { x1: number; x2: number; } | null; dailyTickIndices: number[]; }; forecastCalc: SecondaryStockOrderCalcResult | null; forecastCalcError: ApiUnitErrorInfo | null; forecastCalcLoading: boolean; selfCol: ProductSalesInsightColumn | null; compCol: ProductSalesInsightColumn | null; salesInsightError: ApiUnitErrorInfo | null; salesInsightLoading: boolean; } = useSecondaryDrawerRequests({
    pageName,
    primary,
    comparisonTarget,
    periodStart,
    periodEnd,
    selectedStartMonth,
    selectedEndMonth,
    baseSubject,
    forecastMeanPeriodEnd,
    leadTimeDays,
    dailyMeanClient,
  })
  const snapshotStockOrderResult: OrderSnapshotStockOrderResult | null = useSnapshotConfirmBaseline ? prefillFromSnapshot?.drawer2.stockOrderResult ?? null : null
  const activeForecastCalc: SecondaryStockOrderCalcResult | null = useSnapshotConfirmBaseline ? snapshotStockOrderResult : requests.forecastCalc
  const salesInsightReady: boolean =
    requests.selfCol != null &&
    requests.compCol != null &&
    !requests.salesInsightLoading &&
    requests.salesInsightError == null
  const stockOrderCalculationReady: boolean = activeForecastCalc != null && (snapshotStockOrderResult != null || (!requests.forecastCalcLoading && salesInsightReady))
  const guardStockOrderCalculation: () => boolean = useCallback(() : boolean => {
    if (stockOrderCalculationReady) return true
    showToast(KO.msgStockOrderCalcRequired, { variant: 'error' })
    return false
  }, [showToast, stockOrderCalculationReady])
  const stockOrderDisplayKey: string = useMemo(() : string => {
    const d: { currentStockQtyTotal: number; totalOrderBalanceTotal: number; expectedInboundOrderBalanceTotal: number; sizeRows: SecondaryStockOrderDisplaySizeRow[]; } | undefined = activeForecastCalc?.display
    if (!d) return ''
    return [
      d.currentStockQtyTotal,
      d.totalOrderBalanceTotal,
      d.expectedInboundOrderBalanceTotal,
      ...d.sizeRows.map((row: SecondaryStockOrderDisplaySizeRow) : string => `${row.size}:${row.currentStockQty}:${row.totalOrderBalance}:${row.expectedInboundOrderBalance}`),
    ].join('|')
  }, [activeForecastCalc])

  useEffect(() : void => {
    if (useSnapshotConfirmBaseline) return
    setConfirmBySize({})
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
    setConfirmBySize,
  ])

  const calculations: { stockOrderCalculationReady: boolean; stockOrderDisplayInputs: { trendDailyMean: null; dailyMean: null; sigma: null; } | { trendDailyMean: number; dailyMean: number; sigma: number; }; sizeRows: SecondarySizeOrderDisplayRow[]; manualConfirmDerived: Record<string, true>; dailyTrendSizeOptions: { id: string; label: string; share: number; }[]; } = useSecondaryOrderCalculations({
    secondary,
    forecastSalesHorizonDays: leadTimeDays,
    dailyMeanClient,
    forecastCalc: activeForecastCalc,
    stockOrderCalculationReady,
    selfWeightPct,
    bufferStock,
    confirmBySize,
    snapshotConfirmBySize,
    useSnapshotConfirmBaseline,
    snapshotSizeOrders: snapshotStockOrderResult == null ? null : prefillFromSnapshot?.drawer2.sizeOrders ?? null,
  })
  const stockOrderDisplay: { currentStockQtyTotal: number; totalOrderBalanceTotal: number; expectedInboundOrderBalanceTotal: number; sizeRows: SecondaryStockOrderDisplaySizeRow[]; } | null = stockOrderCalculationReady ? activeForecastCalc?.display ?? null : null

  const buildSnapshot: () => OrderSnapshotDocument = useCallback((): OrderSnapshotDocument => buildSecondaryOrderSnapshot({
    primary,
    secondary,
    periodStart,
    periodEnd,
    forecastMonths,
    baseSubject,
    comparisonSubject: comparisonTarget,
    selectedStart,
    leadTimeDays,
    stockOrderRequest: {
      currentOrderInboundDueDate,
      nextOrderInboundDueDate,
      leadTimeDays,
      ...(dailyMeanClient == null ? {} : { dailyMeanOverride: dailyMeanClient }),
    },
    stockOrderResult: stockOrderCalculationReady ? activeForecastCalc : null,
    selfWeightPct,
    bufferStock,
    aiComment,
    unitPrice: unitPriceInput,
    unitCost: unitCostInput,
    expectedFeeRatePct,
    sizeRows: calculations.sizeRows,
  }), [
    aiComment,
    bufferStock,
    calculations.sizeRows,
    currentOrderInboundDueDate,
    baseSubject,
    comparisonTarget,
    dailyMeanClient,
    expectedFeeRatePct,
    forecastMonths,
    leadTimeDays,
    nextOrderInboundDueDate,
    periodEnd,
    periodStart,
    primary,
    activeForecastCalc,
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
    canBuildSnapshot: stockOrderCalculationReady,
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
    ...requests,
    ...calculations,
    stockOrderDisplay,
    stockOrderCalculationReady,
    guardStockOrderCalculation,
    candidateActions,
    buildSnapshot,
    handleConfirmQtyChange,
  }
}
