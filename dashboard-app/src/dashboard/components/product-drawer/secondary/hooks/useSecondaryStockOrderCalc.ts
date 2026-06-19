import { useEffect, useMemo, useState } from 'react'
import { dashboardApi } from '../../../../../api'
import type { ProductComparisonBaseSubjectRef, ProductComparisonComparisonSubjectRef, SecondaryInboundSplitSource, SecondaryExistingOrderInboundPoint, SecondaryProductIdentity, SecondaryStockOrderCalcResult } from '../../../../../api/types'
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

function sumExistingOrderInboundPoints(points: readonly SecondaryExistingOrderInboundPoint[], beforeDate?: string): number {
  return points.reduce((sum: number, point: SecondaryExistingOrderInboundPoint): number => {
    parseSecondaryIsoDateMs(point.date, point.date, STOCK_ORDER_DATE_ERROR)
    requireFiniteSecondaryQuantity(point.qty, point.date, STOCK_ORDER_QUANTITY_ERROR)
    if (beforeDate != null && point.date >= beforeDate) return sum
    return sum + point.qty
  }, 0)
}

function assertNoUnexpectedSizeKeys(keys: readonly string[], expectedSizeSet: ReadonlySet<string>, field: string): void {
  keys.forEach((size: string): void => {
    if (!expectedSizeSet.has(size)) throw new Error(`Stock order ${field} has unexpected size ${size}.`)
  })
}

