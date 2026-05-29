import { useCallback, useEffect, useMemo } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import type { SecondaryCompetitorChannel } from '../../../../../api'
import type { ToastContextValue } from '../../../../../components/AppToastContext'
import type { ProductPrimarySummary, ProductSecondaryDetail } from '../../../../../types'
import type { OrderSnapshotAiCommentV2, OrderSnapshotDocumentV2 } from '../../../../../snapshot/orderSnapshotTypes'
import { KO } from '../../ko'
import type { CandidateItemPanelContext } from '../secondaryDrawerTypes'
import { SecondaryOrderDraft } from '../model/SecondaryOrderDraft'
import { buildSecondaryOrderSnapshot } from '../secondarySnapshot'
import { useSecondaryCandidateActions } from './useSecondaryCandidateActions'
import { useSecondaryDrawerRequests } from './useSecondaryDrawerRequests'
import { useSecondaryOrderCalculations } from './useSecondaryOrderCalculations'

type Args = {
  primary: ProductPrimarySummary
  secondary: ProductSecondaryDetail
  pageName: string
  periodStart: string
  periodEnd: string
  selectedStartMonth: string
  selectedEndMonth: string
  forecastMonths: number
  companyUuid?: string
  prefillFromSnapshot: OrderSnapshotDocumentV2 | null
  candidateItemContext: CandidateItemPanelContext | null
  channel: SecondaryCompetitorChannel
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
  setConfirmBySize: Dispatch<SetStateAction<Record<string, number>>>
  unitPriceInput: number
  unitCostInput: number
  expectedFeeRatePct: number
  aiComment: OrderSnapshotAiCommentV2
  hasSavedSnapshot: boolean
  showToast: ToastContextValue['showToast']
}

export function useSecondaryForecastModel(args: Args) {
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
    prefillFromSnapshot,
    candidateItemContext,
    channel,
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
  } = args
  const selectedStart = selectedStartMonth
  const selectedEnd = selectedEndMonth
  const forecastMeanPeriodEnd = nextOrderInboundDueDate.slice(0, 7)

  useEffect(() => {
    if (prefillFromSnapshot != null) return
    setDailyMeanClient(null)
  }, [primary.skuGroupKey, periodEnd, periodStart, prefillFromSnapshot, setDailyMeanClient])

  const requests = useSecondaryDrawerRequests({
    pageName,
    primary,
    channel,
    periodStart,
    periodEnd,
    selectedStartMonth,
    selectedEndMonth,
    companyUuid,
    forecastMeanPeriodEnd,
    leadTimeDays,
    dailyMeanClient,
  })
  const snapshotStockOrderResult = useSnapshotConfirmBaseline ? prefillFromSnapshot?.drawer2.stockOrderResult ?? null : null
  const activeForecastCalc = useSnapshotConfirmBaseline ? snapshotStockOrderResult : requests.forecastCalc
  const salesInsightReady = requests.selfCol != null && requests.compCol != null
  const stockOrderCalculationReady = activeForecastCalc != null && (snapshotStockOrderResult != null || (!requests.forecastCalcLoading && salesInsightReady))
  const guardStockOrderCalculation = useCallback(() => {
    if (stockOrderCalculationReady) return true
    showToast(salesInsightReady ? KO.msgStockOrderCalcRequired : KO.msgSalesInsightRequired, { variant: 'error' })
    return false
  }, [salesInsightReady, showToast, stockOrderCalculationReady])
  const stockOrderDisplayKey = useMemo(() => {
    const d = activeForecastCalc?.display
    if (!d) return ''
    return [
      d.currentStockQtyTotal,
      d.totalOrderBalanceTotal,
      d.expectedInboundOrderBalanceTotal,
      ...d.sizeRows.map((row) => `${row.size}:${row.currentStockQty}:${row.totalOrderBalance}:${row.expectedInboundOrderBalance}`),
    ].join('|')
  }, [activeForecastCalc])

  useEffect(() => {
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

  const calculations = useSecondaryOrderCalculations({
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
  const stockOrderDisplay = stockOrderCalculationReady ? activeForecastCalc?.display ?? null : null

  const buildSnapshot = useCallback((): OrderSnapshotDocumentV2 => buildSecondaryOrderSnapshot({
    primary,
    secondary,
    periodStart,
    periodEnd,
    forecastMonths,
    companyUuid,
    selectedStart,
    leadTimeDays,
    competitorChannelId: channel.id,
    competitorChannelLabel: channel.label,
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
    channel.id,
    channel.label,
    currentOrderInboundDueDate,
    companyUuid,
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
  const candidateActions = useSecondaryCandidateActions({
    skuGroupKey: primary.skuGroupKey,
    companyUuid,
    periodStart,
    periodEnd,
    forecastMonths,
    hasSavedSnapshot,
    candidateItemContext,
    canBuildSnapshot: stockOrderCalculationReady,
    snapshotBlockReason: salesInsightReady ? KO.msgStockOrderCalcRequired : KO.msgSalesInsightRequired,
    buildSnapshot,
    showToast,
  })
  const handleConfirmQtyChange = useCallback((size: string, next: number, recommendedQty: number) => {
    setConfirmBySize((prev) => new SecondaryOrderDraft({
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
