import type { AppendCandidateItemsResponse, CandidateItemSummary, CandidateRecommendationResult, CandidateStashItemSummary } from '../../../api'
import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react'
import {
  appendCandidateItems,
  getApiErrorDisplayMessage,
  getCandidateRecommendations,
  type CandidateReferenceItemSummary,
} from '../../../api'
import {
  applyRecommendationInsightsToCandidateItems,
  markCandidateItemInsightsFailed,
} from './candidateItemMetricModel'
import type {
  AppendRecommendedItems,
  AppendRecommendedItemsResult,
  CandidateItemsRef,
  CandidateMountedRef,
  CandidateSetItems,
  CandidateShowToast,
} from './candidateStashDetailTypes'

const RECOMMENDATION_PAGE_SIZE = 100 as const

export type Args = {
  stashUuid: string
  companyUuid?: string
  dataReferencePeriodStart: string
  dataReferencePeriodEnd: string
  itemMembershipKey: string
  itemSkuUuids: string[]
  mountedRef: CandidateMountedRef
  itemsRef: CandidateItemsRef
  setItems: CandidateSetItems
  onRecommendedItemsAppended: AppendRecommendedItems
  refreshStashes: () => Promise<void>
  showToast: CandidateShowToast
}

const COMPANY_REQUIRED_MESSAGE = '추천 후보 추가는 회사 선택이 필요합니다.' as const

export type RecommendationScopeKey = {
  period: string | null
  recommendation: string | null
}

