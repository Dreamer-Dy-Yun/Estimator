import { useEffect, useRef, useState } from 'react'
import { dashboardApi } from '../../../../../api'
import type { ProductComparisonBaseSubjectRef, SecondaryInboundSplitSource, SecondaryInboundSplitSourceParams, SecondaryProductIdentity } from '../../../../../api/types'
import type { ApiUnitErrorInfo } from '../../../../../types'

const DAY_MS: number = 86_400_000

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

function parseIsoDateMs(value: string, field: string): number {
  const match: RegExpMatchArray | null = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) throw new Error(`Secondary inbound split source ${field} must be a valid ISO date.`)

  const year: number = Number(match[1])
  const monthIndex: number = Number(match[2]) - 1
  const day: number = Number(match[3])
  const parsed: Date = new Date(Date.UTC(year, monthIndex, day))
  if (parsed.getUTCFullYear() !== year || parsed.getUTCMonth() !== monthIndex || parsed.getUTCDate() !== day) {
    throw new Error(`Secondary inbound split source ${field} must be a valid ISO date.`)
  }
  return parsed.getTime()
}

function formatIsoDate(dateMs: number): string {
  return new Date(dateMs).toISOString().slice(0, 10)
}

function assertFiniteQuantity(value: number | undefined, field: string): void {
  if (value == null || !Number.isFinite(value)) {
    throw new Error(`Secondary inbound split source ${field} must be finite.`)
  }
}

function assertProductIdentityMatches(expected: SecondaryProductIdentity, actual: SecondaryProductIdentity): void {
  if (actual == null || typeof actual !== 'object') throw new Error('Secondary inbound split source productIdentity is required.')
  if (actual.skuGroupKey !== expected.skuGroupKey) throw new Error(`Secondary inbound split source skuGroupKey mismatch: expected ${expected.skuGroupKey}, got ${actual.skuGroupKey}.`)
  if ((actual.productUuid ?? null) !== (expected.productUuid ?? null)) throw new Error('Secondary inbound split source productUuid mismatch.')
  if (actual.brand !== expected.brand) throw new Error(`Secondary inbound split source brand mismatch: expected ${expected.brand}, got ${actual.brand}.`)
  if (actual.code !== expected.code) throw new Error(`Secondary inbound split source code mismatch: expected ${expected.code}, got ${actual.code}.`)
  if (actual.colorCode !== expected.colorCode) throw new Error(`Secondary inbound split source colorCode mismatch: expected ${expected.colorCode}, got ${actual.colorCode}.`)
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
  assertProductIdentityMatches(productIdentity, source.productIdentity)
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

  const baseMs: number = parseIsoDateMs(source.calculationBaseDate, 'calculationBaseDate')
  const coverageStartMs: number = parseIsoDateMs(source.coverageStartDate, 'coverageStartDate')
  const coverageEndMs: number = parseIsoDateMs(source.coverageEndDate, 'coverageEndDate')
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
      const pointMs: number = parseIsoDateMs(point.date, `supplyBySize.${size}[${index}].date`)
      if (pointMs < baseMs || pointMs >= coverageEndMs) {
        throw new Error(`Secondary inbound split source supplyBySize.${size}[${index}].date is outside the source window.`)
      }
      assertFiniteQuantity(point.qty, `supplyBySize.${size}[${index}].qty`)
      if (point.date === source.calculationBaseDate) hasBaseStockPoint = true
    })
    if (!hasBaseStockPoint) {
      throw new Error(`Secondary inbound split source supplyBySize.${size} must include calculationBaseDate stock.`)
    }
  })

  for (let cursorMs: number = baseMs; cursorMs < coverageEndMs; cursorMs += DAY_MS) {
    const date: string = formatIsoDate(cursorMs)
    const cellsBySize: SecondaryInboundSplitSource['salesForecastByDate'][string] | undefined = source.salesForecastByDate[date]
    if (cellsBySize == null || typeof cellsBySize !== 'object') {
      throw new Error(`Secondary inbound split source salesForecastByDate.${date} is required.`)
    }
    sizes.forEach((size: string): void => {
      assertFiniteQuantity(cellsBySize[size], `salesForecastByDate.${date}.${size}`)
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
