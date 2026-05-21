import { useCallback } from 'react'
import type { SecondaryCompetitorChannel } from '../../../../../api'
import type { ApiUnitErrorInfo, ProductPrimarySummary, ProductSecondaryDetail } from '../../../../../types'
import { useSecondaryDailyTrend } from './useSecondaryDailyTrend'
import { useSecondarySalesInsight } from './useSecondarySalesInsight'
import { useSecondaryStockOrderCalc } from './useSecondaryStockOrderCalc'

type Args = {
  pageName: string
  primary: ProductPrimarySummary
  secondary: ProductSecondaryDetail
  channel: SecondaryCompetitorChannel
  selectedStart: string
  selectedEnd: string
  companyUuid?: string
  forecastMeanPeriodEnd: string
  serviceLevelPct: number
  leadTimeDays: number
  safetyStockMode: 'manual' | 'formula'
  manualSafetyStock: number
  dailyMeanClient: number | null
}

export function useSecondaryDrawerRequests({
  pageName,
  primary,
  secondary,
  channel,
  selectedStart,
  selectedEnd,
  companyUuid,
  forecastMeanPeriodEnd,
  serviceLevelPct,
  leadTimeDays,
  safetyStockMode,
  manualSafetyStock,
  dailyMeanClient,
}: Args) {
  const makeApiErrorInfo = useCallback((request: string, err: unknown): ApiUnitErrorInfo => ({
    checkedAt: new Date().toISOString(),
    page: pageName,
    request,
    error: err instanceof Error ? err.message : String(err),
  }), [pageName])

  const salesInsight = useSecondarySalesInsight({
    primary,
    secondary,
    channel,
    selectedStart,
    selectedEnd,
    companyUuid,
    makeApiErrorInfo,
  })
  const stockOrder = useSecondaryStockOrderCalc({
    skuGroupKey: primary.skuGroupKey,
    selectedStart,
    selectedEnd,
    companyUuid,
    forecastMeanPeriodEnd,
    serviceLevelPct,
    leadTimeDays,
    safetyStockMode,
    manualSafetyStock,
    dailyMeanClient,
    makeApiErrorInfo,
  })
  const dailyTrend = useSecondaryDailyTrend({
    skuGroupKey: primary.skuGroupKey,
    selectedStart,
    selectedEnd,
    companyUuid,
    leadTimeDays,
    competitorChannelId: channel.id,
    makeApiErrorInfo,
  })

  return {
    ...salesInsight,
    ...stockOrder,
    dailyTrend,
  }
}
