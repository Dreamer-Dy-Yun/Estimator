import type { CandidateOrderMetricEvent, CandidateOrderMetricStreamParams, CandidateOrderMetricSubscription } from '../types'
import { buildCandidateOrderMetric } from './candidateItemSummaryBuilder'
import { buildCandidateListParamsPeriod, readCandidateItemsForStash } from './candidateMockStore'
import { createMockStreamTimers } from './mockStreamTimers'

export function subscribeMockCandidateOrderMetrics(
  params: CandidateOrderMetricStreamParams,
  listener: (event: CandidateOrderMetricEvent) => void,
  ownerUserUuid?: string,
): CandidateOrderMetricSubscription {
  const rows = readCandidateItemsForStash(params.stashUuid, ownerUserUuid, params.companyUuid)
    .filter((row) => params.candidateItemUuids.includes(row.uuid))
  const period = buildCandidateListParamsPeriod(params)
  const { emit, close } = createMockStreamTimers<CandidateOrderMetricEvent>(listener)
  let failedCount = 0

  rows.forEach((row, index) => emit(() => {
    try {
      return {
        type: 'item',
        requestId: params.requestId,
        itemUuid: row.uuid,
        skuUuid: row.skuUuid,
        metric: buildCandidateOrderMetric(row, period, params.companyUuid),
      }
    } catch (error) {
      failedCount += 1
      return {
        type: 'itemFailed',
        requestId: params.requestId,
        itemUuid: row.uuid,
        skuUuid: row.skuUuid,
        message: error instanceof Error ? error.message : '오더 지표 계산 실패',
      }
    }
  }, 80 + index * 45))

  emit(() => ({
    type: 'completed',
    requestId: params.requestId,
    processedCount: rows.length,
    failedCount,
  }), rows.length === 0 ? 0 : 90 + rows.length * 45)

  return { close }
}
