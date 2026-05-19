import { useEffect, useState } from 'react'
import { dashboardApi } from '../../../../../api'
import type { ApiUnitErrorInfo } from '../../../../../types'
import type { SecondaryForecastCalc } from '../secondaryDrawerTypes'

const STOCK_ORDER_CALC_DEBOUNCE_MS = 1000

type Params = {
  skuGroupKey: string
  selectedStart: string
  selectedEnd: string
  forecastMeanPeriodEnd: string
  serviceLevelPct: number
  leadTimeDays: number
  safetyStockMode: 'manual' | 'formula'
  manualSafetyStock: number
  dailyMeanClient: number | null
  makeApiErrorInfo: (request: string, err: unknown) => ApiUnitErrorInfo
}

export function useSecondaryStockOrderCalc({
  skuGroupKey,
  selectedStart,
  selectedEnd,
  forecastMeanPeriodEnd,
  serviceLevelPct,
  leadTimeDays,
  safetyStockMode,
  manualSafetyStock,
  dailyMeanClient,
  makeApiErrorInfo,
}: Params) {
  const [forecastCalc, setForecastCalc] = useState<SecondaryForecastCalc | null>(null)
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
          const roundedManualSafetyStock = Math.max(0, Math.round(manualSafetyStock))
          const params = {
            skuGroupKey,
            periodStart: selectedStart,
            periodEnd: selectedEnd,
            forecastPeriodEnd: forecastMeanPeriodEnd,
            serviceLevelPct,
            leadTimeDays,
            safetyStockMode,
            manualSafetyStock: roundedManualSafetyStock,
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
                periodStart: selectedStart,
                periodEnd: selectedEnd,
                forecastPeriodEnd: forecastMeanPeriodEnd,
                serviceLevelPct,
                leadTimeDays,
                safetyStockMode,
                manualSafetyStock,
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
    forecastMeanPeriodEnd,
    leadTimeDays,
    makeApiErrorInfo,
    manualSafetyStock,
    skuGroupKey,
    safetyStockMode,
    selectedEnd,
    selectedStart,
    serviceLevelPct,
  ])

  return { forecastCalc, forecastCalcError, forecastCalcLoading }
}
