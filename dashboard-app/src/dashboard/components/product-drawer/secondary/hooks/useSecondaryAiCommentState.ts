import { useCallback, useMemo, useState } from 'react'
import type { ApiUnitErrorInfo } from '../../../../../types'
import type { SecondaryAiCommentResult, SecondaryCompetitorChannel } from '../../../../../api'
import type { CandidateItemPanelContext } from '../secondaryDrawerTypes'
import type { OrderSnapshotAiCommentV2, OrderSnapshotDocumentV2 } from '../../../../../snapshot/orderSnapshotTypes'
import { useSecondaryAiComment } from './useSecondaryAiComment'

type Args = {
  pageName: string
  skuGroupKey: string
  periodStart: string
  periodEnd: string
  forecastMonths: number
  companyUuid?: string
  channel: SecondaryCompetitorChannel
  candidateItemContext: CandidateItemPanelContext | null
}

type ReturnValue = {
  aiComment: OrderSnapshotAiCommentV2
  aiCommentLoading: boolean
  aiCommentError: ApiUnitErrorInfo | null
  requestAiComment: (snapshotForAiComment?: OrderSnapshotDocumentV2 | null) => void
  setAiComment: (value: OrderSnapshotAiCommentV2) => void
}

const EMPTY_AI_COMMENT: OrderSnapshotAiCommentV2 = { prompt: '', answer: '', generatedAt: null }

export function useSecondaryAiCommentState({
  pageName,
  skuGroupKey,
  periodStart,
  periodEnd,
  forecastMonths,
  companyUuid,
  channel,
  candidateItemContext,
}: Args): ReturnValue {
  const [aiComment, setAiComment] = useState<OrderSnapshotAiCommentV2>(EMPTY_AI_COMMENT)
  const aiCommentParams = useMemo(() => ({
    skuGroupKey,
    periodStart,
    periodEnd,
    forecastMonths,
    companyUuid,
    competitorChannelId: channel.id,
    candidateItemUuid: candidateItemContext?.itemUuid ?? null,
  }), [
    candidateItemContext?.itemUuid,
    channel.id,
    companyUuid,
    forecastMonths,
    periodEnd,
    periodStart,
    skuGroupKey,
  ])
  const handleAiCommentLoaded = useCallback((result: SecondaryAiCommentResult) => {
    setAiComment({
      prompt: result.prompt,
      answer: result.answer,
      generatedAt: result.generatedAt,
    })
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
    aiComment,
    aiCommentLoading,
    aiCommentError,
    requestAiComment,
    setAiComment,
  }
}