export function useCandidateRecommendations({
  stashUuid,
  companyUuid,
  dataReferencePeriodStart,
  dataReferencePeriodEnd,
  itemMembershipKey,
  itemSkuUuids,
  mountedRef,
  itemsRef,
  setItems,
  onRecommendedItemsAppended,
  refreshStashes,
  showToast,
}: Args) : { recommendationItems: CandidateReferenceItemSummary[]; recommendationLoading: boolean; recommendationAppendBusy: boolean; recommendationError: string | null; clearRecommendationItems: () => void; loadRecommendations: (force?: boolean) => Promise<CandidateReferenceItemSummary[]>; appendRecommendedItems: (rows: CandidateReferenceItemSummary[]) => Promise<AppendRecommendedItemsResult>; } {
  const [recommendationSourceItems, setRecommendationSourceItems]: [CandidateReferenceItemSummary[], React.Dispatch<React.SetStateAction<CandidateReferenceItemSummary[]>>] = useState<CandidateReferenceItemSummary[]>([])
  const [loadedScopeKey, setLoadedScopeKey]: [string | null, React.Dispatch<React.SetStateAction<string | null>>] = useState<string | null>(null)
  const [recommendationLoading, setRecommendationLoading]: [boolean, React.Dispatch<React.SetStateAction<boolean>>] = useState(false)
  const [recommendationAppendBusy, setRecommendationAppendBusy]: [boolean, React.Dispatch<React.SetStateAction<boolean>>] = useState(false)
  const [recommendationError, setRecommendationError]: [string | null, React.Dispatch<React.SetStateAction<string | null>>] = useState<string | null>(null)
  const requestSeqRef: React.RefObject<number> = useRef(0)
  const appendSeqRef: React.RefObject<number> = useRef(0)
  const appendBusyRef: React.RefObject<boolean> = useRef(false)
  const currentKeyRef: React.RefObject<RecommendationScopeKey> = useRef<RecommendationScopeKey>({ period: null, recommendation: null })
  const currentPeriodKey: string | null = stashUuid && dataReferencePeriodStart && dataReferencePeriodEnd
    ? `${companyUuid ?? 'all'}:${stashUuid}:${dataReferencePeriodStart}:${dataReferencePeriodEnd}`
    : null
  const currentRecommendationKey: string | null = currentPeriodKey ? `${currentPeriodKey}:${itemMembershipKey}` : null

  useLayoutEffect(() : void => {
    currentKeyRef.current = { period: currentPeriodKey, recommendation: currentRecommendationKey }
  }, [currentPeriodKey, currentRecommendationKey])

  const recommendationItems: CandidateReferenceItemSummary[] = useMemo(() : CandidateReferenceItemSummary[] => {
    if (!currentPeriodKey || loadedScopeKey !== currentPeriodKey) return []
    const candidateSkuUuidSet: Set<string> = new Set(itemSkuUuids)
    return recommendationSourceItems.filter((row: CandidateReferenceItemSummary) : boolean => !candidateSkuUuidSet.has(row.uuid))
  }, [currentPeriodKey, itemSkuUuids, loadedScopeKey, recommendationSourceItems])

  const clearRecommendationItems: () => void = useCallback(() : void => {
    requestSeqRef.current += 1
    setLoadedScopeKey(null)
    setRecommendationSourceItems([])
    setRecommendationLoading(false)
    setRecommendationError(null)
  }, [])

  const loadRecommendations: (force?: boolean) => Promise<CandidateReferenceItemSummary[]> = useCallback(async (force: boolean = false): Promise<CandidateReferenceItemSummary[]> => {
    const requestScopeKey: string | null = currentPeriodKey
    const requestRecommendationKey: string | null = currentRecommendationKey
    if (!requestScopeKey || !requestRecommendationKey || !stashUuid || !dataReferencePeriodStart || !dataReferencePeriodEnd) {
      return []
    }
    if (!force && loadedScopeKey === requestScopeKey) return recommendationItems
    const seq: number = requestSeqRef.current + 1
    requestSeqRef.current = seq
    const isCurrentRecommendationRequest: () => boolean = () : boolean => (
      mountedRef.current
      && requestSeqRef.current === seq
      && currentKeyRef.current.period === requestScopeKey
      && currentKeyRef.current.recommendation === requestRecommendationKey
    )
    setRecommendationLoading(true)
    setRecommendationError(null)
    try {
      const allRecommendations: CandidateReferenceItemSummary[] = []
      let cursor: string | undefined
      do {
        const result: CandidateRecommendationResult = await getCandidateRecommendations({
          stashUuid,
          companyUuid,
          dataReferencePeriodStart,
          dataReferencePeriodEnd,
          limit: RECOMMENDATION_PAGE_SIZE,
          cursor,
        })
        if (!isCurrentRecommendationRequest()) return recommendationItems
        allRecommendations.push(...result.recommendations)
        cursor = result.nextCursor ?? undefined
      } while (cursor)
      if (!isCurrentRecommendationRequest()) return recommendationItems
      const candidateSkuUuidSet: Set<string> = new Set(itemsRef.current.map((item: CandidateItemSummary) : string => item.skuUuid))
      const recommendationRows: CandidateReferenceItemSummary[] = allRecommendations.filter((row: CandidateReferenceItemSummary) : boolean => !candidateSkuUuidSet.has(row.uuid))
      setItems((current: CandidateItemSummary[]) : CandidateItemSummary[] => applyRecommendationInsightsToCandidateItems(current, allRecommendations))
      setLoadedScopeKey(requestScopeKey)
      setRecommendationSourceItems(allRecommendations)
      setRecommendationLoading(false)
      return recommendationRows
    } catch (err) {
      if (!isCurrentRecommendationRequest()) return recommendationItems
      const message: string = getApiErrorDisplayMessage(err, '추천 후보 조회에 실패했습니다.')
      setRecommendationError(message)
      setItems(markCandidateItemInsightsFailed)
      setRecommendationLoading(false)
      return recommendationItems
    }
  }, [
    companyUuid,
    currentPeriodKey,
    currentRecommendationKey,
    dataReferencePeriodEnd,
    dataReferencePeriodStart,
    itemsRef,
    loadedScopeKey,
    mountedRef,
    recommendationItems,
    setItems,
    stashUuid,
  ])

  const appendRecommendedItems: (rows: CandidateReferenceItemSummary[]) => Promise<AppendRecommendedItemsResult> = useCallback(async (
    rows: CandidateReferenceItemSummary[],
  ): Promise<AppendRecommendedItemsResult> => {
    const appendScopeKey: string | null = currentPeriodKey
    const appendRecommendationKey: string | null = currentRecommendationKey
    const skuGroupKeys: string[] = [...new Set(rows.map((row: CandidateReferenceItemSummary) : string => row.skuGroupKey))]
    if (!skuGroupKeys.length) return { status: 'empty-selection' }
    if (appendBusyRef.current) return { status: 'stale' }
    if (!appendScopeKey || !appendRecommendationKey || !stashUuid || !dataReferencePeriodStart || !dataReferencePeriodEnd) {
      showToast('추천 후보 추가 기준 기간을 확인할 수 없습니다.', { variant: 'error' })
      throw new Error('추천 후보 추가 기준 기간을 확인할 수 없습니다.')
    }
    if (!companyUuid) {
      showToast(COMPANY_REQUIRED_MESSAGE, { variant: 'error' })
      throw new Error(COMPANY_REQUIRED_MESSAGE)
    }
    const appendSeq: number = appendSeqRef.current + 1
    appendSeqRef.current = appendSeq
    appendBusyRef.current = true
    setRecommendationAppendBusy(true)
    const canReflectAppend: () => boolean = () : boolean => (
      mountedRef.current
      && appendSeqRef.current === appendSeq
      && currentKeyRef.current.period === appendScopeKey
      && currentKeyRef.current.recommendation === appendRecommendationKey
    )
    try {
      const result: AppendCandidateItemsResponse = await appendCandidateItems({ stashUuid, companyUuid, skuGroupKeys })
      if (!canReflectAppend()) return { status: 'stale' }
      if (!result.candidateItems.length) return { status: 'no-op' }
      const selectedRecommendationSkuUuidSet: Set<string> = new Set(rows.map((row: CandidateReferenceItemSummary) : string => row.uuid))
      if (result.candidateItems.some((item: CandidateStashItemSummary) : boolean => !selectedRecommendationSkuUuidSet.has(item.skuUuid))) {
        throw new Error('Recommendation append response does not match selected recommendations.')
      }
      const createdSkuUuidSet: Set<string> = new Set(result.candidateItems.map((item: CandidateStashItemSummary) : string => item.skuUuid))
      if (!createdSkuUuidSet.size) return { status: 'no-op' }
      const appendedCount: number = onRecommendedItemsAppended(result.candidateItems, rows)
      if (appendedCount <= 0) return { status: 'no-op' }
      setRecommendationSourceItems((current: CandidateReferenceItemSummary[]) : CandidateReferenceItemSummary[] => (
        current.filter((row: CandidateReferenceItemSummary) : boolean => !createdSkuUuidSet.has(row.uuid))
      ))
      void refreshStashes().catch((err: unknown) : void => {
        if (!canReflectAppend()) return
        showToast(getApiErrorDisplayMessage(err, '후보군 목록 최신화에 실패했습니다.'), { variant: 'warning' })
      })
      showToast(`추천 후보 ${appendedCount}개를 후보군에 추가했습니다.`)
      return { status: 'applied', appendedCount }
    } catch (err) {
      if (!canReflectAppend()) return { status: 'stale' }
      showToast(getApiErrorDisplayMessage(err, '추천 후보 추가에 실패했습니다.'), { variant: 'error' })
      throw err
    } finally {
      if (appendSeqRef.current === appendSeq) {
        appendBusyRef.current = false
        if (mountedRef.current) setRecommendationAppendBusy(false)
      }
    }
  }, [
    currentPeriodKey,
    currentRecommendationKey,
    dataReferencePeriodEnd,
    dataReferencePeriodStart,
    mountedRef,
    onRecommendedItemsAppended,
    refreshStashes,
    showToast,
    stashUuid,
    companyUuid,
  ])

  return {
    recommendationItems,
    recommendationLoading,
    recommendationAppendBusy,
    recommendationError,
    clearRecommendationItems,
    loadRecommendations,
    appendRecommendedItems,
  }
}
