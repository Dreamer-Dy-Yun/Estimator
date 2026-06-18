import { useEffect, useMemo, useState } from 'react'
import { dashboardApi } from '../../../../../api'
import type { ProductComparisonBaseSubjectRef, SecondaryStockOrderCalcResult } from '../../../../../api/types'
import type { ApiUnitErrorInfo } from '../../../../../types'

const STOCK_ORDER_CALC_DEBOUNCE_MS = 1000 as const

export type Params = {
  skuGroupKey: string
  periodStart: string
  periodEnd: string
  baseSubject: ProductComparisonBaseSubjectRef
  forecastPeriodEndMonth: string
  orderCoverageDays: number
  dailyMeanClient: number | null
  makeApiErrorInfo: (request: string, err: unknown) => ApiUnitErrorInfo
}

export type ForecastCalcState = {
  requestKey: string
  result: SecondaryStockOrderCalcResult
}

export function useSecondaryStockOrderCalc({
  skuGroupKey,
  periodStart,
  periodEnd,
  baseSubject,
  forecastPeriodEndMonth,
  orderCoverageDays,
  dailyMeanClient,
  makeApiErrorInfo,
}: Params) : { forecastCalc: SecondaryStockOrderCalcResult | null; forecastCalcError: ApiUnitErrorInfo | null; forecastCalcLoading: boolean; } {
  const requestKey: string = useMemo(() : string => JSON.stringify({
    skuGroupKey,
    base: baseSubject,
    periodStart,
    periodEnd,
    forecastPeriodEndMonth,
    orderCoverageDays,
    dailyMeanClient,
  }), [
    baseSubject,
    dailyMeanClient,
    forecastPeriodEndMonth,
    orderCoverageDays,
    periodEnd,
    periodStart,
    skuGroupKey,
  ])
  const [forecastCalcState, setForecastCalcState]: [ForecastCalcState | null, React.Dispatch<React.SetStateAction<ForecastCalcState | null>>] = useState<ForecastCalcState | null>(null)
  const [forecastCalcError, setForecastCalcError]: [ApiUnitErrorInfo | null, React.Dispatch<React.SetStateAction<ApiUnitErrorInfo | null>>] = useState<ApiUnitErrorInfo | null>(null)
  const [forecastCalcLoading, setForecastCalcLoading]: [boolean, React.Dispatch<React.SetStateAction<boolean>>] = useState(true)
  const forecastCalc: SecondaryStockOrderCalcResult | null = forecastCalcState?.requestKey === requestKey ? forecastCalcState.result : null

  useEffect(() : () => void => {
    let alive: boolean = true
    let timerId: ReturnType<typeof window.setTimeout> | null = null
    queueMicrotask(() : void => {
      if (!alive) return
      setForecastCalcLoading(true)
      setForecastCalcError(null)
    })
    timerId = window.setTimeout(() : void => {
      void (async () : Promise<void> => {
        try {
          const params: { dailyMean?: number | undefined; skuGroupKey: string; base: ProductComparisonBaseSubjectRef; periodStart: string; periodEnd: string; forecastPeriodEndMonth: string; orderCoverageDays: number; } = {
            skuGroupKey,
            base: baseSubject,
            periodStart,
            periodEnd,
            forecastPeriodEndMonth: forecastPeriodEndMonth,
            orderCoverageDays,
            ...(dailyMeanClient != null ? { dailyMean: dailyMeanClient } : {}),
          }
          const result: SecondaryStockOrderCalcResult = await dashboardApi.getSecondaryStockOrderCalc(params)
          if (!alive) return
          setForecastCalcState({ requestKey, result })
          setForecastCalcError(null)
        } catch (err) {
          if (!alive) return
          setForecastCalcState(null)
          setForecastCalcError(
            makeApiErrorInfo(
              `getSecondaryStockOrderCalc(${JSON.stringify({
                skuGroupKey,
                base: baseSubject,
                periodStart,
                periodEnd,
                forecastPeriodEndMonth: forecastPeriodEndMonth,
                orderCoverageDays,
                ...(dailyMeanClient != null ? { dailyMean: dailyMeanClient } : {}),
              })})`,
              err,
            ),
          )
        } finally {
          if (alive) setForecastCalcLoading(false)
        }
      })()
    }, STOCK_ORDER_CALC_DEBOUNCE_MS)
    return () : void => {
      alive = false
      if (timerId != null) window.clearTimeout(timerId)
    }
  }, [
    dailyMeanClient,
    baseSubject,
    forecastPeriodEndMonth,
    orderCoverageDays,
    makeApiErrorInfo,
    requestKey,
    skuGroupKey,
    periodEnd,
    periodStart,
  ])

  return { forecastCalc, forecastCalcError, forecastCalcLoading }
}
