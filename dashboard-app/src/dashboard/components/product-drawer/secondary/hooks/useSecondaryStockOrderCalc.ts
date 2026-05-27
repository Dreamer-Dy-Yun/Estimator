import { useEffect, useState } from 'react'
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
  const [forecastCalc, setForecastCalc] = useState<SecondaryStockOrderCalcResult | null>(null)
  const [forecastCalcError, setForecastCalcError] = useState<ApiUnitErrorInfo | null>(null)
  const [forecastCalcLoading, setForecastCalcLoading] = useState(true)

  useEffect(() => {
    let alive = true
    let timerId: ReturnType<typeof window.setTimeout> | null = null
    queueMicrotask(() => {
      if (alive) setForecastCalcLoading(true)
    })
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
          setForecastCalc(result)
          setForecastCalcError(null)
        } catch (err) {
          if (!alive) return
          setForecastCalc(null)
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
    skuGroupKey,
    selectedEnd,
    selectedStart,
  ])

  return { forecastCalc, forecastCalcError, forecastCalcLoading }
}
