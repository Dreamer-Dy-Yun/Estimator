import type { MockStreamTimers } from './mockStreamTimers'
import type { CandidateItemRecord } from './records'
import type {
  CandidateDetailBulkConfirmProgressEvent,
  CandidateDetailBulkConfirmStartPayload,
  CandidateDetailBulkConfirmStartResult,
  CandidateDetailBulkConfirmSubscription,
} from '../types'
import { findCandidateStashForOwner, readCandidateItemRecords } from './candidateMockStore'
import { MOCK_SINGLE_COMPANY_SCOPE_REQUIRED_MESSAGE } from './mockCompanyScope'
import { createMockStreamTimers } from './mockStreamTimers'
import { buildMockOrderSnapshotForCandidate } from './orderSnapshotForCandidate'
import { requireMockProductPrimary } from './mockProductLookup'
import { makeUuid32, sleep } from './utils'

interface CandidateDetailBulkConfirmJob {
  stashUuid: string
  ownerUserUuid?: string
  companyUuid: string
  itemUuids: string[]
  periodStart: string
  periodEnd: string
}

const bulkConfirmJobs: Map<string, CandidateDetailBulkConfirmJob> = new Map<string, CandidateDetailBulkConfirmJob>()

function requireCompany(companyUuid?: string): string {
  if (!companyUuid) throw new Error(MOCK_SINGLE_COMPANY_SCOPE_REQUIRED_MESSAGE)
  return companyUuid
}

function requireReadableJob(jobId: string, ownerUserUuid?: string, companyUuid?: string) : CandidateDetailBulkConfirmJob | null {
  const job: CandidateDetailBulkConfirmJob | undefined = bulkConfirmJobs.get(jobId)
  if (!job || !companyUuid || job.companyUuid !== companyUuid || (ownerUserUuid && job.ownerUserUuid !== ownerUserUuid)) {
    return null
  }
  return job
}

function assertBulkConfirmPayload(payload: CandidateDetailBulkConfirmStartPayload, ownerUserUuid: string | undefined, companyUuid: string) : void {
  if (!findCandidateStashForOwner(payload.stashUuid, ownerUserUuid, companyUuid)) throw new Error('후보군을 찾을 수 없습니다.')
  if (payload.itemUuids.length === 0) throw new Error('상세확정할 후보 아이템이 없습니다.')
  if (payload.itemUuids.some((itemUuid: string) : boolean => !itemUuid.trim())) throw new Error('상세확정할 후보 아이템 ID가 비어 있습니다.')

  const stashItemUuids: Set<string> = new Set(readCandidateItemRecords()
    .filter((row: CandidateItemRecord) : boolean => row.stashUuid === payload.stashUuid)
    .map((row: CandidateItemRecord) : string => row.uuid))
  if (payload.itemUuids.some((itemUuid: string) : boolean => !stashItemUuids.has(itemUuid))) {
    throw new Error('후보군에 포함되지 않은 후보 아이템이 있습니다.')
  }
}

export async function startMockCandidateDetailBulkConfirm(
  payload: CandidateDetailBulkConfirmStartPayload,
  ownerUserUuid?: string,
  companyUuid?: string,
): Promise<CandidateDetailBulkConfirmStartResult> {
  await sleep(60)
  const requiredCompanyUuid: string = requireCompany(companyUuid)
  assertBulkConfirmPayload(payload, ownerUserUuid, requiredCompanyUuid)

  const itemUuids: string[] = [...new Set(payload.itemUuids)]
  const jobId: string = `mock-bulk-detail-confirm-${makeUuid32()}`
  bulkConfirmJobs.set(jobId, {
    stashUuid: payload.stashUuid,
    ownerUserUuid,
    companyUuid: requiredCompanyUuid,
    itemUuids,
    periodStart: payload.dataReferencePeriodStart,
    periodEnd: payload.dataReferencePeriodEnd,
  })
  return { jobId, stashUuid: payload.stashUuid, itemCount: itemUuids.length }
}

