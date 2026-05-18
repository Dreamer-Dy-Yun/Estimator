import type {
  CandidateStashAnalysisProgressEvent,
  CandidateStashAnalysisStartResult,
  CandidateStashAnalysisSubscription,
} from '../types'
import {
  findCandidateStashForOwner,
  readCandidateItemRecords,
  readCandidateItemsForStash,
} from './candidateMockStore'
import { productPrimaryBySkuGroupKey } from './productCatalog'
import { makeUuid32, sleep } from './utils'

interface CandidateStashAnalysisJob {
  stashUuid: string
  ownerUserUuid?: string
  itemUuids: string[]
}

const candidateStashAnalysisJobs = new Map<string, CandidateStashAnalysisJob>()

export async function startMockCandidateStashAnalysis(
  stashUuid: string,
  ownerUserUuid?: string,
): Promise<CandidateStashAnalysisStartResult> {
  await sleep(60)
  if (!findCandidateStashForOwner(stashUuid, ownerUserUuid)) {
    throw new Error('후보군을 찾을 수 없습니다.')
  }
  const itemUuids = readCandidateItemsForStash(stashUuid, ownerUserUuid)
    .filter((row) => row.details != null)
    .map((row) => row.uuid)
  const jobId = `mock-analysis-${makeUuid32()}`
  candidateStashAnalysisJobs.set(jobId, { stashUuid, ownerUserUuid, itemUuids })
  return {
    jobId,
    stashUuid,
    itemCount: itemUuids.length,
  }
}

export function subscribeMockCandidateStashAnalysis(
  jobId: string,
  listener: (event: CandidateStashAnalysisProgressEvent) => void,
  ownerUserUuid?: string,
): CandidateStashAnalysisSubscription {
  const job = candidateStashAnalysisJobs.get(jobId)
  const canReadJob = job && (!ownerUserUuid || job.ownerUserUuid === ownerUserUuid)
  const stashUuid = job?.stashUuid ?? ''
  const itemUuids = canReadJob ? job.itemUuids : []
  const totalItems = itemUuids.length
  const timers: ReturnType<typeof globalThis.setTimeout>[] = []

  const emit = (event: CandidateStashAnalysisProgressEvent, delay: number) => {
    timers.push(globalThis.setTimeout(() => listener(event), delay))
  }

  if (!canReadJob) {
    emit({
      jobId,
      stashUuid,
      status: 'failed',
      totalItems: 0,
      completedItems: 0,
      message: '후보군 분석 작업을 찾을 수 없습니다.',
      error: '후보군 분석 작업을 찾을 수 없습니다.',
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
    message: totalItems > 0 ? '후보군 AI 분석을 시작했습니다.' : '분석 가능한 확정 스냅샷이 없습니다.',
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
      message: `${product?.productName ?? itemUuid} 분석을 완료했습니다.`,
    }, 80 + index * 80)
  })

  if (totalItems > 0) {
    emit({
      jobId,
      stashUuid,
      status: 'completed',
      totalItems,
      completedItems: totalItems,
      message: '후보군 AI 분석을 완료했습니다.',
    }, 120 + totalItems * 80)
  }

  return {
    close: () => timers.forEach((timer) => globalThis.clearTimeout(timer)),
  }
}
