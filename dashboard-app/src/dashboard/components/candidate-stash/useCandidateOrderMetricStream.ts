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
import {
  buildCandidateOrderMetricRequestSignature,
  createPendingMetricItemUuidSet,
  normalizeCandidateItemUuids,
  settlePendingMetricItem,
} from './candidateOrderMetricStreamModel'

type MountedRef = {
  current: boolean
}

type Args = {
  stashUuid: string
  companyUuid?: string
  mountedRef: MountedRef
  setItems: Dispatch<SetStateAction<CandidateItemSummary[]>>
}

type SubscribeArgs = {
  seq: number
  dataReferencePeriodStart: string
  dataReferencePeriodEnd: string
  companyUuid?: string
  candidateItemUuids: string[]
}

type ActiveMetricSubscription = {
  signature: string
  subscription: CandidateOrderMetricSubscription
}

export function useCandidateOrderMetricStream({ stashUuid, companyUuid, mountedRef, setItems }: Args) {
  const itemLoadSeqRef = useRef(0)
  const metricRequestSeqRef = useRef(0)
  const metricSubscriptionsRef = useRef(new Map<string, ActiveMetricSubscription>())
  const metricRequestIdBySignatureRef = useRef(new Map<string, string>())

  const closeMetricSubscription = useCallback(() => {
    metricSubscriptionsRef.current.forEach((entry) => entry.subscription.close())
    metricSubscriptionsRef.current.clear()
    metricRequestIdBySignatureRef.current.clear()
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

  const getCurrentItemLoadSeq = useCallback(() => itemLoadSeqRef.current, [])

  const subscribeOrderMetrics = useCallback(({
    seq,
    dataReferencePeriodStart,
    dataReferencePeriodEnd,
    companyUuid: requestCompanyUuid,
    candidateItemUuids,
  }: SubscribeArgs) => {
    const metricCompanyUuid = requestCompanyUuid ?? companyUuid
    const nextCandidateItemUuids = normalizeCandidateItemUuids(candidateItemUuids)
    if (!nextCandidateItemUuids.length) return
    if (!metricCompanyUuid) {
      const pendingItemUuids = createPendingMetricItemUuidSet(nextCandidateItemUuids)
      if (isCurrentItemLoad(seq)) {
        setItems((current) => current.map((item) => (
          pendingItemUuids.has(item.uuid) ? markCandidateItemOrderMetricFailed(item) : item
        )))
      }
      return
    }
    const signature = [
      metricCompanyUuid,
      buildCandidateOrderMetricRequestSignature({
        stashUuid,
        dataReferencePeriodStart,
        dataReferencePeriodEnd,
        seq,
        candidateItemUuids: nextCandidateItemUuids,
      }),
    ].join(':')
    const existingRequestId = metricRequestIdBySignatureRef.current.get(signature)
    if (existingRequestId && metricSubscriptionsRef.current.has(existingRequestId)) return

    metricRequestSeqRef.current += 1
    const requestId = [
      stashUuid,
      metricCompanyUuid,
      dataReferencePeriodStart,
      dataReferencePeriodEnd,
      seq,
      metricRequestSeqRef.current,
    ].join(':')

    const closeRequest = () => {
      const entry = metricSubscriptionsRef.current.get(requestId)
      if (!entry) return
      entry.subscription.close()
      metricSubscriptionsRef.current.delete(requestId)
      metricRequestIdBySignatureRef.current.delete(entry.signature)
    }

    const pendingItemUuids = createPendingMetricItemUuidSet(nextCandidateItemUuids)
    const failPendingItems = () => {
      if (!isCurrentItemLoad(seq)) return
      setItems((current) => current.map((item) => (
        pendingItemUuids.has(item.uuid) ? markCandidateItemOrderMetricFailed(item) : item
      )))
      closeRequest()
    }
    const subscription = subscribeCandidateOrderMetrics({
      stashUuid,
      companyUuid: metricCompanyUuid,
      dataReferencePeriodStart,
      dataReferencePeriodEnd,
      requestId,
      candidateItemUuids: nextCandidateItemUuids,
    }, (event) => {
      if (!isCurrentItemLoad(seq)) return
      if (event.requestId !== requestId) return
      if (event.type === 'item') {
        setItems((current) => current.map((item) => (
          item.uuid === event.itemUuid ? applyOrderMetricToCandidateItem(item, event.metric) : item
        )))
        if (settlePendingMetricItem(pendingItemUuids, event.itemUuid)) closeRequest()
        return
      }
      if (event.type === 'completed') {
        closeRequest()
        return
      }
      if (event.type === 'itemFailed') {
        setItems((current) => current.map((item) => (
          item.uuid === event.itemUuid ? markCandidateItemOrderMetricFailed(item) : item
        )))
        if (settlePendingMetricItem(pendingItemUuids, event.itemUuid)) closeRequest()
      }
    }, failPendingItems)
    metricSubscriptionsRef.current.set(requestId, {
      signature,
      subscription,
    })
    metricRequestIdBySignatureRef.current.set(signature, requestId)
  }, [companyUuid, isCurrentItemLoad, setItems, stashUuid])

  return {
    beginItemLoad,
    closeMetricSubscription,
    getCurrentItemLoadSeq,
    isCurrentItemLoad,
    subscribeOrderMetrics,
  }
}
