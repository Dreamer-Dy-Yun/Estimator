import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { dashboardApi, type SecondaryAiCommentParams, type SecondaryAiCommentResult } from '../../../../../api'
import type { ApiUnitErrorInfo } from '../../../../../types'
import { makeApiErrorInfo } from '../../apiErrorInfo'

export type Args = {
  autoFetchEnabled: boolean
  pageName: string
  params: SecondaryAiCommentParams
  onLoaded: (result: SecondaryAiCommentResult) => void
}

export function useSecondaryAiComment({
  autoFetchEnabled,
  pageName,
  params,
  onLoaded,
}: Args) : { aiCommentLoading: boolean; aiCommentError: ApiUnitErrorInfo | null; requestAiComment: (nextParams?: SecondaryAiCommentParams) => void; } {
  const [loading, setLoading]: [boolean, React.Dispatch<React.SetStateAction<boolean>>] = useState(false)
  const [error, setError]: [ApiUnitErrorInfo | null, React.Dispatch<React.SetStateAction<ApiUnitErrorInfo | null>>] = useState<ApiUnitErrorInfo | null>(null)
  const onLoadedRef: React.RefObject<(result: SecondaryAiCommentResult) => void> = useRef(onLoaded)
  const requestSeq: React.RefObject<number> = useRef(0)

  useEffect(() : void => {
    onLoadedRef.current = onLoaded
  }, [onLoaded])

  const requestKey: string = useMemo(
    () : string => [
      params.skuGroupKey,
      params.periodStart,
      params.periodEnd,
      params.forecastMonths,
      params.competitorChannelId,
      params.candidateItemUuid ?? '',
    ].join('|'),
    [
      params.candidateItemUuid,
      params.competitorChannelId,
      params.forecastMonths,
      params.periodEnd,
      params.periodStart,
      params.skuGroupKey,
    ],
  )

  const requestAiComment: (nextParams?: SecondaryAiCommentParams) => void = useCallback((nextParams?: SecondaryAiCommentParams) : void => {
    void (async () : Promise<void> => {
      const currentRequest: number = requestSeq.current + 1
      requestSeq.current = currentRequest
      setLoading(true)
      setError(null)
      const requestParams: SecondaryAiCommentParams = nextParams ?? params

      try {
        const result: SecondaryAiCommentResult = await dashboardApi.getSecondaryAiComment(requestParams)
        if (requestSeq.current !== currentRequest) return
        onLoadedRef.current(result)
        setError(null)
      } catch (err) {
        if (requestSeq.current !== currentRequest) return
        setError(makeApiErrorInfo(pageName, `getSecondaryAiComment(${JSON.stringify(requestParams)})`, err))
      } finally {
        if (requestSeq.current === currentRequest) {
          setLoading(false)
        }
      }
    })()
  }, [params, pageName])

  useEffect(() : (() => void) | undefined => {
    if (!autoFetchEnabled) {
      const currentRequest: number = requestSeq.current + 1
      requestSeq.current = currentRequest
      queueMicrotask(() : void => {
        if (requestSeq.current !== currentRequest) return
        setLoading(false)
        setError(null)
      })
      return
    }

    requestAiComment(params)

    return () : void => {
      requestSeq.current += 1
    }
  }, [autoFetchEnabled, params, requestKey, requestAiComment])

  return {
    aiCommentLoading: loading,
    aiCommentError: error,
    requestAiComment,
  }
}
