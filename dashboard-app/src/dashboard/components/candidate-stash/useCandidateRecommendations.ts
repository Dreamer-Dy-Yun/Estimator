import { useCallback, useRef, useState, type MutableRefObject } from 'react'
import {
  appendCandidateItems,
  getCandidateRecommendations,
  type CandidateItemSummary,
  type CandidateReferenceItemSummary,
} from '../../../api'
import { applyRecommendationInsightsToCandidateItems } from './candidateItemMetricModel'
import type { CandidateMetricReloadOptions } from './candidateItemListMergeModel'

type CandidateItemStateUpdater =
  | CandidateItemSummary[]
  | ((current: CandidateItemSummary[]) => CandidateItemSummary[])

type LoadCandidateItems = (
  nextPeriodStart?: string,
  nextPeriodEnd?: string,
  options?: CandidateMetricReloadOptions,
) => Promise<void>

type Args = {
  stashUuid: string
  dataReferencePeriodStart: string
  dataReferencePeriodEnd: string
  mountedRef: MutableRefObject<boolean>
  itemsRef: MutableRefObject<CandidateItemSummary[]>
  setItems: (next: CandidateItemStateUpdater) => void
  loadItems: LoadCandidateItems
  refreshStashes: () => Promise<void>
  showToast: (message: string) => void
}

export function useCandidateRecommendations({
  stashUuid,
  dataReferencePeriodStart,
  dataReferencePeriodEnd,
  mountedRef,
  itemsRef,
  setItems,
  loadItems,
  refreshStashes,
  showToast,
}: Args) {
  const [recommendationItems, setRecommendationItems] = useState<CandidateReferenceItemSummary[]>([])
  const [recommendationLoading, setRecommendationLoading] = useState(false)
  const [recommendationError, setRecommendationError] = useState<string | null>(null)
  const requestSeqRef = useRef(0)

  const clearRecommendationItems = useCallback(() => {
    requestSeqRef.current += 1
    setRecommendationItems([])
    setRecommendationLoading(false)
    setRecommendationError(null)
  }, [])

  const loadRecommendations = useCallback(async (): Promise<CandidateReferenceItemSummary[]> => {
    if (!stashUuid || !dataReferencePeriodStart || !dataReferencePeriodEnd) return []
    const seq = requestSeqRef.current + 1
    requestSeqRef.current = seq
    setRecommendationLoading(true)
    setRecommendationError(null)
    try {
      const result = await getCandidateRecommendations({
        stashUuid,
        dataReferencePeriodStart,
        dataReferencePeriodEnd,
        limit: 100,
      })
      if (!mountedRef.current || requestSeqRef.current !== seq) return []
      const candidateSkuUuidSet = new Set(itemsRef.current.map((item) => item.skuUuid))
      const recommendationRows = result.recommendations.filter((row) => !candidateSkuUuidSet.has(row.uuid))
      setItems((current) => applyRecommendationInsightsToCandidateItems(current, result.recommendations))
      setRecommendationItems(recommendationRows)
      setRecommendationLoading(false)
      return recommendationRows
    } catch (err) {
      if (!mountedRef.current || requestSeqRef.current !== seq) return []
      const message = err instanceof Error ? err.message : '추천 후보 조회에 실패했습니다.'
      setRecommendationError(message)
      setRecommendationLoading(false)
      return []
    }
  }, [dataReferencePeriodEnd, dataReferencePeriodStart, itemsRef, mountedRef, setItems, stashUuid])

  const appendRecommendedItems = useCallback(async (rows: CandidateReferenceItemSummary[]) => {
    const skuGroupKeys = [...new Set(rows.map((row) => row.skuGroupKey))]
    if (!skuGroupKeys.length) return
    const existingSkuGroupKeySet = new Set(itemsRef.current.map((item) => item.skuGroupKey))
    const addedMetricSkuGroupKeys = skuGroupKeys.filter((skuGroupKey) => !existingSkuGroupKeySet.has(skuGroupKey))
    await appendCandidateItems({ stashUuid, skuGroupKeys })
    if (!mountedRef.current) return
    await loadItems(dataReferencePeriodStart, dataReferencePeriodEnd, {
      metricSkuGroupKeys: addedMetricSkuGroupKeys,
      preserveExistingMetrics: true,
    })
    await refreshStashes()
    showToast('추천 후보를 후보군에 추가했습니다.')
  }, [
    dataReferencePeriodEnd,
    dataReferencePeriodStart,
    itemsRef,
    loadItems,
    mountedRef,
    refreshStashes,
    showToast,
    stashUuid,
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
