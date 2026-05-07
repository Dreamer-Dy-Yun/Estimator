import { useEffect, useState } from 'react'
import { dashboardApi } from '../../../../../api'
import type { ApiUnitErrorInfo } from '../../../../../types'
import type { SecondaryForecastCalc } from '../secondaryDrawerTypes'

type Params = {
  productId: string
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
  productId,
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

  useEffect(() => {
    let alive = true
    void (async () => {
      try {
        const roundedManualSafetyStock = Math.max(0, Math.round(manualSafetyStock))
        const params = {
          productId,
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
              productId,
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
      }
    })()
    return () => {
      alive = false
    }
  }, [
    dailyMeanClient,
    forecastMeanPeriodEnd,
    leadTimeDays,
    makeApiErrorInfo,
    manualSafetyStock,
    productId,
    safetyStockMode,
    selectedEnd,
    selectedStart,
    serviceLevelPct,
  ])

  return { forecastCalc, forecastCalcError }
}
