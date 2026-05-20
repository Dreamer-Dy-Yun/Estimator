import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { dashboardApi, type SecondaryAiCommentParams } from '../../../../../api'
import type { ApiUnitErrorInfo } from '../../../../../types'
import { makeApiErrorInfo } from '../../apiErrorInfo'

type Args = {
  autoFetchEnabled: boolean
  pageName: string
  params: SecondaryAiCommentParams
  onLoaded: (result: { llmPrompt: string; llmAnswer: string }) => void
}

export function useSecondaryAiComment({
  autoFetchEnabled,
  pageName,
  params,
  onLoaded,
}: Args) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<ApiUnitErrorInfo | null>(null)
  const onLoadedRef = useRef(onLoaded)
  const requestSeq = useRef(0)

  useEffect(() => {
    onLoadedRef.current = onLoaded
  }, [onLoaded])

  const requestKey = useMemo(
    () => [
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

  const requestAiComment = useCallback((nextParams?: SecondaryAiCommentParams) => {
    void (async () => {
      const currentRequest = requestSeq.current + 1
      requestSeq.current = currentRequest
      setLoading(true)
      setError(null)
      const requestParams = nextParams ?? params

      try {
        const result = await dashboardApi.getSecondaryAiComment(requestParams)
        if (requestSeq.current !== currentRequest) return
        onLoadedRef.current({
          llmPrompt: result.llmPrompt,
          llmAnswer: result.llmAnswer,
        })
        setError(null)
      } catch (err) {
        if (requestSeq.current !== currentRequest) return
        setError(makeApiErrorInfo(pageName, `getSecondaryAiComment(${JSON.stringify(requestParams)})`, err))
      } finally {
        if (requestSeq.current !== currentRequest) return
        setLoading(false)
      }
    })()
  }, [params, pageName])

  useEffect(() => {
    if (!autoFetchEnabled) {
      setLoading(false)
      setError(null)
      return
    }

    requestAiComment(params)

    return () => {
      requestSeq.current += 1
    }
  }, [autoFetchEnabled, params, requestKey, requestAiComment])

  return {
    aiCommentLoading: loading,
    aiCommentError: error,
    requestAiComment,
  }
}
