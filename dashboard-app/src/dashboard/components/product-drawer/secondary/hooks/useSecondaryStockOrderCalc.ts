import { useEffect, useMemo, useState } from 'react'
import { dashboardApi } from '../../../../../api'
import type { ProductComparisonBaseSubjectRef, SecondaryInboundSplitSupplyPoint, SecondaryProductIdentity, SecondaryStockOrderCalcResult } from '../../../../../api/types'
import type { ApiUnitErrorInfo } from '../../../../../types'

const STOCK_ORDER_CALC_DEBOUNCE_MS = 1000 as const
const ISO_DATE_RE: RegExp = /^\d{4}-\d{2}-\d{2}$/

export type Params = {
  skuGroupKey: string
  productIdentity: SecondaryProductIdentity
  periodStart: string
  periodEnd: string
  baseSubject: ProductComparisonBaseSubjectRef
  calculationBaseDate: string
  currentOrderInboundDueDate: string
  forecastPeriodEndMonth: string
  orderCoverageDays: number
  dailyMeanClient: number | null
  makeApiErrorInfo: (request: string, err: unknown) => ApiUnitErrorInfo
}

export type ForecastCalcState = {
  requestKey: string
  result: SecondaryStockOrderCalcResult
}

function assertProductIdentityMatches(expected: SecondaryProductIdentity, actual: SecondaryProductIdentity): void {
  if (actual == null || typeof actual !== 'object') throw new Error('Stock order productIdentity is required.')
  if (actual.skuGroupKey !== expected.skuGroupKey) throw new Error(`Stock order product skuGroupKey mismatch: expected ${expected.skuGroupKey}, got ${actual.skuGroupKey}.`)
  if ((actual.productUuid ?? null) !== (expected.productUuid ?? null)) throw new Error('Stock order productUuid mismatch.')
  if (actual.brand !== expected.brand) throw new Error(`Stock order product brand mismatch: expected ${expected.brand}, got ${actual.brand}.`)
  if (actual.code !== expected.code) throw new Error(`Stock order product code mismatch: expected ${expected.code}, got ${actual.code}.`)
  if (actual.colorCode !== expected.colorCode) throw new Error(`Stock order product colorCode mismatch: expected ${expected.colorCode}, got ${actual.colorCode}.`)
}

function sumSupplyPoints(points: readonly SecondaryInboundSplitSupplyPoint[], beforeDate?: string): number {
  return points.reduce((sum: number, point: SecondaryInboundSplitSupplyPoint): number => {
    if (!ISO_DATE_RE.test(point.date)) throw new Error(`Stock order existing inbound supply date is invalid: ${point.date}.`)
    if (!Number.isFinite(point.qty)) throw new Error(`Stock order existing inbound supply qty is invalid for ${point.date}.`)
    if (beforeDate != null && point.date >= beforeDate) return sum
    return sum + point.qty
  }, 0)
}

function assertExistingOrderInboundSupplyMatchesDisplay(result: SecondaryStockOrderCalcResult, currentOrderInboundDueDate: string): void {
  const displayRows: SecondaryStockOrderCalcResult['display']['sizeRows'] = result.display.sizeRows
  let totalOrderBalanceTotal: number = 0
  let expectedInboundOrderBalanceTotal: number = 0
  displayRows.forEach((row: SecondaryStockOrderCalcResult['display']['sizeRows'][number]): void => {
    const points: SecondaryInboundSplitSupplyPoint[] | undefined = result.existingOrderInboundSupplyBySize[row.size]
    if (!Array.isArray(points)) throw new Error(`Stock order existing inbound supply is missing for size ${row.size}.`)
    const totalOrderBalance: number = sumSupplyPoints(points)
    const expectedInboundOrderBalance: number = sumSupplyPoints(points, currentOrderInboundDueDate)
    if (Math.round(totalOrderBalance) !== Math.round(row.totalOrderBalance)) {
      throw new Error(`Stock order totalOrderBalance mismatch for size ${row.size}.`)
    }
    if (Math.round(expectedInboundOrderBalance) !== Math.round(row.expectedInboundOrderBalance)) {
      throw new Error(`Stock order expectedInboundOrderBalance mismatch for size ${row.size}.`)
    }
    totalOrderBalanceTotal += totalOrderBalance
    expectedInboundOrderBalanceTotal += expectedInboundOrderBalance
  })
  if (Math.round(totalOrderBalanceTotal) !== Math.round(result.display.totalOrderBalanceTotal)) throw new Error('Stock order totalOrderBalanceTotal mismatch.')
  if (Math.round(expectedInboundOrderBalanceTotal) !== Math.round(result.display.expectedInboundOrderBalanceTotal)) throw new Error('Stock order expectedInboundOrderBalanceTotal mismatch.')
}

function assertStockOrderCalcResult(
  result: SecondaryStockOrderCalcResult,
  productIdentity: SecondaryProductIdentity,
  currentOrderInboundDueDate: string,
): void {
  assertProductIdentityMatches(productIdentity, result.productIdentity)
  assertExistingOrderInboundSupplyMatchesDisplay(result, currentOrderInboundDueDate)
}

export function useSecondaryStockOrderCalc({
  skuGroupKey,
  productIdentity,
  periodStart,
  periodEnd,
  baseSubject,
  calculationBaseDate,
  currentOrderInboundDueDate,
  forecastPeriodEndMonth,
  orderCoverageDays,
  dailyMeanClient,
  makeApiErrorInfo,
}: Params) : { forecastCalc: SecondaryStockOrderCalcResult | null; forecastCalcError: ApiUnitErrorInfo | null; forecastCalcLoading: boolean; } {
  const requestKey: string = useMemo(() : string => JSON.stringify({
    skuGroupKey,
    productIdentity,
    base: baseSubject,
    periodStart,
    periodEnd,
    calculationBaseDate,
    currentOrderInboundDueDate,
    forecastPeriodEndMonth,
    orderCoverageDays,
    dailyMeanClient,
  }), [
    baseSubject,
    productIdentity,
    calculationBaseDate,
    dailyMeanClient,
    currentOrderInboundDueDate,
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
          const params: { dailyMean?: number | undefined; skuGroupKey: string; productIdentity: SecondaryProductIdentity; base: ProductComparisonBaseSubjectRef; periodStart: string; periodEnd: string; calculationBaseDate: string; currentOrderInboundDueDate: string; forecastPeriodEndMonth: string; orderCoverageDays: number; } = {
            skuGroupKey,
            productIdentity,
            base: baseSubject,
            periodStart,
            periodEnd,
            calculationBaseDate,
            currentOrderInboundDueDate,
            forecastPeriodEndMonth: forecastPeriodEndMonth,
            orderCoverageDays,
            ...(dailyMeanClient != null ? { dailyMean: dailyMeanClient } : {}),
          }
          const result: SecondaryStockOrderCalcResult = await dashboardApi.getSecondaryStockOrderCalc(params)
          assertStockOrderCalcResult(result, productIdentity, currentOrderInboundDueDate)
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
                productIdentity,
                base: baseSubject,
                periodStart,
                periodEnd,
                calculationBaseDate,
                currentOrderInboundDueDate,
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
    calculationBaseDate,
    currentOrderInboundDueDate,
    forecastPeriodEndMonth,
    orderCoverageDays,
    makeApiErrorInfo,
    productIdentity,
    requestKey,
    skuGroupKey,
    periodEnd,
    periodStart,
  ])

  return { forecastCalc, forecastCalcError, forecastCalcLoading }
}
