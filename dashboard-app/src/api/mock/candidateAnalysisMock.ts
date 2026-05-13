import type {
  CandidateStashAnalysisHandlers,
  CandidateStashAnalysisProgressEvent,
} from '../types'
import type { CandidateItemRecord, CandidateStashRecord } from './records'
import { sleep } from './utils'

type CandidateAnalysisJob = {
  stashUuid: string
  items: CandidateItemRecord[]
}

type CandidateAnalysisMockDeps = {
  findCandidateStashForOwner: (stashUuid: string, ownerUserUuid?: string) => CandidateStashRecord | null
  readCandidateItemsForStash: (stashUuid: string, ownerUserUuid?: string) => CandidateItemRecord[]
  getProductName: (skuGroupKey: string) => string | null
}

function buildCandidateAnalysisEvent(
  jobId: string,
  stashUuid: string,
  status: CandidateStashAnalysisProgressEvent['status'],
  totalItems: number,
  completedItems: number,
  message: string,
  getProductName: (skuGroupKey: string) => string | null,
  item?: CandidateItemRecord | null,
): CandidateStashAnalysisProgressEvent {
  return {
    jobId,
    stashUuid,
    status,
    totalItems,
    completedItems,
    currentItemUuid: item?.uuid ?? null,
    currentProductName: item
      ? (item.details?.drawer1?.summary?.productName ?? getProductName(item.skuGroupKey))
      : null,
    message,
    error: null,
  }
}

function closeTimers(timers: Array<ReturnType<typeof setTimeout>>) {
  timers.forEach((timer) => clearTimeout(timer))
}

export function createCandidateAnalysisMockApi({
  findCandidateStashForOwner,
  readCandidateItemsForStash,
  getProductName,
}: CandidateAnalysisMockDeps) {
  const candidateAnalysisJobs = new Map<string, CandidateAnalysisJob>()

  return {
    startCandidateStashAnalysis: async (stashUuid: string, ownerUserUuid?: string) => {
      await sleep(60)
      if (!findCandidateStashForOwner(stashUuid, ownerUserUuid)) {
        throw new Error('후보군을 찾을 수 없습니다.')
      }
      const items = readCandidateItemsForStash(stashUuid, ownerUserUuid)
      const jobId = `candidate-analysis-${stashUuid}-${Date.now()}`
      candidateAnalysisJobs.set(jobId, { stashUuid, items })
      return { jobId, stashUuid, itemCount: items.length }
    },

    subscribeCandidateStashAnalysis: (jobId: string, handlers: CandidateStashAnalysisHandlers) => {
      const job = candidateAnalysisJobs.get(jobId)
      let closed = false
      const timers: Array<ReturnType<typeof setTimeout>> = []
      const queue = (delayMs: number, fn: () => void) => {
        const timer = setTimeout(() => {
          if (!closed) fn()
        }, delayMs)
        timers.push(timer)
      }
      const closeFromServer = () => {
        if (closed) return
        closed = true
        closeTimers(timers)
        handlers.onClose?.()
      }
      const emit = (event: CandidateStashAnalysisProgressEvent) => {
        if (!closed) handlers.onEvent(event)
      }

      if (!job) {
        queue(0, () => {
          handlers.onError?.(new Error(`후보군 분석 작업을 찾을 수 없습니다: ${jobId}`))
          closeFromServer()
        })
        return {
          close: () => {
            closed = true
            closeTimers(timers)
          },
        }
      }

      const totalItems = job.items.length
      queue(0, () => emit(buildCandidateAnalysisEvent(
        jobId,
        job.stashUuid,
        'queued',
        totalItems,
        0,
        '백엔드가 후보군 아이템 AI 분석 작업을 접수했습니다.',
        getProductName,
      )))

      if (totalItems === 0) {
        queue(260, () => {
          emit(buildCandidateAnalysisEvent(
            jobId,
            job.stashUuid,
            'completed',
            0,
            0,
            '분석할 후보 아이템이 없습니다.',
            getProductName,
          ))
          closeFromServer()
        })
        return {
          close: () => {
            closed = true
            closeTimers(timers)
          },
        }
      }

      job.items.forEach((item, index) => {
        const productName = item.details?.drawer1?.summary?.productName ?? item.skuGroupKey
        queue(260 + (index * 420), () => emit(buildCandidateAnalysisEvent(
          jobId,
          job.stashUuid,
          'running',
          totalItems,
          index,
          `${productName} 아이템을 AI로 분석하는 중입니다.`,
          getProductName,
          item,
        )))
        queue(480 + (index * 420), () => emit(buildCandidateAnalysisEvent(
          jobId,
          job.stashUuid,
          'running',
          totalItems,
          index + 1,
          `${productName} 분석이 완료되었습니다.`,
          getProductName,
          item,
        )))
      })
      queue(700 + (totalItems * 420), () => {
        emit(buildCandidateAnalysisEvent(
          jobId,
          job.stashUuid,
          'completed',
          totalItems,
          totalItems,
          `후보 아이템 ${totalItems}건의 AI 분석이 완료되었습니다.`,
          getProductName,
        ))
        closeFromServer()
      })

      return {
        close: () => {
          closed = true
          closeTimers(timers)
        },
      }
    },
  }
}