export function subscribeMockCandidateDetailBulkConfirm(
  jobId: string,
  listener: (event: CandidateDetailBulkConfirmProgressEvent) => void,
  ownerUserUuid?: string,
  companyUuid?: string,
): CandidateDetailBulkConfirmSubscription {
  const job: CandidateDetailBulkConfirmJob | null = requireReadableJob(jobId, ownerUserUuid, companyUuid)
  const { emit, close }: MockStreamTimers<CandidateDetailBulkConfirmProgressEvent> = createMockStreamTimers<CandidateDetailBulkConfirmProgressEvent>(listener)

  if (!job) {
    emit(() : CandidateDetailBulkConfirmProgressEvent => failureEvent(jobId, '상세 일괄확정 작업을 찾을 수 없습니다.'), 0)
    return { close }
  }

  const totalItems: number = job.itemUuids.length
  emit(() : { jobId: string; stashUuid: string; status: 'running' | 'completed'; totalItems: number; completedItems: number; message: string; } => ({
    jobId,
    stashUuid: job.stashUuid,
    status: totalItems > 0 ? 'running' : 'completed',
    totalItems,
    completedItems: 0,
    message: totalItems > 0 ? '상세 일괄확정을 시작했습니다.' : '상세확정할 후보가 없습니다.',
  }), 0)

  job.itemUuids.forEach((itemUuid: string, index: number) : void => {
    emit(() : CandidateDetailBulkConfirmProgressEvent => confirmOneItemEvent(job, itemUuid, index + 1, totalItems, jobId), 90 + index * 90)
  })
  if (totalItems > 0) {
    emit(() : { jobId: string; stashUuid: string; status: 'completed'; totalItems: number; completedItems: number; message: string; } => ({
      jobId,
      stashUuid: job.stashUuid,
      status: 'completed',
      totalItems,
      completedItems: totalItems,
      message: '상세 일괄확정을 완료했습니다.',
    }), 140 + totalItems * 90)
  }
  return { close }
}

function failureEvent(jobId: string, message: string): CandidateDetailBulkConfirmProgressEvent {
  return { jobId, stashUuid: '', status: 'failed', totalItems: 0, completedItems: 0, message, error: message }
}

function confirmOneItemEvent(
  job: CandidateDetailBulkConfirmJob,
  itemUuid: string,
  completedItems: number,
  totalItems: number,
  jobId: string,
): CandidateDetailBulkConfirmProgressEvent {
  const item: CandidateItemRecord | undefined = readCandidateItemRecords().find((row: CandidateItemRecord) : boolean => row.uuid === itemUuid && row.stashUuid === job.stashUuid)
  if (!item) {
    return { jobId, stashUuid: job.stashUuid, status: 'running', totalItems, completedItems, currentItemUuid: itemUuid, message: '후보 아이템을 찾을 수 없어 건너뛰었습니다.' }
  }
  const now: string = new Date().toISOString()
  item.confirmedOrderSnapshot = buildMockOrderSnapshotForCandidate(item.skuGroupKey, {
    companyUuid: job.companyUuid,
    periodStart: job.periodStart,
    periodEnd: job.periodEnd,
  })
  item.isLatestLlmComment = false
  item.dbUpdatedAt = now

  const productName: string = requireMockProductPrimary(item.skuGroupKey).productName
  return {
    jobId,
    stashUuid: job.stashUuid,
    status: 'running',
    totalItems,
    completedItems,
    currentItemUuid: item.uuid,
    currentProductName: productName,
    updatedItem: {
      uuid: item.uuid,
      stashUuid: item.stashUuid,
      skuUuid: item.skuUuid,
      skuGroupKey: item.skuGroupKey,
      confirmedOrderSnapshot: item.confirmedOrderSnapshot,
      hasConfirmedOrderSnapshot: true,
      isLatestLlmComment: item.isLatestLlmComment,
      dbCreatedAt: item.dbCreatedAt,
      dbUpdatedAt: now,
    },
    message: `${productName} 상세확정을 완료했습니다.`,
  }
}
