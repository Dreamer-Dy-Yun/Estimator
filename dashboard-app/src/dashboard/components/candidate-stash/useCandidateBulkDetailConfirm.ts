import { useCallback, useEffect, useRef, useState } from 'react'
import {
  getApiErrorDisplayMessage,
  startCandidateDetailBulkConfirm,
  subscribeCandidateDetailBulkConfirm,
  type CandidateDetailBulkConfirmProgressEvent,
  type CandidateDetailBulkConfirmSubscription,
  type CandidateItemDetail,
} from '../../../api'

type MountedRef = { current: boolean }

export interface CandidateBulkDetailConfirmProgress {
  open: boolean
  status: CandidateDetailBulkConfirmProgressEvent['status']
  totalItems: number
  completedItems: number
  currentProductName?: string
  message: string
  error?: string
}

interface Args {
  stashUuid: string
  companyUuid?: string
  dataReferencePeriodStart: string
  dataReferencePeriodEnd: string
  mountedRef: MountedRef
  onItemsConfirmed: (updatedItems: CandidateItemDetail[]) => void
  showToast: (message: string, options?: { variant?: 'success' | 'error' }) => void
}

const CLOSE_DELAY_MS = 4000

function getStreamErrorMessage(error: unknown): string {
  return getApiErrorDisplayMessage(error, '상세 일괄확정 연결에 실패했습니다.')
}

export function useCandidateBulkDetailConfirm({
  stashUuid,
  companyUuid,
  dataReferencePeriodStart,
  dataReferencePeriodEnd,
  mountedRef,
  onItemsConfirmed,
  showToast,
}: Args) {
  const [bulkConfirmBusy, setBulkConfirmBusy] = useState(false)
  const [bulkConfirmProgress, setBulkConfirmProgress] = useState<CandidateBulkDetailConfirmProgress | null>(null)
  const subscriptionRef = useRef<CandidateDetailBulkConfirmSubscription | null>(null)
  const closeTimerRef = useRef<ReturnType<typeof window.setTimeout> | null>(null)
  const progressRef = useRef<CandidateBulkDetailConfirmProgress | null>(null)
  const sequenceRef = useRef(0)

  const setProgress = useCallback((next: CandidateBulkDetailConfirmProgress | null) => {
    progressRef.current = next
    setBulkConfirmProgress(next)
  }, [])

  const isCurrentSequence = useCallback((sequence: number) => (
    mountedRef.current && sequenceRef.current === sequence
  ), [mountedRef])

  const closeSubscription = useCallback(() => {
    subscriptionRef.current?.close()
    subscriptionRef.current = null
  }, [])

  const closeProgress = useCallback(() => {
    if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current)
    closeTimerRef.current = null
    setProgress(null)
  }, [setProgress])

  useEffect(() => () => {
    closeSubscription()
    if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current)
  }, [closeSubscription])

  const scheduleClose = useCallback((sequence: number) => {
    if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current)
    closeTimerRef.current = window.setTimeout(() => {
      if (!isCurrentSequence(sequence)) return
      setProgress(null)
      closeTimerRef.current = null
    }, CLOSE_DELAY_MS)
  }, [isCurrentSequence, setProgress])

  const applyProgressEvent = useCallback((event: CandidateDetailBulkConfirmProgressEvent, sequence: number) => {
    if (!isCurrentSequence(sequence)) return false
    if (event.updatedItem) onItemsConfirmed([event.updatedItem])
    setProgress({
      open: true,
      status: event.status,
      totalItems: event.totalItems,
      completedItems: event.completedItems,
      currentProductName: event.currentProductName,
      message: event.message,
      error: event.error,
    })
    return true
  }, [isCurrentSequence, onItemsConfirmed, setProgress])

  const confirmBulkDetailItems = useCallback(async (itemUuids: string[]) => {
    const uniqueUuids = [...new Set(itemUuids)]
    if (!uniqueUuids.length || !dataReferencePeriodStart || !dataReferencePeriodEnd) return
    if (!companyUuid) {
      showToast('오더 후보군은 회사 선택이 필요합니다.', { variant: 'error' })
      return
    }
    const sequence = sequenceRef.current + 1
    sequenceRef.current = sequence
    setBulkConfirmBusy(true)
    closeSubscription()
    closeProgress()
    setProgress({
      open: true,
      status: 'queued',
      totalItems: uniqueUuids.length,
      completedItems: 0,
      message: '상세 일괄확정 작업을 요청했습니다.',
    })
    try {
      const start = await startCandidateDetailBulkConfirm({
        stashUuid,
        companyUuid,
        itemUuids: uniqueUuids,
        dataReferencePeriodStart,
        dataReferencePeriodEnd,
      })
      if (!isCurrentSequence(sequence)) return
      await new Promise<void>((resolve, reject) => {
        subscriptionRef.current = subscribeCandidateDetailBulkConfirm(start.jobId, (event) => {
          if (!applyProgressEvent(event, sequence)) {
            resolve()
            return
          }
          if (event.status === 'completed') {
            closeSubscription()
            setBulkConfirmBusy(false)
            showToast('상세 일괄확정이 완료되었습니다.')
            scheduleClose(sequence)
            resolve()
            return
          }
          if (event.status === 'failed') {
            closeSubscription()
            setBulkConfirmBusy(false)
            showToast('상세 일괄확정이 실패했습니다.', { variant: 'error' })
            scheduleClose(sequence)
            reject(new Error(event.error ?? event.message))
          }
        }, (error) => {
          if (!isCurrentSequence(sequence)) {
            resolve()
            return
          }
          closeSubscription()
          reject(error instanceof Error ? error : new Error(getStreamErrorMessage(error)))
        }, { companyUuid })
      })
    } catch (err) {
      if (!isCurrentSequence(sequence)) return
      const previousProgress = progressRef.current
      const failedProgressMessage = previousProgress?.status === 'failed'
        ? previousProgress.error ?? previousProgress.message
        : undefined
      const message = failedProgressMessage ?? getApiErrorDisplayMessage(err, '상세 일괄확정에 실패했습니다.')
      setBulkConfirmBusy(false)
      setProgress({
        open: true,
        status: 'failed',
        totalItems: previousProgress?.totalItems ?? uniqueUuids.length,
        completedItems: previousProgress?.completedItems ?? 0,
        currentProductName: previousProgress?.currentProductName,
        message,
        error: message,
      })
      showToast(message, { variant: 'error' })
      scheduleClose(sequence)
      throw err
    }
  }, [
    applyProgressEvent,
    closeProgress,
    closeSubscription,
    companyUuid,
    dataReferencePeriodEnd,
    dataReferencePeriodStart,
    isCurrentSequence,
    scheduleClose,
    showToast,
    stashUuid,
    setProgress,
  ])

  return {
    bulkConfirmBusy,
    bulkConfirmProgress,
    closeBulkConfirmProgress: closeProgress,
    confirmBulkDetailItems,
  }
}
