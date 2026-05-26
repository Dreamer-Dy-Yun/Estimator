import { useCallback, useMemo, useState } from 'react'
import type { ApiUnitErrorInfo } from '../../../../../types'
import type { SecondaryCompetitorChannel } from '../../../../../api'
import type { CandidateItemPanelContext } from '../candidateActionCards'
import type { OrderSnapshotDocumentV2 } from '../../../../../snapshot/orderSnapshotTypes'
import { useSecondaryAiComment } from './useSecondaryAiComment'

type Args = {
  pageName: string
  skuGroupKey: string
  periodStart: string
  periodEnd: string
  forecastMonths: number
  channel: SecondaryCompetitorChannel
  candidateItemContext: CandidateItemPanelContext | null
}

type ReturnValue = {
  aiPrompt: string
  aiComment: string
  aiCommentLoading: boolean
  aiCommentError: ApiUnitErrorInfo | null
  requestAiComment: (snapshotForAiComment?: OrderSnapshotDocumentV2 | null) => void
  setAiPrompt: (value: string) => void
  setAiComment: (value: string) => void
}

export function useSecondaryAiCommentState({
  pageName,
  skuGroupKey,
  periodStart,
  periodEnd,
  forecastMonths,
  channel,
  candidateItemContext,
}: Args): ReturnValue {
  const [aiPrompt, setAiPrompt] = useState('')
  const [aiComment, setAiComment] = useState('')
  const aiCommentParams = useMemo(() => ({
    skuGroupKey,
    periodStart,
    periodEnd,
    forecastMonths,
    competitorChannelId: channel.id,
    candidateItemUuid: candidateItemContext?.itemUuid ?? null,
  }), [
    candidateItemContext?.itemUuid,
    channel.id,
    forecastMonths,
    periodEnd,
    periodStart,
    skuGroupKey,
  ])
  const handleAiCommentLoaded = useCallback((result: { llmPrompt: string; llmAnswer: string }) => {
    setAiPrompt(result.llmPrompt)
    setAiComment(result.llmAnswer)
  }, [])
  const {
    aiCommentLoading,
    aiCommentError,
    requestAiComment: request,
  } = useSecondaryAiComment({
    autoFetchEnabled: false,
    pageName,
    params: aiCommentParams,
    onLoaded: handleAiCommentLoaded,
  })

  const requestAiComment = useCallback((snapshotForAiComment?: OrderSnapshotDocumentV2 | null) => {
    request({
      ...aiCommentParams,
      ...(snapshotForAiComment == null ? {} : { snapshotForAiComment }),
    })
  }, [aiCommentParams, request])

  return {
    aiPrompt,
    aiComment,
    aiCommentLoading,
    aiCommentError,
    requestAiComment,
    setAiPrompt,
    setAiComment,
  }
}

