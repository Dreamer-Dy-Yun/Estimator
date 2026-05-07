import { useEffect, useMemo, useRef, useState } from 'react'
import { dashboardApi } from '../../../../api'
import type { SecondaryDailyTrendPoint } from '../../../../api/types'
import type { ApiUnitErrorInfo } from '../../../../types'
import { buildShadeRanges } from '../../trend/trendRangeUtils'

type Params = {
  productId: string
  selectedStart: string
  selectedEnd: string
  leadTimeDays: number
  competitorChannelId: string
  makeApiErrorInfo: (request: string, err: unknown) => ApiUnitErrorInfo
}

export function useSecondaryDailyTrend({
  productId,
  selectedStart,
  selectedEnd,
  leadTimeDays,
  competitorChannelId,
  makeApiErrorInfo,
}: Params) {
  const reqSeqRef = useRef(0)
  const [dailyTrendSeries, setDailyTrendSeries] = useState<SecondaryDailyTrendPoint[]>([])
  const [dailyTrendError, setDailyTrendError] = useState<ApiUnitErrorInfo | null>(null)

  useEffect(() => {
    let alive = true
    const reqSeq = reqSeqRef.current + 1
    reqSeqRef.current = reqSeq
    void (async () => {
      try {
        const params = {
          productId,
          startMonth: selectedStart,
          leadTimeDays,
          competitorChannelId,
        }
        const series = await dashboardApi.getSecondaryDailyTrend(params)
        if (!alive || reqSeqRef.current !== reqSeq) return
        if (!series.length) throw new Error('일별 판매추이 데이터가 비어 있습니다.')
        setDailyTrendSeries(series)
        setDailyTrendError(null)
      } catch (err) {
        if (!alive || reqSeqRef.current !== reqSeq) return
        setDailyTrendSeries([])
        setDailyTrendError(
          makeApiErrorInfo(
            `getSecondaryDailyTrend(${JSON.stringify({ productId, startMonth: selectedStart, leadTimeDays, competitorChannelId })})`,
            err,
          ),
        )
      }
    })()
    return () => {
      alive = false
    }
  }, [competitorChannelId, leadTimeDays, makeApiErrorInfo, productId, selectedStart])

  const { periodShade: dailyPeriodShade, forecastShade: dailyForecastShade } = useMemo(
    () => buildShadeRanges(
      dailyTrendSeries.map((p) => ({ date: p.month, isForecast: p.isForecast })),
      selectedStart,
      selectedEnd,
    ),
    [dailyTrendSeries, selectedEnd, selectedStart],
  )

  const dailyTickIndices = useMemo(() => {
    const n = dailyTrendSeries.length
    if (n === 0) return [] as number[]
    const targetTicks = 26
    const step = Math.max(1, Math.ceil(n / targetTicks))
    const ticks: number[] = []
    for (let i = 0; i < n; i += step) ticks.push(dailyTrendSeries[i]!.idx)
    const last = dailyTrendSeries[n - 1]!.idx
    if (ticks[ticks.length - 1] !== last) ticks.push(last)
    return ticks
  }, [dailyTrendSeries])

  return {
    dailyTrendSeries,
    dailyTrendError,
    dailyPeriodShade,
    dailyForecastShade,
    dailyTickIndices,
  }
}
