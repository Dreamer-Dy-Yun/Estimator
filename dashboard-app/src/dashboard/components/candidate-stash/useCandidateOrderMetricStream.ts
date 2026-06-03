import type { CandidateItemSummary, CandidateOrderMetricEvent } from '../../../api'
import { useCallback, useEffect, useRef } from 'react'
import {
  subscribeCandidateOrderMetrics,
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
import type { CandidateMountedRef, CandidateSetItems } from './candidateStashDetailTypes'

export type Args = {
  stashUuid: string
  companyUuid?: string
  mountedRef: CandidateMountedRef
  setItems: CandidateSetItems
}

export type SubscribeArgs = {
  seq: number
  dataReferencePeriodStart: string
  dataReferencePeriodEnd: string
  companyUuid?: string
  candidateItemUuids: string[]
}

export type ActiveMetricSubscription = {
  signature: string
  subscription: CandidateOrderMetricSubscription
}

export function useCandidateOrderMetricStream({ stashUuid, companyUuid, mountedRef, setItems }: Args) : { beginItemLoad: () => number; closeMetricSubscription: () => void; getCurrentItemLoadSeq: () => number; isCurrentItemLoad: (seq: number) => boolean; subscribeOrderMetrics: (args: SubscribeArgs) => void; } {
  const itemLoadSeqRef: React.RefObject<number> = useRef(0)
  const metricRequestSeqRef: React.RefObject<number> = useRef(0)
  const metricSubscriptionsRef: React.RefObject<Map<string, ActiveMetricSubscription>> = useRef(new Map<string, ActiveMetricSubscription>())
  const metricRequestIdBySignatureRef: React.RefObject<Map<string, string>> = useRef(new Map<string, string>())

  const closeMetricSubscription: () => void = useCallback(() : void => {
    metricSubscriptionsRef.current.forEach((entry: ActiveMetricSubscription) : void => entry.subscription.close())
    metricSubscriptionsRef.current.clear()
    metricRequestIdBySignatureRef.current.clear()
  }, [])

  useEffect(() : () => void => () : void => {
    itemLoadSeqRef.current += 1
    closeMetricSubscription()
  }, [closeMetricSubscription])

  const beginItemLoad: () => number = useCallback(() : number => {
    const seq: number = itemLoadSeqRef.current + 1
    itemLoadSeqRef.current = seq
    closeMetricSubscription()
    return seq
  }, [closeMetricSubscription])

  const isCurrentItemLoad: (seq: number) => boolean = useCallback((seq: number) : boolean => (
    mountedRef.current && itemLoadSeqRef.current === seq
  ), [mountedRef])

  const getCurrentItemLoadSeq: () => number = useCallback(() : number => itemLoadSeqRef.current, [])

  const subscribeOrderMetrics: (args: SubscribeArgs) => void = useCallback(({
    seq,
    dataReferencePeriodStart,
    dataReferencePeriodEnd,
    companyUuid: requestCompanyUuid,
    candidateItemUuids,
  }: SubscribeArgs) : void => {
    const metricCompanyUuid: string | undefined = requestCompanyUuid ?? companyUuid
    const nextCandidateItemUuids: string[] = normalizeCandidateItemUuids(candidateItemUuids)
    if (!nextCandidateItemUuids.length) return
    if (!metricCompanyUuid) {
      const pendingItemUuids: Set<string> = createPendingMetricItemUuidSet(nextCandidateItemUuids)
      if (isCurrentItemLoad(seq)) {
        setItems((current: CandidateItemSummary[]) : CandidateItemSummary[] => current.map((item: CandidateItemSummary) : CandidateItemSummary => (
          pendingItemUuids.has(item.uuid) ? markCandidateItemOrderMetricFailed(item) : item
        )))
      }
      return
    }
    const signature: string = [
      metricCompanyUuid,
      buildCandidateOrderMetricRequestSignature({
        stashUuid,
        dataReferencePeriodStart,
        dataReferencePeriodEnd,
        seq,
        candidateItemUuids: nextCandidateItemUuids,
      }),
    ].join(':')
    const existingRequestId: string | undefined = metricRequestIdBySignatureRef.current.get(signature)
    if (existingRequestId && metricSubscriptionsRef.current.has(existingRequestId)) return

    metricRequestSeqRef.current += 1
    const requestId: string = [
      stashUuid,
      metricCompanyUuid,
      dataReferencePeriodStart,
      dataReferencePeriodEnd,
      seq,
      metricRequestSeqRef.current,
    ].join(':')

    const closeRequest: () => void = () : void => {
      const entry: ActiveMetricSubscription | undefined = metricSubscriptionsRef.current.get(requestId)
      if (!entry) return
      entry.subscription.close()
      metricSubscriptionsRef.current.delete(requestId)
      metricRequestIdBySignatureRef.current.delete(entry.signature)
    }

    const pendingItemUuids: Set<string> = createPendingMetricItemUuidSet(nextCandidateItemUuids)
    const failPendingItems: () => void = () : void => {
      if (!isCurrentItemLoad(seq)) return
      setItems((current: CandidateItemSummary[]) : CandidateItemSummary[] => current.map((item: CandidateItemSummary) : CandidateItemSummary => (
        pendingItemUuids.has(item.uuid) ? markCandidateItemOrderMetricFailed(item) : item
      )))
      closeRequest()
    }
    const subscription: CandidateOrderMetricSubscription = subscribeCandidateOrderMetrics({
      stashUuid,
      companyUuid: metricCompanyUuid,
      dataReferencePeriodStart,
      dataReferencePeriodEnd,
      requestId,
      candidateItemUuids: nextCandidateItemUuids,
    }, (event: CandidateOrderMetricEvent) : void => {
      if (!isCurrentItemLoad(seq)) return
      if (event.requestId !== requestId) return
      if (event.type === 'item') {
        setItems((current: CandidateItemSummary[]) : CandidateItemSummary[] => current.map((item: CandidateItemSummary) : CandidateItemSummary => (
          item.uuid === event.itemUuid ? applyOrderMetricToCandidateItem(item, event.metric) : item
        )))
        if (settlePendingMetricItem(pendingItemUuids, event.itemUuid)) closeRequest()
        return
      }
      if (event.type === 'completed') {
        if (pendingItemUuids.size) {
          const remainingItemUuids: Set<string> = new Set(pendingItemUuids)
          pendingItemUuids.clear()
          setItems((current: CandidateItemSummary[]) : CandidateItemSummary[] => current.map((item: CandidateItemSummary) : CandidateItemSummary => (
            remainingItemUuids.has(item.uuid) ? markCandidateItemOrderMetricFailed(item) : item
          )))
        }
        closeRequest()
        return
      }
      if (event.type === 'itemFailed') {
        setItems((current: CandidateItemSummary[]) : CandidateItemSummary[] => current.map((item: CandidateItemSummary) : CandidateItemSummary => (
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
