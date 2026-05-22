import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type MutableRefObject } from 'react'
import {
  appendCandidateItems,
  getApiErrorDisplayMessage,
  getCandidateRecommendations,
  type CandidateItemSummary,
  type CandidateReferenceItemSummary,
  type CandidateStashItemSummary,
} from '../../../api'
import {
  applyRecommendationInsightsToCandidateItems,
  markCandidateItemInsightsFailed,
} from './candidateItemMetricModel'

const RECOMMENDATION_PAGE_SIZE = 100

type CandidateItemStateUpdater =
  | CandidateItemSummary[]
  | ((current: CandidateItemSummary[]) => CandidateItemSummary[])

type AppendRecommendedItems = (
  candidateItems: CandidateStashItemSummary[],
  recommendations: CandidateReferenceItemSummary[],
) => void

export type AppendRecommendedItemsResult =
  | { status: 'applied'; appendedCount: number }
  | { status: 'stale' }
  | { status: 'empty' }

type Args = {
  stashUuid: string
  companyUuid?: string
  dataReferencePeriodStart: string
  dataReferencePeriodEnd: string
  itemMembershipKey: string
  itemSkuUuids: string[]
  mountedRef: MutableRefObject<boolean>
  itemsRef: MutableRefObject<CandidateItemSummary[]>
  setItems: (next: CandidateItemStateUpdater) => void
  onRecommendedItemsAppended: AppendRecommendedItems
  refreshStashes: () => Promise<void>
  showToast: (message: string) => void
}

