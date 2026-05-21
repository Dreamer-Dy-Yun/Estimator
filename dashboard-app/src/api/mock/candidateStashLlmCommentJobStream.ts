import type {
  CandidateStashLlmCommentJobProgressEvent,
  CandidateStashLlmCommentJobStartResult,
  CandidateStashLlmCommentJobSubscription,
} from '../types'
import {
  findCandidateStashForOwner,
  readCandidateItemRecords,
  readCandidateItemsForStash,
} from './candidateMockStore'
import { productPrimaryBySkuGroupKey } from './productCatalog'
import { makeUuid32, sleep } from './utils'

interface CandidateStashLlmCommentJob {
  stashUuid: string
  ownerUserUuid?: string
  companyUuid?: string
  itemUuids: string[]
}

const candidateStashLlmCommentJobs = new Map<string, CandidateStashLlmCommentJob>()

export async function startMockCandidateStashLlmCommentJob(
  stashUuid: string,
  ownerUserUuid?: string,
  companyUuid?: string,
): Promise<CandidateStashLlmCommentJobStartResult> {
  await sleep(60)
  if (!findCandidateStashForOwner(stashUuid, ownerUserUuid, companyUuid)) {
    throw new Error('후보군을 찾을 수 없습니다.')
  }
  const itemUuids = readCandidateItemsForStash(stashUuid, ownerUserUuid, companyUuid)
    .filter((row) => row.details != null)
    .map((row) => row.uuid)
  const jobId = `mock-llm-comment-${makeUuid32()}`
  candidateStashLlmCommentJobs.set(jobId, { stashUuid, ownerUserUuid, companyUuid, itemUuids })
  return {
    jobId,
    stashUuid,
    itemCount: itemUuids.length,
  }
}

export function subscribeMockCandidateStashLlmCommentJob(
  jobId: string,
  listener: (event: CandidateStashLlmCommentJobProgressEvent) => void,
  ownerUserUuid?: string,
  companyUuid?: string,
): CandidateStashLlmCommentJobSubscription {
  const job = candidateStashLlmCommentJobs.get(jobId)
  const canReadJob = job && (!ownerUserUuid || job.ownerUserUuid === ownerUserUuid)
    && (!companyUuid || job.companyUuid === companyUuid)
  const stashUuid = job?.stashUuid ?? ''
  const itemUuids = canReadJob ? job.itemUuids : []
  const totalItems = itemUuids.length
  const timers: ReturnType<typeof globalThis.setTimeout>[] = []

  const emit = (event: CandidateStashLlmCommentJobProgressEvent, delay: number) => {
    timers.push(globalThis.setTimeout(() => listener(event), delay))
  }

  if (!canReadJob) {
    emit({
      jobId,
      stashUuid,
      status: 'failed',
      totalItems: 0,
      completedItems: 0,
      message: '후보군 LLM 코멘트 작업을 찾을 수 없습니다.',
      error: '후보군 LLM 코멘트 작업을 찾을 수 없습니다.',
    }, 0)
    return {
      close: () => timers.forEach((timer) => globalThis.clearTimeout(timer)),
    }
  }

  emit({
    jobId,
    stashUuid,
    status: totalItems > 0 ? 'running' : 'completed',
    totalItems,
    completedItems: 0,
    message: totalItems > 0 ? '후보군 LLM 코멘트 생성을 시작했습니다.' : 'LLM 코멘트를 생성할 확정 스냅샷이 없습니다.',
  }, 0)

  itemUuids.forEach((itemUuid, index) => {
    const item = readCandidateItemRecords().find((row) => row.uuid === itemUuid)
    const product = item ? productPrimaryBySkuGroupKey[item.skuGroupKey] : null
    emit({
      jobId,
      stashUuid,
      status: 'running',
      totalItems,
      completedItems: index + 1,
      currentItemUuid: itemUuid,
      currentProductName: product?.productName,
      message: `${product?.productName ?? itemUuid} LLM 코멘트 생성을 완료했습니다.`,
    }, 80 + index * 80)
  })

  if (totalItems > 0) {
    emit({
      jobId,
      stashUuid,
      status: 'completed',
      totalItems,
      completedItems: totalItems,
      message: '후보군 LLM 코멘트 생성을 완료했습니다.',
    }, 120 + totalItems * 80)
  }

  return {
    close: () => timers.forEach((timer) => globalThis.clearTimeout(timer)),
  }
}
