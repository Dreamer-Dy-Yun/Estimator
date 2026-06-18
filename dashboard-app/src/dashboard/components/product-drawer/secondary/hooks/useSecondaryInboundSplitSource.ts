import { useEffect, useRef, useState } from 'react'
import { dashboardApi } from '../../../../../api'
import type { ProductComparisonBaseSubjectRef, SecondaryInboundSplitSource, SecondaryInboundSplitSourceParams, SecondaryProductIdentity } from '../../../../../api/types'
import { assertSecondaryProductIdentityMatches, formatSecondaryIsoDate, parseSecondaryIsoDateMs, requireFiniteSecondaryQuantity } from '../../../../../api/types/secondaryContractGuards'
import type { ApiUnitErrorInfo } from '../../../../../types'

const DAY_MS: number = 86_400_000
const INBOUND_SPLIT_SOURCE_DATE_ERROR = 'Invalid secondary inbound split source date'
const INBOUND_SPLIT_SOURCE_QUANTITY_ERROR = 'Invalid secondary inbound split source quantity'

export interface UseSecondaryInboundSplitSourceParams {
  skuGroupKey: string
  productIdentity: SecondaryProductIdentity
  calculationBaseDate: string
  coverageStartDate: string
  coverageEndDate: string
  baseSubject: ProductComparisonBaseSubjectRef
  makeApiErrorInfo: (request: string, err: unknown) => ApiUnitErrorInfo
}

export interface UseSecondaryInboundSplitSourceResult {
  inboundSplitSource: SecondaryInboundSplitSource | null
  inboundSplitSourceLoading: boolean
  inboundSplitSourceError: ApiUnitErrorInfo | null
}

function assertInboundSplitSource(
  source: SecondaryInboundSplitSource,
  productIdentity: SecondaryProductIdentity,
  calculationBaseDate: string,
  coverageStartDate: string,
  coverageEndDate: string,
): void {
  if (!source.productId) {
    throw new Error('Secondary inbound split source productId is required.')
  }
  assertSecondaryProductIdentityMatches('Secondary inbound split source', productIdentity, source.productIdentity)
  if (
    source.calculationBaseDate !== calculationBaseDate ||
    source.coverageStartDate !== coverageStartDate ||
    source.coverageEndDate !== coverageEndDate
  ) {
    throw new Error('Secondary inbound split source date range does not match the request.')
  }
  if (source.supplyBySize == null || typeof source.supplyBySize !== 'object') {
    throw new Error('Secondary inbound split source supplyBySize is required.')
  }
  if (source.salesForecastByDate == null || typeof source.salesForecastByDate !== 'object') {
    throw new Error('Secondary inbound split source salesForecastByDate is required.')
  }

  const baseMs: number = parseSecondaryIsoDateMs(source.calculationBaseDate, 'calculationBaseDate', INBOUND_SPLIT_SOURCE_DATE_ERROR)
  const coverageStartMs: number = parseSecondaryIsoDateMs(source.coverageStartDate, 'coverageStartDate', INBOUND_SPLIT_SOURCE_DATE_ERROR)
  const coverageEndMs: number = parseSecondaryIsoDateMs(source.coverageEndDate, 'coverageEndDate', INBOUND_SPLIT_SOURCE_DATE_ERROR)
  if (coverageStartMs < baseMs) {
    throw new Error('Secondary inbound split source coverageStartDate must be on or after calculationBaseDate.')
  }
  if (coverageEndMs <= coverageStartMs) {
    throw new Error('Secondary inbound split source coverageEndDate must be after coverageStartDate.')
  }

  const sizes: string[] = Object.keys(source.supplyBySize)
  if (sizes.length === 0) {
    throw new Error('Secondary inbound split source supplyBySize must include at least one size.')
  }
  sizes.forEach((size: string): void => {
    const supplyPoints: SecondaryInboundSplitSource['supplyBySize'][string] | undefined = source.supplyBySize[size]
    if (!Array.isArray(supplyPoints)) {
      throw new Error(`Secondary inbound split source supplyBySize.${size} must be an array.`)
    }
    let hasBaseStockPoint: boolean = false
    supplyPoints.forEach((point: SecondaryInboundSplitSource['supplyBySize'][string][number], index: number): void => {
      const pointMs: number = parseSecondaryIsoDateMs(point.date, `supplyBySize.${size}[${index}].date`, INBOUND_SPLIT_SOURCE_DATE_ERROR)
      if (pointMs < baseMs || pointMs >= coverageEndMs) {
        throw new Error(`Secondary inbound split source supplyBySize.${size}[${index}].date is outside the source window.`)
      }
      requireFiniteSecondaryQuantity(point.qty, `supplyBySize.${size}[${index}].qty`, INBOUND_SPLIT_SOURCE_QUANTITY_ERROR)
      if (point.date === source.calculationBaseDate) hasBaseStockPoint = true
    })
    if (!hasBaseStockPoint) {
      throw new Error(`Secondary inbound split source supplyBySize.${size} must include calculationBaseDate stock.`)
    }
  })

  for (let cursorMs: number = baseMs; cursorMs < coverageEndMs; cursorMs += DAY_MS) {
    const date: string = formatSecondaryIsoDate(cursorMs)
    const cellsBySize: SecondaryInboundSplitSource['salesForecastByDate'][string] | undefined = source.salesForecastByDate[date]
    if (cellsBySize == null || typeof cellsBySize !== 'object') {
      throw new Error(`Secondary inbound split source salesForecastByDate.${date} is required.`)
    }
    sizes.forEach((size: string): void => {
      requireFiniteSecondaryQuantity(cellsBySize[size], `salesForecastByDate.${date}.${size}`, INBOUND_SPLIT_SOURCE_QUANTITY_ERROR)
    })
  }
}

