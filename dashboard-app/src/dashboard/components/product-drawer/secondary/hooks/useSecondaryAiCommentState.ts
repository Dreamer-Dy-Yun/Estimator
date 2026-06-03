import type { SecondaryAiCommentParams } from '../../../../../api'
import { useCallback, useMemo, useState } from 'react'
import type { ApiUnitErrorInfo } from '../../../../../types'
import type { SecondaryAiCommentResult, SecondaryCompetitorChannel } from '../../../../../api'
import type { CandidateItemPanelContext } from '../secondaryDrawerTypes'
import type { OrderSnapshotAiCommentV2, OrderSnapshotDocumentV2 } from '../../../../../snapshot/orderSnapshotTypes'
import { useSecondaryAiComment } from './useSecondaryAiComment'

export type Args = {
  pageName: string
  skuGroupKey: string
  periodStart: string
  periodEnd: string
  forecastMonths: number
  companyUuid?: string
  channel: SecondaryCompetitorChannel
  candidateItemContext: CandidateItemPanelContext | null
}

export type ReturnValue = {
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
  const [aiComment, setAiComment]: [OrderSnapshotAiCommentV2, React.Dispatch<React.SetStateAction<OrderSnapshotAiCommentV2>>] = useState<OrderSnapshotAiCommentV2>(EMPTY_AI_COMMENT)
  const aiCommentParams: { skuGroupKey: string; periodStart: string; periodEnd: string; forecastMonths: number; companyUuid: string | undefined; competitorChannelId: string; candidateItemUuid: string | null; } = useMemo(() : { skuGroupKey: string; periodStart: string; periodEnd: string; forecastMonths: number; companyUuid: string | undefined; competitorChannelId: string; candidateItemUuid: string | null; } => ({
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
  const handleAiCommentLoaded: (result: SecondaryAiCommentResult) => void = useCallback((result: SecondaryAiCommentResult) : void => {
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
  }: { aiCommentLoading: boolean; aiCommentError: ApiUnitErrorInfo | null; requestAiComment: (nextParams?: SecondaryAiCommentParams) => void; } = useSecondaryAiComment({
    autoFetchEnabled: false,
    pageName,
    params: aiCommentParams,
    onLoaded: handleAiCommentLoaded,
  })

  const requestAiComment: (snapshotForAiComment?: OrderSnapshotDocumentV2 | null) => void = useCallback((snapshotForAiComment?: OrderSnapshotDocumentV2 | null) : void => {
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
