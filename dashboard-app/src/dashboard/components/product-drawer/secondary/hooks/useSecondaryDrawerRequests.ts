import type { SecondaryStockOrderCalcResult } from '../../../../../api'
import type { ProductSalesInsightColumn, SecondaryDailyTrendPoint } from '../../../../../api/types'
import { useCallback } from 'react'
import type { ProductComparisonBaseSubjectRef, ProductComparisonTarget, SecondaryCompetitorChannel } from '../../../../../api'
import type { ApiUnitErrorInfo, ProductPrimarySummary } from '../../../../../types'
import { useSecondaryDailyTrend } from './useSecondaryDailyTrend'
import { useSecondarySalesInsight } from './useSecondarySalesInsight'
import { useSecondaryStockOrderCalc } from './useSecondaryStockOrderCalc'

export type Args = {
  pageName: string
  primary: ProductPrimarySummary
  channel: SecondaryCompetitorChannel
  comparisonTarget: ProductComparisonTarget | null
  periodStart: string
  periodEnd: string
  selectedStartMonth: string
  selectedEndMonth: string
  companyUuid?: string
  baseSubject: ProductComparisonBaseSubjectRef
  forecastMeanPeriodEnd: string
  leadTimeDays: number
  dailyMeanClient: number | null
}

export function useSecondaryDrawerRequests({
  pageName,
  primary,
  channel,
  comparisonTarget,
  periodStart,
  periodEnd,
  selectedStartMonth,
  selectedEndMonth,
  companyUuid,
  baseSubject,
  forecastMeanPeriodEnd,
  leadTimeDays,
  dailyMeanClient,
}: Args) : { dailyTrend: { dailyTrendSeries: SecondaryDailyTrendPoint[]; dailyTrendLoading: boolean; dailyTrendError: ApiUnitErrorInfo | null; dailyPeriodShade: { x1: number; x2: number; }; dailyForecastShade: { x1: number; x2: number; } | null; dailyTickIndices: number[]; }; forecastCalc: SecondaryStockOrderCalcResult | null; forecastCalcError: ApiUnitErrorInfo | null; forecastCalcLoading: boolean; selfCol: ProductSalesInsightColumn | null; compCol: ProductSalesInsightColumn | null; salesInsightError: ApiUnitErrorInfo | null; salesInsightLoading: boolean; } {
  const makeApiErrorInfo: (request: string, err: unknown) => ApiUnitErrorInfo = useCallback((request: string, err: unknown): ApiUnitErrorInfo => ({
    checkedAt: new Date().toISOString(),
    page: pageName,
    request,
    error: err instanceof Error ? err.message : String(err),
  }), [pageName])

  const salesInsight: { selfCol: ProductSalesInsightColumn | null; compCol: ProductSalesInsightColumn | null; salesInsightError: ApiUnitErrorInfo | null; salesInsightLoading: boolean; } = useSecondarySalesInsight({
    primary,
    comparisonTarget,
    periodStart,
    periodEnd,
    baseSubject,
    makeApiErrorInfo,
  })
  const stockOrder: { forecastCalc: SecondaryStockOrderCalcResult | null; forecastCalcError: ApiUnitErrorInfo | null; forecastCalcLoading: boolean; } = useSecondaryStockOrderCalc({
    skuGroupKey: primary.skuGroupKey,
    periodStart,
    periodEnd,
    companyUuid,
    forecastMeanPeriodEnd,
    leadTimeDays,
    dailyMeanClient,
    makeApiErrorInfo,
  })
  const dailyTrend: { dailyTrendSeries: SecondaryDailyTrendPoint[]; dailyTrendLoading: boolean; dailyTrendError: ApiUnitErrorInfo | null; dailyPeriodShade: { x1: number; x2: number; }; dailyForecastShade: { x1: number; x2: number; } | null; dailyTickIndices: number[]; } = useSecondaryDailyTrend({
    skuGroupKey: primary.skuGroupKey,
    selectedStart: selectedStartMonth,
    selectedEnd: selectedEndMonth,
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
