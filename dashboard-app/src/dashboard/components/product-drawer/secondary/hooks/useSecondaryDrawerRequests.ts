import type { SecondaryStockOrderCalcResult } from '../../../../../api'
import type { ProductSalesInsightColumn, SecondaryDailyTrendPoint, SecondaryInboundSplitSource, SecondaryProductIdentity } from '../../../../../api/types'
import { useCallback, useMemo } from 'react'
import type { ProductComparisonBaseSubjectRef, ProductComparisonTarget } from '../../../../../api'
import type { ApiUnitErrorInfo, ProductPrimarySummary } from '../../../../../types'
import { useSecondaryDailyTrend } from './useSecondaryDailyTrend'
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
  dailyTrendSize: string | null
  baseSubject: ProductComparisonBaseSubjectRef
  forecastPeriodEndMonth: string
  orderCoverageDays: number
  selfWeightPct: number
  dailyMeanClient: number | null
  currentOrderInboundDueDate: string
  nextOrderInboundDueDate: string
}

function getLocalTodayIsoDate(): string {
  const now: Date = new Date()
  const year: number = now.getFullYear()
  const month: string = String(now.getMonth() + 1).padStart(2, '0')
  const day: string = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getSecondaryProductIdentity(primary: ProductPrimarySummary): SecondaryProductIdentity {
  return {
    productUuid: primary.productUuid ?? null,
    skuGroupKey: primary.skuGroupKey,
    brand: primary.brand,
    code: primary.code,
    colorCode: primary.colorCode,
  }
}

export function useSecondaryDrawerRequests({
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
}: Args) : { dailyTrend: { dailyTrendSeries: SecondaryDailyTrendPoint[]; dailyTrendLoading: boolean; dailyTrendError: ApiUnitErrorInfo | null; dailyPeriodShade: { x1: number; x2: number; }; dailyForecastShade: { x1: number; x2: number; } | null; dailyTickIndices: number[]; }; inboundSplitSource: SecondaryInboundSplitSource | null; inboundSplitSourceLoading: boolean; inboundSplitSourceError: ApiUnitErrorInfo | null; stockOrderCalc: SecondaryStockOrderCalcResult | null; stockOrderCalcError: ApiUnitErrorInfo | null; stockOrderCalcLoading: boolean; selfCol: ProductSalesInsightColumn | null; compCol: ProductSalesInsightColumn | null; salesInsightError: ApiUnitErrorInfo | null; salesInsightLoading: boolean; } {
  const calculationBaseDate: string = getLocalTodayIsoDate()
  const productIdentity: SecondaryProductIdentity = useMemo(
    (): SecondaryProductIdentity => getSecondaryProductIdentity(primary),
    [primary],
  )
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
  const stockOrder: { stockOrderCalc: SecondaryStockOrderCalcResult | null; stockOrderCalcError: ApiUnitErrorInfo | null; stockOrderCalcLoading: boolean; } = useSecondaryStockOrderCalc({
    skuGroupKey: primary.skuGroupKey,
    productIdentity,
    periodStart,
    periodEnd,
    baseSubject,
    comparisonSubject: comparisonTarget,
    calculationBaseDate,
    currentOrderInboundDueDate,
    nextOrderInboundDueDate,
    forecastPeriodEndMonth,
    orderCoverageDays,
    selfWeightPct,
    dailyMeanClient,
    makeApiErrorInfo,
  })
  const dailyTrend: { dailyTrendSeries: SecondaryDailyTrendPoint[]; dailyTrendLoading: boolean; dailyTrendError: ApiUnitErrorInfo | null; dailyPeriodShade: { x1: number; x2: number; }; dailyForecastShade: { x1: number; x2: number; } | null; dailyTickIndices: number[]; } = useSecondaryDailyTrend({
    skuGroupKey: primary.skuGroupKey,
    selectedStart: selectedStartMonth,
    selectedEnd: selectedEndMonth,
    size: dailyTrendSize,
    baseSubject,
    comparisonTarget,
    orderCoverageDays,
    makeApiErrorInfo,
  })
  const inboundSplitSource: { inboundSplitSource: SecondaryInboundSplitSource | null; inboundSplitSourceLoading: boolean; inboundSplitSourceError: ApiUnitErrorInfo | null; } = {
    inboundSplitSource: stockOrder.stockOrderCalc?.inboundSplitSource ?? null,
    inboundSplitSourceLoading: stockOrder.stockOrderCalcLoading,
    inboundSplitSourceError: stockOrder.stockOrderCalcError,
  }

  return {
    ...salesInsight,
    ...stockOrder,
    ...inboundSplitSource,
    dailyTrend,
  }
}
