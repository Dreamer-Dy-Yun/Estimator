import { useEffect, useRef, useState } from 'react'
import { dashboardApi } from '../../../../../api'
import type { ProductComparisonBaseSubjectRef, SecondaryInboundSplitSource, SecondaryInboundSplitSourceParams } from '../../../../../api/types'
import type { ApiUnitErrorInfo } from '../../../../../types'

const DAY_MS: number = 86_400_000

export interface UseSecondaryInboundSplitSourceParams {
  skuGroupKey: string
  dateStart: string
  dateEnd: string
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

function assertInboundSplitSource(source: SecondaryInboundSplitSource, dateStart: string, dateEnd: string): void {
  if (!source.productId) {
    throw new Error('Secondary inbound split source productId is required.')
  }
  if (source.dateStart !== dateStart || source.dateEnd !== dateEnd) {
    throw new Error('Secondary inbound split source date range does not match the request.')
  }
  if (source.stockBySize == null || typeof source.stockBySize !== 'object') {
    throw new Error('Secondary inbound split source stockBySize is required.')
  }
  if (source.expectationByDate == null || typeof source.expectationByDate !== 'object') {
    throw new Error('Secondary inbound split source expectationByDate is required.')
  }

  const startMs: number = parseIsoDateMs(source.dateStart, 'dateStart')
  const endMs: number = parseIsoDateMs(source.dateEnd, 'dateEnd')
  if (endMs <= startMs) {
    throw new Error('Secondary inbound split source dateEnd must be after dateStart.')
  }

  const sizes: string[] = Object.keys(source.stockBySize)
  if (sizes.length === 0) {
    throw new Error('Secondary inbound split source stockBySize must include at least one size.')
  }
  sizes.forEach((size: string): void => assertFiniteQuantity(source.stockBySize[size], `stockBySize.${size}`))

  for (let cursorMs: number = startMs; cursorMs < endMs; cursorMs += DAY_MS) {
    const date: string = formatIsoDate(cursorMs)
    const cellsBySize: SecondaryInboundSplitSource['expectationByDate'][string] | undefined = source.expectationByDate[date]
    if (cellsBySize == null || typeof cellsBySize !== 'object') {
      throw new Error(`Secondary inbound split source expectationByDate.${date} is required.`)
    }
    sizes.forEach((size: string): void => {
      const cell: SecondaryInboundSplitSource['expectationByDate'][string][string] | undefined = cellsBySize[size]
      if (cell == null) {
        throw new Error(`Secondary inbound split source expectationByDate.${date}.${size} is required.`)
      }
      assertFiniteQuantity(cell.sale, `expectationByDate.${date}.${size}.sale`)
      assertFiniteQuantity(cell.inbound, `expectationByDate.${date}.${size}.inbound`)
    })
  }
}

export function useSecondaryInboundSplitSource({
  skuGroupKey,
  dateStart,
  dateEnd,
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
          dateStart,
          dateEnd,
          base: baseSubject,
        }
        const source: SecondaryInboundSplitSource = await dashboardApi.getSecondaryInboundSplitSource(params)
        assertInboundSplitSource(source, dateStart, dateEnd)
        if (!alive || reqSeqRef.current !== reqSeq) return
        setInboundSplitSource(source)
        setInboundSplitSourceError(null)
      } catch (err) {
        if (!alive || reqSeqRef.current !== reqSeq) return
        setInboundSplitSource(null)
        setInboundSplitSourceError(
          makeApiErrorInfo(
            `getSecondaryInboundSplitSource(${JSON.stringify({ skuGroupKey, dateStart, dateEnd, base: baseSubject })})`,
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
  }, [baseSubject, dateEnd, dateStart, makeApiErrorInfo, skuGroupKey])

  return {
    inboundSplitSource,
    inboundSplitSourceLoading,
    inboundSplitSourceError,
  }
}
