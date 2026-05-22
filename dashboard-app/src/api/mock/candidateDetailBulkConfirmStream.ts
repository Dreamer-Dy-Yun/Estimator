import type {
  CandidateDetailBulkConfirmProgressEvent,
  CandidateDetailBulkConfirmStartPayload,
  CandidateDetailBulkConfirmStartResult,
  CandidateDetailBulkConfirmSubscription,
} from '../types'
import {
  findCandidateStashForOwner,
  readCandidateItemRecords,
} from './candidateMockStore'
import { buildMockOrderSnapshotForCandidate } from './orderSnapshotForCandidate'
import { productPrimaryBySkuGroupKey } from './productCatalog'
import { makeUuid32, sleep } from './utils'
import { MOCK_SINGLE_COMPANY_SCOPE_REQUIRED_MESSAGE } from './mockCompanyScope'

interface CandidateDetailBulkConfirmJob {
  stashUuid: string
  ownerUserUuid?: string
  companyUuid?: string
  itemUuids: string[]
  periodStart: string
  periodEnd: string
}

const bulkConfirmJobs = new Map<string, CandidateDetailBulkConfirmJob>()

export async function startMockCandidateDetailBulkConfirm(
  payload: CandidateDetailBulkConfirmStartPayload,
  ownerUserUuid?: string,
  companyUuid?: string,
): Promise<CandidateDetailBulkConfirmStartResult> {
  await sleep(60)
  if (!companyUuid) {
    throw new Error(MOCK_SINGLE_COMPANY_SCOPE_REQUIRED_MESSAGE)
  }
  if (!findCandidateStashForOwner(payload.stashUuid, ownerUserUuid, companyUuid)) {
    throw new Error('후보군을 찾을 수 없습니다.')
  }
  if (payload.itemUuids.length === 0) {
    throw new Error('상세확정할 후보 아이템이 없습니다.')
  }
  if (payload.itemUuids.some((itemUuid) => !itemUuid.trim())) {
    throw new Error('상세확정할 후보 아이템 ID가 비어 있습니다.')
  }
  const requestedUuidSet = new Set(payload.itemUuids)
  const stashItemUuidSet = new Set(
    readCandidateItemRecords()
      .filter((row) => row.stashUuid === payload.stashUuid)
      .map((row) => row.uuid),
  )
  const invalidItemUuid = [...requestedUuidSet].find((itemUuid) => !stashItemUuidSet.has(itemUuid))
  if (invalidItemUuid) {
    throw new Error('후보군에 포함되지 않은 후보 아이템이 있습니다.')
  }
  const itemUuids = [...requestedUuidSet]
  const jobId = `mock-bulk-detail-confirm-${makeUuid32()}`
  bulkConfirmJobs.set(jobId, {
    stashUuid: payload.stashUuid,
    ownerUserUuid,
    companyUuid,
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
  const job = bulkConfirmJobs.get(jobId)
  const canReadJob = job && (!ownerUserUuid || job.ownerUserUuid === ownerUserUuid)
    && !!companyUuid
    && job.companyUuid === companyUuid
  const itemUuids = canReadJob ? job.itemUuids : []
  const totalItems = itemUuids.length
  const timers: ReturnType<typeof globalThis.setTimeout>[] = []

  const emit = (event: CandidateDetailBulkConfirmProgressEvent, delay: number) => {
    timers.push(globalThis.setTimeout(() => listener(event), delay))
  }

  if (!job || !canReadJob) {
    emit({
      jobId,
      stashUuid: '',
      status: 'failed',
      totalItems: 0,
      completedItems: 0,
      message: '상세 일괄확정 작업을 찾을 수 없습니다.',
      error: '상세 일괄확정 작업을 찾을 수 없습니다.',
    }, 0)
    return { close: () => timers.forEach((timer) => globalThis.clearTimeout(timer)) }
  }

  emit({
    jobId,
    stashUuid: job.stashUuid,
    status: totalItems > 0 ? 'running' : 'completed',
    totalItems,
    completedItems: 0,
    message: totalItems > 0 ? '상세 일괄확정을 시작했습니다.' : '상세확정할 후보가 없습니다.',
  }, 0)

  itemUuids.forEach((itemUuid, index) => {
    emit(confirmOneItemEvent(job, itemUuid, index + 1, totalItems, jobId), 90 + index * 90)
  })

  if (totalItems > 0) {
    emit({
      jobId,
      stashUuid: job.stashUuid,
      status: 'completed',
      totalItems,
      completedItems: totalItems,
      message: '상세 일괄확정을 완료했습니다.',
    }, 140 + totalItems * 90)
  }

  return { close: () => timers.forEach((timer) => globalThis.clearTimeout(timer)) }
}

function confirmOneItemEvent(
  job: CandidateDetailBulkConfirmJob,
  itemUuid: string,
  completedItems: number,
  totalItems: number,
  jobId: string,
): CandidateDetailBulkConfirmProgressEvent {
  const item = readCandidateItemRecords().find((row) => row.uuid === itemUuid && row.stashUuid === job.stashUuid)
  const now = new Date().toISOString()
  if (!item) {
    return {
      jobId,
      stashUuid: job.stashUuid,
      status: 'running',
      totalItems,
      completedItems,
      currentItemUuid: itemUuid,
      message: '후보 아이템을 찾을 수 없어 건너뛰었습니다.',
    }
  }
  item.details = buildMockOrderSnapshotForCandidate(item.skuGroupKey, {
    periodStart: job.periodStart,
    periodEnd: job.periodEnd,
  })
  item.isLatestLlmComment = true
  item.dbUpdatedAt = now
  const productName = productPrimaryBySkuGroupKey[item.skuGroupKey]?.productName
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
      details: item.details,
      isDetailConfirmed: true,
      isLatestLlmComment: item.isLatestLlmComment,
      dbCreatedAt: item.dbCreatedAt,
      dbUpdatedAt: now,
    },
    message: `${productName ?? item.uuid} 상세확정을 완료했습니다.`,
  }
}
