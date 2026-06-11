import type { MockStreamTimers } from './mockStreamTimers'
import type { CandidateOrderMetric } from '..'
import type { CandidateDataReferencePeriod } from './candidateItemSummaryTypes'
import type { CandidateItemRecord } from './records'
import type { CandidateOrderMetricEvent, CandidateOrderMetricStreamParams, CandidateOrderMetricSubscription } from '../types'
import { buildCandidateOrderMetric } from './candidateItemSummaryBuilder'
import { buildCandidateListParamsPeriod, readCandidateItemsForStash } from './candidateMockStore'
import { createMockStreamTimers } from './mockStreamTimers'

export function subscribeMockCandidateOrderMetrics(
  params: CandidateOrderMetricStreamParams,
  listener: (event: CandidateOrderMetricEvent) => void,
  ownerUserUuid?: string,
): CandidateOrderMetricSubscription {
  const rows: CandidateItemRecord[] = readCandidateItemsForStash(params.stashUuid, ownerUserUuid, params.companyUuid)
    .filter((row: CandidateItemRecord) : boolean => params.candidateItemUuids.includes(row.uuid))
  const period: CandidateDataReferencePeriod = buildCandidateListParamsPeriod(params)
  const { emit, close }: MockStreamTimers<CandidateOrderMetricEvent> = createMockStreamTimers<CandidateOrderMetricEvent>(listener)
  let failedCount: number = 0

  rows.forEach((row: CandidateItemRecord, index: number) : void => emit(() : { type: 'item'; requestId: string; itemUuid: string; skuUuid: string; metric: CandidateOrderMetric; message?: undefined; } | { type: 'itemFailed'; requestId: string; itemUuid: string; skuUuid: string; message: string; metric?: undefined; } => {
    try {
      return {
        type: 'item',
        requestId: params.requestId,
        itemUuid: row.uuid,
        skuUuid: row.skuUuid,
        metric: buildCandidateOrderMetric(row, period, params.companyUuid, params.comparison),
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

  emit(() : { type: 'completed'; requestId: string; processedCount: number; failedCount: number; } => ({
    type: 'completed',
    requestId: params.requestId,
    processedCount: rows.length,
    failedCount,
  }), rows.length === 0 ? 0 : 90 + rows.length * 45)

  return { close }
}
