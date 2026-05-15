import { useCallback, useEffect, useMemo } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import type { SecondaryCompetitorChannel } from '../../../../../api'
import type { ProductPrimarySummary, ProductSecondaryDetail } from '../../../../../types'
import type { OrderSnapshotDocumentV1 } from '../../../../../snapshot/orderSnapshotTypes'
import { normalizeMonthKey } from '../../../trend/trendRangeUtils'
import type { CandidateItemPanelContext } from '../candidateActionCards'
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
  prefillFromSnapshot: OrderSnapshotDocumentV1 | null
  candidateItemContext: CandidateItemPanelContext | null
  channel: SecondaryCompetitorChannel
  viewPeriodStart: string
  viewPeriodEnd: string
  snapshotConfirmBySize: Record<string, number>
  useSnapshotConfirmBaseline: boolean
  dailyMeanClient: number | null
  setDailyMeanClient: (value: number | null) => void
  leadTimeStartDate: string
  leadTimeEndDate: string
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
  safetyStockMode: 'manual' | 'formula'
  manualSafetyStock: number
  serviceLevelPct: number
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
    prefillFromSnapshot,
    candidateItemContext,
    channel,
    viewPeriodStart,
    viewPeriodEnd,
    snapshotConfirmBySize,
    useSnapshotConfirmBaseline,
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
    safetyStockMode,
    manualSafetyStock,
    serviceLevelPct,
    hasSavedSnapshot,
    showToast,
  } = args
  const selectedStart = normalizeMonthKey(viewPeriodStart)
  const selectedEnd = normalizeMonthKey(viewPeriodEnd)
  const forecastMeanPeriodEnd = leadTimeEndDate.slice(0, 7)
  const forecastSalesHorizonDays = leadTimeDays

  useEffect(() => {
    if (prefillFromSnapshot != null) return
    let alive = true
    queueMicrotask(() => {
      if (alive) setDailyMeanClient(null)
    })
    return () => {
      alive = false
    }
  }, [primary.skuGroupKey, selectedEnd, selectedStart, prefillFromSnapshot, setDailyMeanClient])

  const requests = useSecondaryDrawerRequests({
    pageName,
    primary,
    secondary,
    channel,
    selectedStart,
    selectedEnd,
    forecastMeanPeriodEnd,
    serviceLevelPct,
    leadTimeDays,
    safetyStockMode,
    manualSafetyStock,
    dailyMeanClient,
  })
  const stockDisplayKey = useMemo(() => {
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
    let alive = true
    queueMicrotask(() => {
      if (alive) setConfirmBySize({})
    })
    return () => {
      alive = false
    }
  }, [primary.skuGroupKey, prefillFromSnapshot, setConfirmBySize, useSnapshotConfirmBaseline])

  useEffect(() => {
    if (useSnapshotConfirmBaseline) return
    let alive = true
    queueMicrotask(() => {
      if (alive) setConfirmBySize({})
    })
    return () => {
      alive = false
    }
  }, [
    useSnapshotConfirmBaseline,
    bufferStock,
    dailyMeanClient,
    leadTimeEndDate,
    leadTimeStartDate,
    manualSafetyStock,
    safetyStockMode,
    selectedEnd,
    selectedStart,
    selfWeightPct,
    serviceLevelPct,
    stockDisplayKey,
    setConfirmBySize,
  ])

  const calculations = useSecondaryOrderCalculations({
    primary,
    secondary,
    selectedStart,
    selectedEnd,
    forecastMeanPeriodEnd,
    leadTimeStartDate,
    leadTimeEndDate,
    leadTimeDays,
    forecastSalesHorizonDays,
    serviceLevelPct,
    safetyStockMode,
    manualSafetyStock,
    dailyMeanClient,
    forecastCalc: requests.forecastCalc,
    selfWeightPct,
    bufferStock,
    confirmBySize,
    snapshotConfirmBySize,
    useSnapshotConfirmBaseline,
  })
  const stockDisplay = requests.forecastCalc?.display ?? null

  const buildSnapshot = useCallback((): OrderSnapshotDocumentV1 => buildSecondaryOrderSnapshot({
    primary,
    secondary,
    periodStart: viewPeriodStart,
    periodEnd: viewPeriodEnd,
    forecastMonths,
    selectedStart,
    leadTimeDays,
    competitorChannelId: channel.id,
    competitorChannelLabel: channel.label,
    selfCol: requests.selfCol,
    compCol: requests.compCol,
    forecastInputs: calculations.forecastInputs,
    forecastDerived: calculations.forecastDerived,
    stockDisplay: requests.forecastCalc?.display ?? null,
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
    calculations.forecastDerived,
    calculations.forecastInputs,
    calculations.sizeRows,
    channel.id,
    channel.label,
    expectedFeeRatePct,
    forecastMonths,
    leadTimeDays,
    primary,
    requests.compCol,
    requests.forecastCalc?.display,
    requests.selfCol,
    secondary,
    selectedStart,
    selfWeightPct,
    unitCostInput,
    unitPriceInput,
    viewPeriodEnd,
    viewPeriodStart,
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
    stockDisplay,
    candidateActions,
    buildSnapshot,
    handleConfirmQtyChange,
  }
}