const COMPANY_REQUIRED_MESSAGE = '추천 후보 추가는 회사 선택이 필요합니다.'

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
}: Args) {
  const [recommendationSourceItems, setRecommendationSourceItems] = useState<CandidateReferenceItemSummary[]>([])
  const [loadedScopeKey, setLoadedScopeKey] = useState<string | null>(null)
  const [recommendationLoading, setRecommendationLoading] = useState(false)
  const [recommendationAppendBusy, setRecommendationAppendBusy] = useState(false)
  const [recommendationError, setRecommendationError] = useState<string | null>(null)
  const requestSeqRef = useRef(0)
  const appendSeqRef = useRef(0)
  const appendBusyRef = useRef(false)
  const currentScopeKeyRef = useRef<string | null>(null)
  const currentRecommendationKeyRef = useRef<string | null>(null)
  const recommendationItemsRef = useRef<CandidateReferenceItemSummary[]>([])
  const recommendationSourceItemsRef = useRef<CandidateReferenceItemSummary[]>([])
  const currentPeriodKey = stashUuid && dataReferencePeriodStart && dataReferencePeriodEnd
    ? `${companyUuid ?? 'all'}:${stashUuid}:${dataReferencePeriodStart}:${dataReferencePeriodEnd}`
    : null
  const currentRecommendationKey = currentPeriodKey ? `${currentPeriodKey}:${itemMembershipKey}` : null

  useLayoutEffect(() => {
    currentScopeKeyRef.current = currentPeriodKey
    currentRecommendationKeyRef.current = currentRecommendationKey
  }, [currentPeriodKey, currentRecommendationKey])

  const recommendationItems = useMemo(() => {
    if (!currentPeriodKey || loadedScopeKey !== currentPeriodKey) return []
    const candidateSkuUuidSet = new Set(itemSkuUuids)
    return recommendationSourceItems.filter((row) => !candidateSkuUuidSet.has(row.uuid))
  }, [currentPeriodKey, itemSkuUuids, loadedScopeKey, recommendationSourceItems])

  useEffect(() => {
    recommendationItemsRef.current = recommendationItems
  }, [recommendationItems])

  const clearRecommendationItems = useCallback(() => {
    requestSeqRef.current += 1
    recommendationSourceItemsRef.current = []
    recommendationItemsRef.current = []
    setLoadedScopeKey(null)
    setRecommendationSourceItems([])
    setRecommendationLoading(false)
    setRecommendationError(null)
  }, [])

  const loadRecommendations = useCallback(async (force = false): Promise<CandidateReferenceItemSummary[]> => {
    const requestScopeKey = currentPeriodKey
    const requestRecommendationKey = currentRecommendationKey
    if (!requestScopeKey || !requestRecommendationKey || !stashUuid || !dataReferencePeriodStart || !dataReferencePeriodEnd) {
      return []
    }
    if (!force && loadedScopeKey === requestScopeKey) return recommendationItemsRef.current
    const seq = requestSeqRef.current + 1
    requestSeqRef.current = seq
    const isCurrentRecommendationRequest = () => (
      mountedRef.current
      && requestSeqRef.current === seq
      && currentScopeKeyRef.current === requestScopeKey
      && currentRecommendationKeyRef.current === requestRecommendationKey
    )
    setRecommendationLoading(true)
    setRecommendationError(null)
    try {
      const allRecommendations: CandidateReferenceItemSummary[] = []
      let cursor: string | undefined
      do {
        const result = await getCandidateRecommendations({
          stashUuid,
          companyUuid,
          dataReferencePeriodStart,
          dataReferencePeriodEnd,
          limit: RECOMMENDATION_PAGE_SIZE,
          cursor,
        })
        if (!isCurrentRecommendationRequest()) return recommendationItemsRef.current
        allRecommendations.push(...result.recommendations)
        cursor = result.nextCursor ?? undefined
      } while (cursor)
      if (!isCurrentRecommendationRequest()) return recommendationItemsRef.current
      const candidateSkuUuidSet = new Set(itemsRef.current.map((item) => item.skuUuid))
      const recommendationRows = allRecommendations.filter((row) => !candidateSkuUuidSet.has(row.uuid))
      setItems((current) => applyRecommendationInsightsToCandidateItems(current, allRecommendations))
      recommendationSourceItemsRef.current = allRecommendations
      recommendationItemsRef.current = recommendationRows
      setLoadedScopeKey(requestScopeKey)
      setRecommendationSourceItems(allRecommendations)
      setRecommendationLoading(false)
      return recommendationRows
    } catch (err) {
      if (!isCurrentRecommendationRequest()) return recommendationItemsRef.current
      const message = getApiErrorDisplayMessage(err, '추천 후보 조회에 실패했습니다.')
      setRecommendationError(message)
      setItems(markCandidateItemInsightsFailed)
      setRecommendationLoading(false)
      return recommendationItemsRef.current
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
    setItems,
    stashUuid,
  ])

  const appendRecommendedItems = useCallback(async (
    rows: CandidateReferenceItemSummary[],
  ): Promise<AppendRecommendedItemsResult> => {
    const appendScopeKey = currentPeriodKey
    const appendRecommendationKey = currentRecommendationKey
    const skuGroupKeys = [...new Set(rows.map((row) => row.skuGroupKey))]
    if (!skuGroupKeys.length) return { status: 'empty' }
    if (appendBusyRef.current) return { status: 'stale' }
    if (!appendScopeKey || !appendRecommendationKey || !stashUuid || !dataReferencePeriodStart || !dataReferencePeriodEnd) {
      showToast('추천 후보 추가 기준 기간을 확인할 수 없습니다.')
      throw new Error('추천 후보 추가 기준 기간을 확인할 수 없습니다.')
    }
    if (!companyUuid) {
      showToast(COMPANY_REQUIRED_MESSAGE)
      throw new Error(COMPANY_REQUIRED_MESSAGE)
    }
    const appendSeq = appendSeqRef.current + 1
    appendSeqRef.current = appendSeq
    appendBusyRef.current = true
    setRecommendationAppendBusy(true)
    const canReflectAppend = () => (
      mountedRef.current
      && appendSeqRef.current === appendSeq
      && currentScopeKeyRef.current === appendScopeKey
      && currentRecommendationKeyRef.current === appendRecommendationKey
    )
    try {
      const result = await appendCandidateItems({ stashUuid, companyUuid, skuGroupKeys })
      if (!canReflectAppend()) return { status: 'stale' }
      onRecommendedItemsAppended(result.candidateItems, rows)
      const createdSkuUuidSet = new Set(result.candidateItems.map((item) => item.skuUuid))
      if (createdSkuUuidSet.size) {
        const nextSourceItems = recommendationSourceItemsRef.current.filter((row) => !createdSkuUuidSet.has(row.uuid))
        recommendationSourceItemsRef.current = nextSourceItems
        setRecommendationSourceItems(nextSourceItems)
      } else if (skuGroupKeys.length) {
        const requestedSkuGroupKeySet = new Set(skuGroupKeys)
        const nextSourceItems = recommendationSourceItemsRef.current.filter((row) => (
          !requestedSkuGroupKeySet.has(row.skuGroupKey)
        ))
        recommendationSourceItemsRef.current = nextSourceItems
        setRecommendationSourceItems(nextSourceItems)
      }
      void refreshStashes().catch((err) => {
        if (!canReflectAppend()) return
        showToast(getApiErrorDisplayMessage(err, '후보군 목록 최신화에 실패했습니다.'))
      })
      showToast(
        createdSkuUuidSet.size
          ? `추천 후보 ${createdSkuUuidSet.size}개를 후보군에 추가했습니다.`
          : '새로 추가할 추천 후보가 없습니다.',
      )
      return createdSkuUuidSet.size
        ? { status: 'applied', appendedCount: createdSkuUuidSet.size }
        : { status: 'empty' }
    } catch (err) {
      if (!canReflectAppend()) return { status: 'stale' }
      showToast(getApiErrorDisplayMessage(err, '추천 후보 추가에 실패했습니다.'))
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
