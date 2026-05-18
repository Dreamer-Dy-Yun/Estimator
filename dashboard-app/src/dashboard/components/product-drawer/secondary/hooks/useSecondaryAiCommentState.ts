import { useCallback, useMemo, useState } from 'react'
import type { SecondaryCompetitorChannel } from '../../../../../api'
import type { OrderSnapshotDocumentV1 } from '../../../../../snapshot/orderSnapshotTypes'
import type { CandidateItemPanelContext } from '../candidateActionCards'
import { useSecondaryAiComment } from './useSecondaryAiComment'

type Args = {
  pageName: string
  skuGroupKey: string
  periodStart: string
  periodEnd: string
  forecastMonths: number
  channel: SecondaryCompetitorChannel
  candidateItemContext: CandidateItemPanelContext | null
  prefillFromSnapshot: OrderSnapshotDocumentV1 | null
}

export function useSecondaryAiCommentState({
  pageName,
  skuGroupKey,
  periodStart,
  periodEnd,
  forecastMonths,
  channel,
  candidateItemContext,
  prefillFromSnapshot,
}: Args) {
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
  const { aiCommentLoading, aiCommentError } = useSecondaryAiComment({
    enabled: candidateItemContext == null || prefillFromSnapshot == null,
    pageName,
    params: aiCommentParams,
    onLoaded: handleAiCommentLoaded,
  })

  return {
    aiPrompt,
    aiComment,
    aiCommentLoading,
    aiCommentError,
    setAiPrompt,
    setAiComment,
  }
}
