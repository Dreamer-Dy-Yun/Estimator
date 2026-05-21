import { useCallback, useEffect, useRef, useState, type MutableRefObject } from 'react'
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

type Args = {
  stashUuid: string
  companyUuid?: string
  dataReferencePeriodStart: string
  dataReferencePeriodEnd: string
  mountedRef: MutableRefObject<boolean>
  itemsRef: MutableRefObject<CandidateItemSummary[]>
  setItems: (next: CandidateItemStateUpdater) => void
  onRecommendedItemsAppended: AppendRecommendedItems
  refreshStashes: () => Promise<void>
  showToast: (message: string) => void
}

export function useCandidateRecommendations({
  stashUuid,
  companyUuid,
  dataReferencePeriodStart,
  dataReferencePeriodEnd,
  mountedRef,
  itemsRef,
  setItems,
  onRecommendedItemsAppended,
  refreshStashes,
  showToast,
}: Args) {
  const [recommendationItems, setRecommendationItems] = useState<CandidateReferenceItemSummary[]>([])
  const [recommendationLoading, setRecommendationLoading] = useState(false)
  const [recommendationError, setRecommendationError] = useState<string | null>(null)
  const requestSeqRef = useRef(0)
  const loadedPeriodKeyRef = useRef<string | null>(null)
  const recommendationItemsRef = useRef<CandidateReferenceItemSummary[]>([])
  const currentPeriodKey = stashUuid && dataReferencePeriodStart && dataReferencePeriodEnd
    ? `${companyUuid ?? 'all'}:${stashUuid}:${dataReferencePeriodStart}:${dataReferencePeriodEnd}`
    : null
  const currentPeriodKeyRef = useRef<string | null>(currentPeriodKey)

  useEffect(() => {
    currentPeriodKeyRef.current = currentPeriodKey
  }, [currentPeriodKey])

  const clearRecommendationItems = useCallback(() => {
    requestSeqRef.current += 1
    loadedPeriodKeyRef.current = null
    recommendationItemsRef.current = []
    setRecommendationItems([])
    setRecommendationLoading(false)
    setRecommendationError(null)
  }, [])

  const loadRecommendations = useCallback(async (force = false): Promise<CandidateReferenceItemSummary[]> => {
    const requestPeriodKey = currentPeriodKey
    if (!requestPeriodKey || !stashUuid || !dataReferencePeriodStart || !dataReferencePeriodEnd) return []
    if (!force && loadedPeriodKeyRef.current === requestPeriodKey) return recommendationItemsRef.current
    const seq = requestSeqRef.current + 1
    requestSeqRef.current = seq
    const isCurrentRecommendationRequest = () => (
      mountedRef.current
      && requestSeqRef.current === seq
      && currentPeriodKeyRef.current === requestPeriodKey
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
      loadedPeriodKeyRef.current = requestPeriodKey
      recommendationItemsRef.current = recommendationRows
      setRecommendationItems(recommendationRows)
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
  }, [companyUuid, currentPeriodKey, dataReferencePeriodEnd, dataReferencePeriodStart, itemsRef, mountedRef, setItems, stashUuid])

  const appendRecommendedItems = useCallback(async (rows: CandidateReferenceItemSummary[]) => {
    const skuGroupKeys = [...new Set(rows.map((row) => row.skuGroupKey))]
    if (!skuGroupKeys.length) return
    try {
      const result = await appendCandidateItems({ stashUuid, companyUuid, skuGroupKeys })
      if (!mountedRef.current) return
      onRecommendedItemsAppended(result.candidateItems, rows)
      const createdSkuUuidSet = new Set(result.candidateItems.map((item) => item.skuUuid))
      if (createdSkuUuidSet.size) {
        const nextRecommendations = recommendationItemsRef.current.filter((row) => !createdSkuUuidSet.has(row.uuid))
        recommendationItemsRef.current = nextRecommendations
        setRecommendationItems(nextRecommendations)
      }
      void refreshStashes().catch((err) => {
        if (!mountedRef.current) return
        showToast(getApiErrorDisplayMessage(err, '후보군 목록 최신화에 실패했습니다.'))
      })
      showToast(
        createdSkuUuidSet.size
          ? `추천 후보 ${createdSkuUuidSet.size}개를 후보군에 추가했습니다.`
          : '새로 추가할 추천 후보가 없습니다.',
      )
    } catch (err) {
      if (!mountedRef.current) return
      showToast(getApiErrorDisplayMessage(err, '추천 후보 추가에 실패했습니다.'))
      throw err
    }
  }, [
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
    recommendationError,
    clearRecommendationItems,
    loadRecommendations,
    appendRecommendedItems,
  }
}
