import { useCallback, useState, type MutableRefObject } from 'react'
import {
  getCompanyUuidForOptionalScope,
  getApiErrorDisplayMessage,
  getCandidateItemsByStash,
  type CandidateItemSummary,
} from '../../../api'
import { useAuth } from '../../../auth/AuthContext'
import {
  applyCandidateDetailConfirmationOverrides,
  type CandidateDetailConfirmationOverrideMap,
} from './candidateDetailConfirmationOverrideModel'
import {
  mergeCandidateItemsWithPreservedMetrics,
  selectMetricCandidateItems,
  type CandidateMetricReloadOptions,
} from './candidateItemListMergeModel'
import type { AppliedCandidateDataReferencePeriod } from './useCandidateDataReferencePeriod'

type ItemStateUpdater = CandidateItemSummary[] | ((current: CandidateItemSummary[]) => CandidateItemSummary[])

interface SubscribeOrderMetricsArgs {
  seq: number
  dataReferencePeriodStart: string
  dataReferencePeriodEnd: string
  companyUuid?: string
  candidateItemUuids: string[]
}

interface UseCandidateItemsLoaderParams {
  stashUuid: string
  appliedPeriodRef: MutableRefObject<AppliedCandidateDataReferencePeriod>
  itemsRef: MutableRefObject<CandidateItemSummary[]>
  confirmationOverridesRef: MutableRefObject<CandidateDetailConfirmationOverrideMap>
  clearRecommendationItems: () => void
  beginItemLoad: () => number
  isCurrentItemLoad: (seq: number) => boolean
  setItems: (next: ItemStateUpdater) => void
  subscribeOrderMetrics: (args: SubscribeOrderMetricsArgs) => void
}

export function useCandidateItemsLoader({
  stashUuid,
  appliedPeriodRef,
  itemsRef,
  confirmationOverridesRef,
  clearRecommendationItems,
  beginItemLoad,
  isCurrentItemLoad,
  setItems,
  subscribeOrderMetrics,
}: UseCandidateItemsLoaderParams) {
  const { selectedCompanyUuid } = useAuth()
  const companyUuid = getCompanyUuidForOptionalScope(selectedCompanyUuid)
  const [candidateItemsLoading, setCandidateItemsLoading] = useState(false)
  const [candidateItemsLoadError, setCandidateItemsLoadError] = useState<string | null>(null)

  const loadItems = useCallback(async (
    nextPeriodStart = appliedPeriodRef.current.start,
    nextPeriodEnd = appliedPeriodRef.current.end,
    options: CandidateMetricReloadOptions = {},
  ) => {
    if (!stashUuid || !nextPeriodStart || !nextPeriodEnd) return
    const seq = beginItemLoad()
    setCandidateItemsLoading(true)
    setCandidateItemsLoadError(null)
    try {
      const result = await getCandidateItemsByStash({
        stashUuid,
        companyUuid,
        dataReferencePeriodStart: nextPeriodStart,
        dataReferencePeriodEnd: nextPeriodEnd,
      })
      if (!isCurrentItemLoad(seq)) return
      clearRecommendationItems()
      const metricCandidateItems = selectMetricCandidateItems(result.candidateItems, options.metricSkuGroupKeys)
      const nextItems = mergeCandidateItemsWithPreservedMetrics(
        result.items,
        metricCandidateItems,
        itemsRef.current,
        options.preserveExistingMetrics,
      )
      const protectedResult = applyCandidateDetailConfirmationOverrides(nextItems, confirmationOverridesRef.current)
      confirmationOverridesRef.current = protectedResult.overrides
      setItems(protectedResult.items)
      setCandidateItemsLoading(false)
      subscribeOrderMetrics({
        seq,
        dataReferencePeriodStart: nextPeriodStart,
        dataReferencePeriodEnd: nextPeriodEnd,
        companyUuid,
        candidateItemUuids: metricCandidateItems.map((item) => item.uuid),
      })
    } catch (err) {
      if (!isCurrentItemLoad(seq)) return
      const message = getApiErrorDisplayMessage(err, '후보 상품 목록을 불러오지 못했습니다.')
      setCandidateItemsLoadError(message)
      setCandidateItemsLoading(false)
    }
  }, [
    appliedPeriodRef,
    beginItemLoad,
    clearRecommendationItems,
    companyUuid,
    confirmationOverridesRef,
    isCurrentItemLoad,
    itemsRef,
    setItems,
    stashUuid,
    subscribeOrderMetrics,
  ])

  return {
    candidateItemsLoading,
    candidateItemsLoadError,
    loadItems,
  }
}
