import { useEffect, useMemo, useRef, useState } from 'react'
import { dashboardApi, type SecondaryAiCommentParams } from '../../../../../api'
import type { ApiUnitErrorInfo } from '../../../../../types'
import { makeApiErrorInfo } from '../../apiErrorInfo'

type Args = {
  enabled: boolean
  pageName: string
  params: SecondaryAiCommentParams
  onLoaded: (result: { llmPrompt: string; llmAnswer: string }) => void
}

export function useSecondaryAiComment({
  enabled,
  pageName,
  params,
  onLoaded,
}: Args) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<ApiUnitErrorInfo | null>(null)
  const onLoadedRef = useRef(onLoaded)

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

  useEffect(() => {
    let alive = true
    queueMicrotask(() => {
      if (!alive) return
      if (!enabled) {
        setLoading(false)
        setError(null)
        return
      }
      setLoading(true)
      setError(null)
      void (async () => {
        try {
          const result = await dashboardApi.getSecondaryAiComment(params)
          if (!alive) return
          onLoadedRef.current({
            llmPrompt: result.llmPrompt,
            llmAnswer: result.llmAnswer,
          })
          setError(null)
        } catch (err) {
          if (!alive) return
          setError(makeApiErrorInfo(pageName, `getSecondaryAiComment(${JSON.stringify(params)})`, err))
        } finally {
          if (alive) setLoading(false)
        }
      })()
    })
    return () => {
      alive = false
    }
  }, [enabled, pageName, params, requestKey])

  return {
    aiCommentLoading: loading,
    aiCommentError: error,
  }
}