function assertExistingOrderInboundSupplyMatchesDisplay(result: SecondaryStockOrderCalcResult, currentOrderInboundDueDate: string): void {
  const displayRows: SecondaryStockOrderCalcResult['display']['sizeRows'] = result.display.sizeRows
  const displaySizeSet: Set<string> = new Set(displayRows.map((row: SecondaryStockOrderCalcResult['display']['sizeRows'][number]): string => row.size))
  assertNoUnexpectedSizeKeys(Object.keys(result.existingOrderInboundSupplyBySize), displaySizeSet, 'existingOrderInboundSupplyBySize')
  let totalOrderBalanceTotal: number = 0
  let expectedInboundOrderBalanceTotal: number = 0
  displayRows.forEach((row: SecondaryStockOrderCalcResult['display']['sizeRows'][number]): void => {
    const points: SecondaryExistingOrderInboundPoint[] | undefined = result.existingOrderInboundSupplyBySize[row.size]
    if (!Array.isArray(points)) throw new Error(`Stock order existing inbound supply is missing for size ${row.size}.`)
    const totalOrderBalance: number = sumExistingOrderInboundPoints(points)
    const expectedInboundOrderBalance: number = sumExistingOrderInboundPoints(points, currentOrderInboundDueDate)
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

function assertInboundSplitSourceMatchesStockOrder(
  result: SecondaryStockOrderCalcResult,
  currentOrderInboundDueDate: string,
  nextOrderInboundDueDate: string,
): void {
  const source: SecondaryInboundSplitSource = result.inboundSplitSource
  const displayRows: SecondaryStockOrderCalcResult['display']['sizeRows'] = result.display.sizeRows
  const displaySizeSet: Set<string> = new Set(displayRows.map((row: SecondaryStockOrderCalcResult['display']['sizeRows'][number]): string => row.size))
  const startMs: number = parseSecondaryIsoDateMs(currentOrderInboundDueDate, 'currentOrderInboundDueDate', STOCK_ORDER_SPLIT_SOURCE_DATE_ERROR)
  const endMs: number = parseSecondaryIsoDateMs(nextOrderInboundDueDate, 'nextOrderInboundDueDate', STOCK_ORDER_SPLIT_SOURCE_DATE_ERROR)
  if (endMs <= startMs) throw new Error('Stock order inboundSplitSource next inbound date must be after current inbound date.')

  if (source.total == null || typeof source.total !== 'object') throw new Error('Stock order inboundSplitSource total is required.')
  requireFiniteSecondaryQuantity(source.total.suggestion, 'total.suggestion', STOCK_ORDER_SPLIT_SOURCE_QUANTITY_ERROR)
  if (source.total.sales == null || typeof source.total.sales !== 'object') throw new Error('Stock order inboundSplitSource total.sales is required.')
  if (source.sizeInfo == null || typeof source.sizeInfo !== 'object') throw new Error('Stock order inboundSplitSource sizeInfo is required.')
  if (source.expectation == null || typeof source.expectation !== 'object') throw new Error('Stock order inboundSplitSource expectation is required.')
  assertNoUnexpectedSizeKeys(Object.keys(source.sizeInfo), displaySizeSet, 'inboundSplitSource sizeInfo')
  assertNoUnexpectedSizeKeys(Object.keys(source.expectation), displaySizeSet, 'inboundSplitSource expectation')

  for (let cursorMs: number = startMs; cursorMs < endMs; cursorMs += DAY_MS) {
    const date: string = formatSecondaryIsoDate(cursorMs)
    requireFiniteSecondaryQuantity(source.total.sales[date], `total.sales.${date}`, STOCK_ORDER_SPLIT_SOURCE_QUANTITY_ERROR)
  }

  Object.keys(source.total.sales).forEach((date: string): void => {
    const dateMs: number = parseSecondaryIsoDateMs(date, date, STOCK_ORDER_SPLIT_SOURCE_DATE_ERROR)
    if (dateMs < startMs || dateMs >= endMs) throw new Error(`Stock order inboundSplitSource total.sales.${date} is outside the source window.`)
  })

  displayRows.forEach((row: SecondaryStockOrderCalcResult['display']['sizeRows'][number]): void => {
    const sizeInfo: SecondaryInboundSplitSource['sizeInfo'][string] | undefined = source.sizeInfo[row.size]
    if (sizeInfo == null) throw new Error(`Stock order inboundSplitSource sizeInfo is missing for size ${row.size}.`)
    requireFiniteSecondaryQuantity(sizeInfo.salesRate, `sizeInfo.${row.size}.salesRate`, STOCK_ORDER_SPLIT_SOURCE_QUANTITY_ERROR)
    requireFiniteSecondaryQuantity(sizeInfo.baseStock, `sizeInfo.${row.size}.baseStock`, STOCK_ORDER_SPLIT_SOURCE_QUANTITY_ERROR)
    if (sizeInfo.salesRate < 0) throw new Error(`Stock order inboundSplitSource sizeInfo.${row.size}.salesRate must be non-negative.`)
    if (sizeInfo.salesRate > 1) throw new Error(`Stock order inboundSplitSource sizeInfo.${row.size}.salesRate must be at most 1.`)
    if (Math.round(sizeInfo.baseStock) !== Math.round(row.currentStockQty)) throw new Error(`Stock order inboundSplitSource current stock mismatch for size ${row.size}.`)

    const expectationPoints: SecondaryInboundSplitSource['expectation'][string] | undefined = source.expectation[row.size]
    if (!Array.isArray(expectationPoints)) throw new Error(`Stock order inboundSplitSource expectation is missing for size ${row.size}.`)
    expectationPoints.forEach((point: SecondaryInboundSplitSource['expectation'][string][number], index: number): void => {
      const pointMs: number = parseSecondaryIsoDateMs(point.date, point.date, STOCK_ORDER_SPLIT_SOURCE_DATE_ERROR)
      if (pointMs < startMs || pointMs >= endMs) throw new Error(`Stock order inboundSplitSource expectation.${row.size}[${index}].date is outside the source window.`)
      requireFiniteSecondaryQuantity(point.inbound, point.date, STOCK_ORDER_SPLIT_SOURCE_QUANTITY_ERROR)
    })
  })

  if (source.confirmed == null || typeof source.confirmed !== 'object') throw new Error('Stock order inboundSplitSource confirmed is required.')
  if (!Array.isArray(source.confirmed.data)) throw new Error('Stock order inboundSplitSource confirmed.data must be an array.')
  if (Math.round(source.confirmed.total_phase) !== source.confirmed.data.length) throw new Error('Stock order inboundSplitSource confirmed.total_phase must match confirmed.data length.')
  source.confirmed.data.forEach((phase: SecondaryInboundSplitSource['confirmed']['data'][number], index: number): void => {
    if (Math.round(phase.phase) !== index + 1) throw new Error(`Stock order inboundSplitSource confirmed.data[${index}].phase must be sequential.`)
    const phaseDateMs: number = parseSecondaryIsoDateMs(phase.inbound_date, phase.inbound_date, STOCK_ORDER_SPLIT_SOURCE_DATE_ERROR)
    if (phaseDateMs < startMs || phaseDateMs >= endMs) throw new Error(`Stock order inboundSplitSource confirmed.data[${index}].inbound_date is outside the source window.`)
    assertNoUnexpectedSizeKeys(Object.keys(phase.quantity), displaySizeSet, `inboundSplitSource confirmed.data[${index}].quantity`)
    displayRows.forEach((row: SecondaryStockOrderCalcResult['display']['sizeRows'][number]): void => {
      requireFiniteSecondaryQuantity(phase.quantity[row.size], `confirmed.data[${index}].quantity.${row.size}`, STOCK_ORDER_SPLIT_SOURCE_QUANTITY_ERROR)
    })
  })
}
function assertStockOrderCalcResult(
  result: SecondaryStockOrderCalcResult,
  productIdentity: SecondaryProductIdentity,
  currentOrderInboundDueDate: string,
  nextOrderInboundDueDate: string,
): void {
  assertSecondaryProductIdentityMatches('Stock order', productIdentity, result.productIdentity)
  assertExistingOrderInboundSupplyMatchesDisplay(result, currentOrderInboundDueDate)
  assertInboundSplitSourceMatchesStockOrder(result, currentOrderInboundDueDate, nextOrderInboundDueDate)
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
          assertStockOrderCalcResult(result, productIdentity, currentOrderInboundDueDate, nextOrderInboundDueDate)
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
