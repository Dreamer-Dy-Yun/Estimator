import { useCallback } from 'react'
import type { SecondaryCompetitorChannel } from '../../../../../api'
import type { ApiUnitErrorInfo, ProductPrimarySummary } from '../../../../../types'
import { useSecondaryDailyTrend } from './useSecondaryDailyTrend'
import { useSecondarySalesInsight } from './useSecondarySalesInsight'
import { useSecondaryStockOrderCalc } from './useSecondaryStockOrderCalc'

type Args = {
  pageName: string
  primary: ProductPrimarySummary
  channel: SecondaryCompetitorChannel
  selectedStart: string
  selectedEnd: string
  companyUuid?: string
  forecastMeanPeriodEnd: string
  leadTimeDays: number
  dailyMeanClient: number | null
}

export function useSecondaryDrawerRequests({
  pageName,
  primary,
  channel,
  selectedStart,
  selectedEnd,
  companyUuid,
  forecastMeanPeriodEnd,
  leadTimeDays,
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
    leadTimeDays,
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
