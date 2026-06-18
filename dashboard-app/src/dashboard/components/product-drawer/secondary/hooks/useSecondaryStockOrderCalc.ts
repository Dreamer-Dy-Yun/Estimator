import { useEffect, useMemo, useState } from 'react'
import { dashboardApi } from '../../../../../api'
import type { ProductComparisonBaseSubjectRef, SecondaryInboundSplitSupplyPoint, SecondaryProductIdentity, SecondaryStockOrderCalcResult } from '../../../../../api/types'
import { assertSecondaryProductIdentityMatches, parseSecondaryIsoDateMs, requireFiniteSecondaryQuantity } from '../../../../../api/types/secondaryContractGuards'
import type { ApiUnitErrorInfo } from '../../../../../types'

const STOCK_ORDER_CALC_DEBOUNCE_MS = 1000 as const
const STOCK_ORDER_DATE_ERROR = 'Invalid stock-order existing inbound supply date'
const STOCK_ORDER_QUANTITY_ERROR = 'Invalid stock-order existing inbound supply quantity'

export type UseSecondaryStockOrderCalcParams = {
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

export type StockOrderCalcState = {
  requestKey: string
  result: SecondaryStockOrderCalcResult
}

function sumSupplyPoints(points: readonly SecondaryInboundSplitSupplyPoint[], beforeDate?: string): number {
  return points.reduce((sum: number, point: SecondaryInboundSplitSupplyPoint): number => {
    parseSecondaryIsoDateMs(point.date, point.date, STOCK_ORDER_DATE_ERROR)
    requireFiniteSecondaryQuantity(point.qty, point.date, STOCK_ORDER_QUANTITY_ERROR)
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
  assertSecondaryProductIdentityMatches('Stock order', productIdentity, result.productIdentity)
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
}: UseSecondaryStockOrderCalcParams) : { stockOrderCalc: SecondaryStockOrderCalcResult | null; stockOrderCalcError: ApiUnitErrorInfo | null; stockOrderCalcLoading: boolean; } {
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
  const [stockOrderCalcState, setStockOrderCalcState]: [StockOrderCalcState | null, React.Dispatch<React.SetStateAction<StockOrderCalcState | null>>] = useState<StockOrderCalcState | null>(null)
  const [stockOrderCalcError, setStockOrderCalcError]: [ApiUnitErrorInfo | null, React.Dispatch<React.SetStateAction<ApiUnitErrorInfo | null>>] = useState<ApiUnitErrorInfo | null>(null)
  const [stockOrderCalcLoading, setStockOrderCalcLoading]: [boolean, React.Dispatch<React.SetStateAction<boolean>>] = useState(true)
  const stockOrderCalc: SecondaryStockOrderCalcResult | null = stockOrderCalcState?.requestKey === requestKey ? stockOrderCalcState.result : null

  useEffect(() : () => void => {
    let alive: boolean = true
    let timerId: ReturnType<typeof window.setTimeout> | null = null
    queueMicrotask(() : void => {
      if (!alive) return
      setStockOrderCalcLoading(true)
      setStockOrderCalcError(null)
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
          setStockOrderCalcState({ requestKey, result })
          setStockOrderCalcError(null)
        } catch (err) {
          if (!alive) return
          setStockOrderCalcState(null)
          setStockOrderCalcError(
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
          if (alive) setStockOrderCalcLoading(false)
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

  return { stockOrderCalc, stockOrderCalcError, stockOrderCalcLoading }
}
