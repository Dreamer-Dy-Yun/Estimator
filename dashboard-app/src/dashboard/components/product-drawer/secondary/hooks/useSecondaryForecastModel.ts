import { useCallback, useEffect, useMemo } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import type { SecondaryCompetitorChannel } from '../../../../../api'
import type { ProductPrimarySummary, ProductSecondaryDetail } from '../../../../../types'
import type { OrderSnapshotDocumentV2 } from '../../../../../snapshot/orderSnapshotTypes'
import { normalizeMonthKey } from '../../../trend/trendRangeUtils'
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
  aiPrompt: string
  aiComment: string
  hasSavedSnapshot: boolean
  showToast: (message: string) => void
}

export function useSecondaryForecastModel(args: Args) {
  const {
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
    aiPrompt,
    aiComment,
    hasSavedSnapshot,
    showToast,
  } = args
  const selectedStart = normalizeMonthKey(periodStart)
  const selectedEnd = normalizeMonthKey(periodEnd)
  const forecastMeanPeriodEnd = nextOrderInboundDueDate.slice(0, 7)

  useEffect(() => {
    if (prefillFromSnapshot != null) return
    setDailyMeanClient(null)
  }, [primary.skuGroupKey, selectedEnd, selectedStart, prefillFromSnapshot, setDailyMeanClient])

  const requests = useSecondaryDrawerRequests({
    pageName,
    primary,
    secondary,
    channel,
    selectedStart,
    selectedEnd,
    companyUuid,
    forecastMeanPeriodEnd,
    leadTimeDays,
    dailyMeanClient,
  })
  const stockOrderDisplayKey = useMemo(() => {
    const d = requests.forecastCalc?.display
    if (!d) return ''
    return [
      d.currentStockQtyTotal,
      d.totalOrderBalanceTotal,
      d.expectedInboundOrderBalanceTotal,
      ...d.currentStockQtyBySize,
      ...d.totalOrderBalanceBySize,
      ...d.expectedInboundOrderBalanceBySize,
    ].join('|')
  }, [requests.forecastCalc])

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
    forecastCalc: requests.forecastCalc,
    selfWeightPct,
    bufferStock,
    confirmBySize,
    snapshotConfirmBySize,
    useSnapshotConfirmBaseline,
  })
  const stockOrderDisplay = requests.forecastCalc?.display ?? null

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
    stockOrderResult: requests.forecastCalc,
    selfWeightPct,
    bufferStock,
    aiPrompt,
    aiComment,
    unitPrice: unitPriceInput,
    unitCost: unitCostInput,
    expectedFeeRatePct,
    sizeRows: calculations.sizeRows,
  }), [
    aiComment,
    aiPrompt,
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
    requests.forecastCalc,
    secondary,
    selectedStart,
    selfWeightPct,
    unitCostInput,
    unitPriceInput,
  ])
  const candidateActions = useSecondaryCandidateActions({
    skuGroupKey: primary.skuGroupKey,
    periodStart,
    periodEnd,
    forecastMonths,
    hasSavedSnapshot,
    candidateItemContext,
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
    candidateActions,
    buildSnapshot,
    handleConfirmQtyChange,
  }
}