export function useSecondaryInboundSplitSource({
  skuGroupKey,
  productIdentity,
  calculationBaseDate,
  coverageStartDate,
  coverageEndDate,
  baseSubject,
  makeApiErrorInfo,
}: UseSecondaryInboundSplitSourceParams): UseSecondaryInboundSplitSourceResult {
  const reqSeqRef: React.RefObject<number> = useRef(0)
  const [inboundSplitSource, setInboundSplitSource]: [SecondaryInboundSplitSource | null, React.Dispatch<React.SetStateAction<SecondaryInboundSplitSource | null>>] = useState<SecondaryInboundSplitSource | null>(null)
  const [inboundSplitSourceError, setInboundSplitSourceError]: [ApiUnitErrorInfo | null, React.Dispatch<React.SetStateAction<ApiUnitErrorInfo | null>>] = useState<ApiUnitErrorInfo | null>(null)
  const [inboundSplitSourceLoading, setInboundSplitSourceLoading]: [boolean, React.Dispatch<React.SetStateAction<boolean>>] = useState<boolean>(true)

  useEffect((): () => void => {
    let alive: boolean = true
    const reqSeq: number = reqSeqRef.current + 1
    reqSeqRef.current = reqSeq
    queueMicrotask((): void => {
      if (alive && reqSeqRef.current === reqSeq) setInboundSplitSourceLoading(true)
    })
    void (async (): Promise<void> => {
      try {
        const params: SecondaryInboundSplitSourceParams = {
          skuGroupKey,
          productIdentity,
          calculationBaseDate,
          coverageStartDate,
          coverageEndDate,
          base: baseSubject,
        }
        const source: SecondaryInboundSplitSource = await dashboardApi.getSecondaryInboundSplitSource(params)
        assertInboundSplitSource(source, productIdentity, calculationBaseDate, coverageStartDate, coverageEndDate)
        if (!alive || reqSeqRef.current !== reqSeq) return
        setInboundSplitSource(source)
        setInboundSplitSourceError(null)
      } catch (err) {
        if (!alive || reqSeqRef.current !== reqSeq) return
        setInboundSplitSource(null)
        setInboundSplitSourceError(
          makeApiErrorInfo(
            `getSecondaryInboundSplitSource(${JSON.stringify({ skuGroupKey, productIdentity, calculationBaseDate, coverageStartDate, coverageEndDate, base: baseSubject })})`,
            err,
          ),
        )
      } finally {
        if (alive && reqSeqRef.current === reqSeq) setInboundSplitSourceLoading(false)
      }
    })()
    return (): void => {
      alive = false
    }
  }, [baseSubject, calculationBaseDate, coverageEndDate, coverageStartDate, makeApiErrorInfo, productIdentity, skuGroupKey])

  return {
    inboundSplitSource,
    inboundSplitSourceLoading,
    inboundSplitSourceError,
  }
}
