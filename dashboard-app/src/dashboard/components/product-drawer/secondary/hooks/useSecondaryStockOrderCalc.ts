import { useEffect, useMemo, useState } from 'react'
import { dashboardApi } from '../../../../../api'
import type { SecondaryStockOrderCalcResult } from '../../../../../api/types'
import type { ApiUnitErrorInfo } from '../../../../../types'

const STOCK_ORDER_CALC_DEBOUNCE_MS = 1000

type Params = {
  skuGroupKey: string
  selectedStart: string
  selectedEnd: string
  companyUuid?: string
  forecastMeanPeriodEnd: string
  leadTimeDays: number
  dailyMeanClient: number | null
  makeApiErrorInfo: (request: string, err: unknown) => ApiUnitErrorInfo
}

type ForecastCalcState = {
  requestKey: string
  result: SecondaryStockOrderCalcResult
}

export function useSecondaryStockOrderCalc({
  skuGroupKey,
  selectedStart,
  selectedEnd,
  companyUuid,
  forecastMeanPeriodEnd,
  leadTimeDays,
  dailyMeanClient,
  makeApiErrorInfo,
}: Params) {
  const requestKey = useMemo(() => JSON.stringify({
    skuGroupKey,
    companyUuid: companyUuid ?? '',
    selectedStart,
    selectedEnd,
    forecastMeanPeriodEnd,
    leadTimeDays,
    dailyMeanClient,
  }), [
    companyUuid,
    dailyMeanClient,
    forecastMeanPeriodEnd,
    leadTimeDays,
    selectedEnd,
    selectedStart,
    skuGroupKey,
  ])
  const [forecastCalcState, setForecastCalcState] = useState<ForecastCalcState | null>(null)
  const [forecastCalcError, setForecastCalcError] = useState<ApiUnitErrorInfo | null>(null)
  const [forecastCalcLoading, setForecastCalcLoading] = useState(true)
  const forecastCalc = forecastCalcState?.requestKey === requestKey ? forecastCalcState.result : null

  useEffect(() => {
    let alive = true
    let timerId: ReturnType<typeof window.setTimeout> | null = null
    setForecastCalcLoading(true)
    setForecastCalcError(null)
    timerId = window.setTimeout(() => {
      void (async () => {
        try {
          const params = {
            skuGroupKey,
            companyUuid,
            periodStart: selectedStart,
            periodEnd: selectedEnd,
            forecastPeriodEnd: forecastMeanPeriodEnd,
            leadTimeDays,
            ...(dailyMeanClient != null ? { dailyMean: dailyMeanClient } : {}),
          }
          const result = await dashboardApi.getSecondaryStockOrderCalc(params)
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
                companyUuid,
                periodStart: selectedStart,
                periodEnd: selectedEnd,
                forecastPeriodEnd: forecastMeanPeriodEnd,
                leadTimeDays,
              })})`,
              err,
            ),
          )
        } finally {
          if (alive) setForecastCalcLoading(false)
        }
      })()
    }, STOCK_ORDER_CALC_DEBOUNCE_MS)
    return () => {
      alive = false
      if (timerId != null) window.clearTimeout(timerId)
    }
  }, [
    dailyMeanClient,
    companyUuid,
    forecastMeanPeriodEnd,
    leadTimeDays,
    makeApiErrorInfo,
    requestKey,
    skuGroupKey,
    selectedEnd,
    selectedStart,
  ])

  return { forecastCalc, forecastCalcError, forecastCalcLoading }
}
