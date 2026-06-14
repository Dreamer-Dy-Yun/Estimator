import type { SecondaryStockOrderCalcResult } from '../../../../../api'
import type { ProductSalesInsightColumn, SecondaryDailyTrendPoint, SecondaryInboundSplitSource } from '../../../../../api/types'
import { useCallback } from 'react'
import type { ProductComparisonBaseSubjectRef, ProductComparisonTarget } from '../../../../../api'
import type { ApiUnitErrorInfo, ProductPrimarySummary } from '../../../../../types'
import { useSecondaryDailyTrend } from './useSecondaryDailyTrend'
import { useSecondaryInboundSplitSource } from './useSecondaryInboundSplitSource'
import { useSecondarySalesInsight } from './useSecondarySalesInsight'
import { useSecondaryStockOrderCalc } from './useSecondaryStockOrderCalc'

export type Args = {
  pageName: string
  primary: ProductPrimarySummary
  comparisonTarget: ProductComparisonTarget
  periodStart: string
  periodEnd: string
  selectedStartMonth: string
  selectedEndMonth: string
  baseSubject: ProductComparisonBaseSubjectRef
  forecastMeanPeriodEnd: string
  leadTimeDays: number
  dailyMeanClient: number | null
  currentOrderInboundDueDate: string
  nextOrderInboundDueDate: string
}

export function useSecondaryDrawerRequests({
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
  currentOrderInboundDueDate,
  nextOrderInboundDueDate,
}: Args) : { dailyTrend: { dailyTrendSeries: SecondaryDailyTrendPoint[]; dailyTrendLoading: boolean; dailyTrendError: ApiUnitErrorInfo | null; dailyPeriodShade: { x1: number; x2: number; }; dailyForecastShade: { x1: number; x2: number; } | null; dailyTickIndices: number[]; }; inboundSplitSource: SecondaryInboundSplitSource | null; inboundSplitSourceLoading: boolean; inboundSplitSourceError: ApiUnitErrorInfo | null; forecastCalc: SecondaryStockOrderCalcResult | null; forecastCalcError: ApiUnitErrorInfo | null; forecastCalcLoading: boolean; selfCol: ProductSalesInsightColumn | null; compCol: ProductSalesInsightColumn | null; salesInsightError: ApiUnitErrorInfo | null; salesInsightLoading: boolean; } {
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
    baseSubject,
    forecastMeanPeriodEnd,
    leadTimeDays,
    dailyMeanClient,
    makeApiErrorInfo,
  })
  const dailyTrend: { dailyTrendSeries: SecondaryDailyTrendPoint[]; dailyTrendLoading: boolean; dailyTrendError: ApiUnitErrorInfo | null; dailyPeriodShade: { x1: number; x2: number; }; dailyForecastShade: { x1: number; x2: number; } | null; dailyTickIndices: number[]; } = useSecondaryDailyTrend({
    skuGroupKey: primary.skuGroupKey,
    selectedStart: selectedStartMonth,
    selectedEnd: selectedEndMonth,
    baseSubject,
    comparisonTarget,
    leadTimeDays,
    makeApiErrorInfo,
  })
  const inboundSplitSource: { inboundSplitSource: SecondaryInboundSplitSource | null; inboundSplitSourceLoading: boolean; inboundSplitSourceError: ApiUnitErrorInfo | null; } = useSecondaryInboundSplitSource({
    skuGroupKey: primary.skuGroupKey,
    dateStart: currentOrderInboundDueDate,
    dateEnd: nextOrderInboundDueDate,
    baseSubject,
    makeApiErrorInfo,
  })

  return {
    ...salesInsight,
    ...stockOrder,
    ...inboundSplitSource,
    dailyTrend,
  }
}
