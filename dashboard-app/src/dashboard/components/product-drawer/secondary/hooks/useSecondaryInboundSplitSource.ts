import { useEffect, useRef, useState } from 'react'
import { dashboardApi } from '../../../../../api'
import type { ProductComparisonBaseSubjectRef, SecondaryInboundSplitSource, SecondaryInboundSplitSourceParams } from '../../../../../api/types'
import type { ApiUnitErrorInfo } from '../../../../../types'

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
