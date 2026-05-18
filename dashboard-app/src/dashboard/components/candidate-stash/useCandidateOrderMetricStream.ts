import { useCallback, useEffect, useRef, type Dispatch, type SetStateAction } from 'react'
import {
  subscribeCandidateOrderMetrics,
  type CandidateItemSummary,
  type CandidateOrderMetricSubscription,
} from '../../../api'
import {
  applyOrderMetricToCandidateItem,
  markCandidateItemOrderMetricFailed,
} from './candidateItemMetricModel'

type MountedRef = {
  current: boolean
}

type Args = {
  stashUuid: string
  mountedRef: MountedRef
  setItems: Dispatch<SetStateAction<CandidateItemSummary[]>>
}

type SubscribeArgs = {
  seq: number
  dataReferencePeriodStart: string
  dataReferencePeriodEnd: string
  candidateItemUuids: string[]
}

export function useCandidateOrderMetricStream({ stashUuid, mountedRef, setItems }: Args) {
  const itemLoadSeqRef = useRef(0)
  const metricSubscriptionRef = useRef<CandidateOrderMetricSubscription | null>(null)

  const closeMetricSubscription = useCallback(() => {
    metricSubscriptionRef.current?.close()
    metricSubscriptionRef.current = null
  }, [])

  useEffect(() => () => {
    itemLoadSeqRef.current += 1
    closeMetricSubscription()
  }, [closeMetricSubscription])

  const beginItemLoad = useCallback(() => {
    const seq = itemLoadSeqRef.current + 1
    itemLoadSeqRef.current = seq
    closeMetricSubscription()
    return seq
  }, [closeMetricSubscription])

  const isCurrentItemLoad = useCallback((seq: number) => (
    mountedRef.current && itemLoadSeqRef.current === seq
  ), [mountedRef])

  const subscribeOrderMetrics = useCallback(({
    seq,
    dataReferencePeriodStart,
    dataReferencePeriodEnd,
    candidateItemUuids,
  }: SubscribeArgs) => {
    if (!candidateItemUuids.length) return
    const requestId = `${stashUuid}:${dataReferencePeriodStart}:${dataReferencePeriodEnd}:${seq}`
    metricSubscriptionRef.current = subscribeCandidateOrderMetrics({
      stashUuid,
      dataReferencePeriodStart,
      dataReferencePeriodEnd,
      requestId,
      candidateItemUuids,
    }, (event) => {
      if (!isCurrentItemLoad(seq)) return
      if (event.requestId !== requestId) return
      if (event.type === 'item') {
        setItems((current) => current.map((item) => (
          item.uuid === event.itemUuid ? applyOrderMetricToCandidateItem(item, event.metric) : item
        )))
        return
      }
      if (event.type === 'itemFailed') {
        setItems((current) => current.map((item) => (
          item.uuid === event.itemUuid ? markCandidateItemOrderMetricFailed(item) : item
        )))
      }
    })
  }, [isCurrentItemLoad, setItems, stashUuid])

  return {
    beginItemLoad,
    closeMetricSubscription,
    isCurrentItemLoad,
    subscribeOrderMetrics,
  }
}
