import { useEffect, useMemo, useRef, useState } from 'react'
import { dashboardApi } from '../../../../../api'
import type { ProductComparisonBaseSubjectRef, ProductComparisonTarget, SecondaryDailyTrendParams, SecondaryDailyTrendPoint, SecondaryDailyTrendSource } from '../../../../../api/types'
import type { ApiUnitErrorInfo } from '../../../../../types'
import { buildShadeRanges } from '../../../trend/trendRangeUtils'
import { SecondaryDailyTrendRequestWindow } from '../model/SecondaryDailyTrendRequestWindow'
import { buildSecondaryDailyTrendPoints } from '../model/secondaryDailyTrendSourceModel'

export type Params = {
  skuGroupKey: string
  selectedStart: string
  selectedEnd: string
  baseSubject: ProductComparisonBaseSubjectRef
  comparisonTarget: ProductComparisonTarget
  leadTimeDays: number
  makeApiErrorInfo: (request: string, err: unknown) => ApiUnitErrorInfo
}

export function useSecondaryDailyTrend({
  skuGroupKey,
  selectedStart,
  selectedEnd,
  baseSubject,
  comparisonTarget,
  leadTimeDays,
  makeApiErrorInfo,
}: Params) : { dailyTrendSeries: SecondaryDailyTrendPoint[]; dailyTrendLoading: boolean; dailyTrendError: ApiUnitErrorInfo | null; dailyPeriodShade: { x1: number; x2: number; }; dailyForecastShade: { x1: number; x2: number; } | null; dailyTickIndices: number[]; } {
  const reqSeqRef: React.RefObject<number> = useRef(0)
  const [dailyTrendSeries, setDailyTrendSeries]: [SecondaryDailyTrendPoint[], React.Dispatch<React.SetStateAction<SecondaryDailyTrendPoint[]>>] = useState<SecondaryDailyTrendPoint[]>([])
  const [dailyTrendError, setDailyTrendError]: [ApiUnitErrorInfo | null, React.Dispatch<React.SetStateAction<ApiUnitErrorInfo | null>>] = useState<ApiUnitErrorInfo | null>(null)
  const [dailyTrendLoading, setDailyTrendLoading]: [boolean, React.Dispatch<React.SetStateAction<boolean>>] = useState(true)
  const requestWindow: SecondaryDailyTrendRequestWindow = useMemo(
    () : SecondaryDailyTrendRequestWindow => SecondaryDailyTrendRequestWindow.fromSelectedStartMonth({
      selectedStartMonth: selectedStart,
      forecastDays: leadTimeDays,
    }),
    [leadTimeDays, selectedStart],
  )

  useEffect(() : () => void => {
    let alive: boolean = true
    const reqSeq: number = reqSeqRef.current + 1
    reqSeqRef.current = reqSeq
    queueMicrotask(() : void => {
      if (alive && reqSeqRef.current === reqSeq) setDailyTrendLoading(true)
    })
    void (async () : Promise<void> => {
      try {
        const params: SecondaryDailyTrendParams = {
          skuGroupKey,
          base: baseSubject,
          comparison: comparisonTarget,
          ...requestWindow.toQueryFields(),
        }
        const source: SecondaryDailyTrendSource = await dashboardApi.getSecondaryDailyTrend(params)
        const series: SecondaryDailyTrendPoint[] = buildSecondaryDailyTrendPoints(source)
        if (!alive || reqSeqRef.current !== reqSeq) return
        if (!series.length) throw new Error('일별 판매추이 데이터가 비어 있습니다.')
        setDailyTrendSeries(series)
        setDailyTrendError(null)
      } catch (err) {
        if (!alive || reqSeqRef.current !== reqSeq) return
        setDailyTrendSeries([])
        setDailyTrendError(
          makeApiErrorInfo(
            `getSecondaryDailyTrend(${JSON.stringify({ skuGroupKey, base: baseSubject, comparison: comparisonTarget, ...requestWindow.toRequestLogFields() })})`,
            err,
          ),
        )
      } finally {
        if (alive && reqSeqRef.current === reqSeq) setDailyTrendLoading(false)
      }
    })()
    return () : void => {
      alive = false
    }
  }, [baseSubject, comparisonTarget, makeApiErrorInfo, requestWindow, skuGroupKey])

  const { periodShade: dailyPeriodShade, forecastShade: dailyForecastShade }: { periodStartIdx: number; periodEndIdx: number; periodShade: { x1: number; x2: number; }; forecastShade: { x1: number; x2: number; } | null; } = useMemo(
    () : { periodStartIdx: number; periodEndIdx: number; periodShade: { x1: number; x2: number; }; forecastShade: { x1: number; x2: number; } | null; } => buildShadeRanges(
      dailyTrendSeries.map((p: SecondaryDailyTrendPoint) : { date: string; isForecast: boolean; } => ({ date: p.date, isForecast: p.isForecast })),
      selectedStart,
      selectedEnd,
    ),
    [dailyTrendSeries, selectedEnd, selectedStart],
  )

  const dailyTickIndices: number[] = useMemo(() : number[] => {
    const n: number = dailyTrendSeries.length
    if (n === 0) return [] as number[]
    const targetTicks = 26 as const
    const step: number = Math.max(1, Math.ceil(n / targetTicks))
    const ticks: number[] = []
    for (let i: number = 0; i < n; i += step) ticks.push(dailyTrendSeries[i]!.idx)
    const last: number = dailyTrendSeries[n - 1]!.idx
    if (ticks[ticks.length - 1] !== last) ticks.push(last)
    return ticks
  }, [dailyTrendSeries])

  return {
    dailyTrendSeries,
    dailyTrendLoading,
    dailyTrendError,
    dailyPeriodShade,
    dailyForecastShade,
    dailyTickIndices,
  }
}
