import { useEffect, useMemo, useState } from 'react'
import { dashboardApi } from '../../../../../api'
import type { ProductComparisonBaseSubjectRef, ProductComparisonComparisonSubjectRef, SecondaryInboundSplitSource, SecondaryInboundSplitSupplyPoint, SecondaryProductIdentity, SecondaryStockOrderCalcResult } from '../../../../../api/types'
import { assertSecondaryProductIdentityMatches, formatSecondaryIsoDate, parseSecondaryIsoDateMs, requireFiniteSecondaryQuantity } from '../../../../../api/types/secondaryContractGuards'
import type { ApiUnitErrorInfo } from '../../../../../types'

const STOCK_ORDER_CALC_DEBOUNCE_MS = 1000 as const
const DAY_MS: number = 86_400_000
const STOCK_ORDER_DATE_ERROR = 'Invalid stock-order existing inbound supply date'
const STOCK_ORDER_QUANTITY_ERROR = 'Invalid stock-order existing inbound supply quantity'
const STOCK_ORDER_SPLIT_SOURCE_DATE_ERROR = 'Invalid stock-order inbound split source date'
const STOCK_ORDER_SPLIT_SOURCE_QUANTITY_ERROR = 'Invalid stock-order inbound split source quantity'

export type UseSecondaryStockOrderCalcParams = {
  skuGroupKey: string
  productIdentity: SecondaryProductIdentity
  periodStart: string
  periodEnd: string
  baseSubject: ProductComparisonBaseSubjectRef
  comparisonSubject: ProductComparisonComparisonSubjectRef
  calculationBaseDate: string
  currentOrderInboundDueDate: string
  nextOrderInboundDueDate: string
  forecastPeriodEndMonth: string
  orderCoverageDays: number
  selfWeightPct: number
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

function sumSourceSupplyOnDate(points: readonly SecondaryInboundSplitSupplyPoint[], date: string): number {
  return points.reduce((sum: number, point: SecondaryInboundSplitSupplyPoint): number => {
    if (point.date !== date) return sum
    requireFiniteSecondaryQuantity(point.qty, point.date, STOCK_ORDER_SPLIT_SOURCE_QUANTITY_ERROR)
    return sum + point.qty
  }, 0)
}

function assertInboundSplitSourceMatchesStockOrder(
  result: SecondaryStockOrderCalcResult,
  productIdentity: SecondaryProductIdentity,
  calculationBaseDate: string,
  currentOrderInboundDueDate: string,
  nextOrderInboundDueDate: string,
): void {
  const source: SecondaryInboundSplitSource = result.inboundSplitSource
  if (source == null || typeof source !== 'object') throw new Error('Stock order inboundSplitSource is required.')
  if (!source.productId) throw new Error('Stock order inboundSplitSource productId is required.')
  assertSecondaryProductIdentityMatches('Stock order inboundSplitSource', productIdentity, source.productIdentity)
  if (source.calculationBaseDate !== calculationBaseDate) throw new Error('Stock order inboundSplitSource calculationBaseDate mismatch.')
  if (source.coverageStartDate !== currentOrderInboundDueDate) throw new Error('Stock order inboundSplitSource coverageStartDate mismatch.')
  if (source.coverageEndDate !== nextOrderInboundDueDate) throw new Error('Stock order inboundSplitSource coverageEndDate mismatch.')

  const baseMs: number = parseSecondaryIsoDateMs(source.calculationBaseDate, 'calculationBaseDate', STOCK_ORDER_SPLIT_SOURCE_DATE_ERROR)
  const startMs: number = parseSecondaryIsoDateMs(source.coverageStartDate, 'coverageStartDate', STOCK_ORDER_SPLIT_SOURCE_DATE_ERROR)
  const endMs: number = parseSecondaryIsoDateMs(source.coverageEndDate, 'coverageEndDate', STOCK_ORDER_SPLIT_SOURCE_DATE_ERROR)
  if (startMs < baseMs) throw new Error('Stock order inboundSplitSource coverageStartDate must be on or after calculationBaseDate.')
  if (endMs <= startMs) throw new Error('Stock order inboundSplitSource coverageEndDate must be after coverageStartDate.')

  const displayRows: SecondaryStockOrderCalcResult['display']['sizeRows'] = result.display.sizeRows
  displayRows.forEach((row: SecondaryStockOrderCalcResult['display']['sizeRows'][number]): void => {
    const sourcePoints: SecondaryInboundSplitSupplyPoint[] | undefined = source.supplyBySize[row.size]
    if (!Array.isArray(sourcePoints)) throw new Error(`Stock order inboundSplitSource supplyBySize is missing for size ${row.size}.`)
    sourcePoints.forEach((point: SecondaryInboundSplitSupplyPoint, index: number): void => {
      const pointMs: number = parseSecondaryIsoDateMs(point.date, `supplyBySize.${row.size}[${index}].date`, STOCK_ORDER_SPLIT_SOURCE_DATE_ERROR)
      if (pointMs < baseMs || pointMs >= endMs) throw new Error(`Stock order inboundSplitSource supplyBySize.${row.size}[${index}].date is outside the source window.`)
      requireFiniteSecondaryQuantity(point.qty, `supplyBySize.${row.size}[${index}].qty`, STOCK_ORDER_SPLIT_SOURCE_QUANTITY_ERROR)
    })
    if (Math.round(sumSourceSupplyOnDate(sourcePoints, source.calculationBaseDate)) !== Math.round(row.currentStockQty)) {
      throw new Error(`Stock order inboundSplitSource current stock mismatch for size ${row.size}.`)
    }
  })

  for (let cursorMs: number = baseMs; cursorMs < endMs; cursorMs += DAY_MS) {
    const date: string = formatSecondaryIsoDate(cursorMs)
    const cellsBySize: SecondaryInboundSplitSource['salesForecastByDate'][string] | undefined = source.salesForecastByDate[date]
    if (cellsBySize == null || typeof cellsBySize !== 'object') throw new Error(`Stock order inboundSplitSource salesForecastByDate.${date} is required.`)
    displayRows.forEach((row: SecondaryStockOrderCalcResult['display']['sizeRows'][number]): void => {
      requireFiniteSecondaryQuantity(cellsBySize[row.size], `salesForecastByDate.${date}.${row.size}`, STOCK_ORDER_SPLIT_SOURCE_QUANTITY_ERROR)
    })
  }
}

function assertStockOrderCalcResult(
  result: SecondaryStockOrderCalcResult,
  productIdentity: SecondaryProductIdentity,
  calculationBaseDate: string,
  currentOrderInboundDueDate: string,
  nextOrderInboundDueDate: string,
): void {
  assertSecondaryProductIdentityMatches('Stock order', productIdentity, result.productIdentity)
  assertExistingOrderInboundSupplyMatchesDisplay(result, currentOrderInboundDueDate)
  assertInboundSplitSourceMatchesStockOrder(result, productIdentity, calculationBaseDate, currentOrderInboundDueDate, nextOrderInboundDueDate)
}

export function useSecondaryStockOrderCalc({
  skuGroupKey,
  productIdentity,
  periodStart,
  periodEnd,
  baseSubject,
  comparisonSubject,
  calculationBaseDate,
  currentOrderInboundDueDate,
  nextOrderInboundDueDate,
  forecastPeriodEndMonth,
  orderCoverageDays,
  selfWeightPct,
  dailyMeanClient,
  makeApiErrorInfo,
}: UseSecondaryStockOrderCalcParams) : { stockOrderCalc: SecondaryStockOrderCalcResult | null; stockOrderCalcError: ApiUnitErrorInfo | null; stockOrderCalcLoading: boolean; } {
  const requestKey: string = useMemo(() : string => JSON.stringify({
    skuGroupKey,
    productIdentity,
    base: baseSubject,
    comparison: comparisonSubject,
    periodStart,
    periodEnd,
    calculationBaseDate,
    currentOrderInboundDueDate,
    nextOrderInboundDueDate,
    forecastPeriodEndMonth,
    orderCoverageDays,
    selfWeightPct,
    dailyMeanClient,
  }), [
    baseSubject,
    comparisonSubject,
    productIdentity,
    calculationBaseDate,
    dailyMeanClient,
    currentOrderInboundDueDate,
    nextOrderInboundDueDate,
    forecastPeriodEndMonth,
    orderCoverageDays,
    selfWeightPct,
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
          const params: { dailyMean?: number | undefined; skuGroupKey: string; productIdentity: SecondaryProductIdentity; base: ProductComparisonBaseSubjectRef; comparison: ProductComparisonComparisonSubjectRef; periodStart: string; periodEnd: string; calculationBaseDate: string; currentOrderInboundDueDate: string; nextOrderInboundDueDate: string; forecastPeriodEndMonth: string; orderCoverageDays: number; selfWeightPct: number; } = {
            skuGroupKey,
            productIdentity,
            base: baseSubject,
            comparison: comparisonSubject,
            periodStart,
            periodEnd,
            calculationBaseDate,
            currentOrderInboundDueDate,
            nextOrderInboundDueDate,
            forecastPeriodEndMonth: forecastPeriodEndMonth,
            orderCoverageDays,
            selfWeightPct,
            ...(dailyMeanClient != null ? { dailyMean: dailyMeanClient } : {}),
          }
          const result: SecondaryStockOrderCalcResult = await dashboardApi.getSecondaryStockOrderCalc(params)
          assertStockOrderCalcResult(result, productIdentity, calculationBaseDate, currentOrderInboundDueDate, nextOrderInboundDueDate)
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
                comparison: comparisonSubject,
                periodStart,
                periodEnd,
                calculationBaseDate,
                currentOrderInboundDueDate,
                nextOrderInboundDueDate,
                forecastPeriodEndMonth: forecastPeriodEndMonth,
                orderCoverageDays,
                selfWeightPct,
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
    comparisonSubject,
    calculationBaseDate,
    currentOrderInboundDueDate,
    nextOrderInboundDueDate,
    forecastPeriodEndMonth,
    orderCoverageDays,
    selfWeightPct,
    makeApiErrorInfo,
    productIdentity,
    requestKey,
    skuGroupKey,
    periodEnd,
    periodStart,
  ])

  return { stockOrderCalc, stockOrderCalcError, stockOrderCalcLoading }
}
