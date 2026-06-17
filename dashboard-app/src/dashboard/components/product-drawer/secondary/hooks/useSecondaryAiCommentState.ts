import type { SecondaryAiCommentParams } from '../../../../../api'
import { useCallback, useMemo, useState } from 'react'
import type { ApiUnitErrorInfo } from '../../../../../types'
import type { ProductComparisonBaseSubjectRef, ProductComparisonTarget, SecondaryAiCommentResult } from '../../../../../api'
import type { CandidateItemPanelContext } from '../secondaryDrawerTypes'
import type { OrderSnapshotDocument } from '../../../../../snapshot/orderSnapshotTypes'
import type { SecondaryAiCommentView } from '../model/secondaryAiCommentModel'
import { useSecondaryAiComment } from './useSecondaryAiComment'

export type Args = {
  pageName: string
  skuGroupKey: string
  periodStart: string
  periodEnd: string
  forecastMonths: number
  baseSubject: ProductComparisonBaseSubjectRef
  comparisonTarget: ProductComparisonTarget
  candidateItemContext: CandidateItemPanelContext | null
}

export type ReturnValue = {
  aiComment: SecondaryAiCommentView
  aiCommentLoading: boolean
  aiCommentError: ApiUnitErrorInfo | null
  requestAiComment: (snapshotForAiComment?: OrderSnapshotDocument | null) => void
  setAiComment: (value: SecondaryAiCommentView) => void
}

const EMPTY_AI_COMMENT: SecondaryAiCommentView = { prompt: '', answer: '', generatedAt: null }

export function useSecondaryAiCommentState({
  pageName,
  skuGroupKey,
  periodStart,
  periodEnd,
  forecastMonths,
  baseSubject,
  comparisonTarget,
  candidateItemContext,
}: Args): ReturnValue {
  const [aiComment, setAiComment]: [SecondaryAiCommentView, React.Dispatch<React.SetStateAction<SecondaryAiCommentView>>] = useState<SecondaryAiCommentView>(EMPTY_AI_COMMENT)
  const aiCommentParams: SecondaryAiCommentParams = useMemo(() : SecondaryAiCommentParams => ({
    skuGroupKey,
    periodStart,
    periodEnd,
    forecastMonths,
    base: baseSubject,
    comparison: comparisonTarget,
    candidateItemUuid: candidateItemContext?.itemUuid ?? null,
  }), [
    baseSubject,
    candidateItemContext?.itemUuid,
    comparisonTarget,
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

  const requestAiComment: (snapshotForAiComment?: OrderSnapshotDocument | null) => void = useCallback((snapshotForAiComment?: OrderSnapshotDocument | null) : void => {
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
