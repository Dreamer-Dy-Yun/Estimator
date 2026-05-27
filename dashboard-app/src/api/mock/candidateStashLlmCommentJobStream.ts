import type {
  CandidateStashLlmCommentJobProgressEvent,
  CandidateStashLlmCommentJobStartResult,
  CandidateStashLlmCommentJobSubscription,
} from '../types'
import { findCandidateStashForOwner, readCandidateItemRecords, readCandidateItemsForStash } from './candidateMockStore'
import { MOCK_SINGLE_COMPANY_SCOPE_REQUIRED_MESSAGE } from './mockCompanyScope'
import { createMockStreamTimers } from './mockStreamTimers'
import { requireMockProductPrimary } from './mockProductLookup'
import { makeUuid32, sleep } from './utils'

interface CandidateStashLlmCommentJob {
  stashUuid: string
  ownerUserUuid?: string
  companyUuid: string
  itemUuids: string[]
}

const jobs = new Map<string, CandidateStashLlmCommentJob>()

function requireCompany(companyUuid?: string): string {
  if (!companyUuid) throw new Error(MOCK_SINGLE_COMPANY_SCOPE_REQUIRED_MESSAGE)
  return companyUuid
}

function readJob(jobId: string, ownerUserUuid?: string, companyUuid?: string) {
  const job = jobs.get(jobId)
  if (!job || !companyUuid || job.companyUuid !== companyUuid || (ownerUserUuid && job.ownerUserUuid !== ownerUserUuid)) return null
  return job
}

export async function startMockCandidateStashLlmCommentJob(
  stashUuid: string,
  ownerUserUuid?: string,
  companyUuid?: string,
): Promise<CandidateStashLlmCommentJobStartResult> {
  await sleep(60)
  const requiredCompanyUuid = requireCompany(companyUuid)
  if (!findCandidateStashForOwner(stashUuid, ownerUserUuid, requiredCompanyUuid)) throw new Error('후보군을 찾을 수 없습니다.')
  const itemUuids = readCandidateItemsForStash(stashUuid, ownerUserUuid, requiredCompanyUuid)
    .filter((row) => row.details != null)
    .map((row) => row.uuid)
  const jobId = `mock-llm-comment-${makeUuid32()}`
  jobs.set(jobId, { stashUuid, ownerUserUuid, companyUuid: requiredCompanyUuid, itemUuids })
  return { jobId, stashUuid, itemCount: itemUuids.length }
}

export function subscribeMockCandidateStashLlmCommentJob(
  jobId: string,
  listener: (event: CandidateStashLlmCommentJobProgressEvent) => void,
  ownerUserUuid?: string,
  companyUuid?: string,
): CandidateStashLlmCommentJobSubscription {
  const job = readJob(jobId, ownerUserUuid, companyUuid)
  const { emit, close } = createMockStreamTimers<CandidateStashLlmCommentJobProgressEvent>(listener)
  if (!job) {
    emit(() => ({
      jobId,
      stashUuid: '',
      status: 'failed',
      totalItems: 0,
      completedItems: 0,
      message: '후보군 LLM 코멘트 작업을 찾을 수 없습니다.',
      error: '후보군 LLM 코멘트 작업을 찾을 수 없습니다.',
    }), 0)
    return { close }
  }

  const totalItems = job.itemUuids.length
  emit(() => ({
    jobId,
    stashUuid: job.stashUuid,
    status: totalItems > 0 ? 'running' : 'completed',
    totalItems,
    completedItems: 0,
    message: totalItems > 0 ? '후보군 LLM 코멘트 생성을 시작했습니다.' : 'LLM 코멘트를 생성할 확정 스냅샷이 없습니다.',
  }), 0)

  job.itemUuids.forEach((itemUuid, index) => emit(() => completeOneItem(job, itemUuid, index + 1, totalItems, jobId), 80 + index * 80))
  if (totalItems > 0) {
    emit(() => ({ jobId, stashUuid: job.stashUuid, status: 'completed', totalItems, completedItems: totalItems, message: '후보군 LLM 코멘트 생성을 완료했습니다.' }), 120 + totalItems * 80)
  }
  return { close }
}

function completeOneItem(
  job: CandidateStashLlmCommentJob,
  itemUuid: string,
  completedItems: number,
  totalItems: number,
  jobId: string,
): CandidateStashLlmCommentJobProgressEvent {
  const item = readCandidateItemRecords().find((row) => row.uuid === itemUuid && row.stashUuid === job.stashUuid)
  const productName = item ? requireMockProductPrimary(item.skuGroupKey).productName : itemUuid
  if (item) {
    item.isLatestLlmComment = true
    item.dbUpdatedAt = new Date().toISOString()
  }
  return {
    jobId,
    stashUuid: job.stashUuid,
    status: 'running',
    totalItems,
    completedItems,
    currentItemUuid: itemUuid,
    currentProductName: productName,
    message: `${productName} LLM 코멘트 생성을 완료했습니다.`,
  }
}
