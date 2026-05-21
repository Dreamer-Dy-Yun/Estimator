import type {
  CandidateOrderMetricEvent,
  CandidateOrderMetricStreamParams,
  CandidateOrderMetricSubscription,
} from '../types'
import { buildCandidateOrderMetric } from './candidateItemSummaryBuilder'
import {
  buildCandidateListParamsPeriod,
  readCandidateItemsForStash,
} from './candidateMockStore'

export function subscribeMockCandidateOrderMetrics(
  params: CandidateOrderMetricStreamParams,
  listener: (event: CandidateOrderMetricEvent) => void,
  ownerUserUuid?: string,
): CandidateOrderMetricSubscription {
  const records = readCandidateItemsForStash(params.stashUuid, ownerUserUuid, params.companyUuid)
    .filter((row) => params.candidateItemUuids.includes(row.uuid))
  const period = buildCandidateListParamsPeriod(params)
  let failedCount = 0
  const timers = records.map((row, index) => globalThis.setTimeout(() => {
    try {
      listener({
        type: 'item',
        requestId: params.requestId,
        itemUuid: row.uuid,
        skuUuid: row.skuUuid,
        metric: buildCandidateOrderMetric(row, period, params.companyUuid),
      })
    } catch (err) {
      failedCount += 1
      listener({
        type: 'itemFailed',
        requestId: params.requestId,
        itemUuid: row.uuid,
        skuUuid: row.skuUuid,
        message: err instanceof Error ? err.message : '오더 지표 계산 실패',
      })
    }
    if (index === records.length - 1) {
      listener({
        type: 'completed',
        requestId: params.requestId,
        processedCount: records.length,
        failedCount,
      })
    }
  }, 80 + index * 45))
  if (records.length === 0) {
    const timer = globalThis.setTimeout(() => {
      listener({
        type: 'completed',
        requestId: params.requestId,
        processedCount: 0,
        failedCount: 0,
      })
    }, 0)
    timers.push(timer)
  }
  return {
    close: () => {
      timers.forEach((timer) => globalThis.clearTimeout(timer))
    },
  }
}
