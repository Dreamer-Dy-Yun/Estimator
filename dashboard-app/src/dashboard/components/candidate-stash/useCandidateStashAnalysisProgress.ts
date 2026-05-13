import { useEffect, useRef, useState } from 'react'
import {
  startCandidateStashAnalysis,
  subscribeCandidateStashAnalysis,
  type CandidateStashAnalysisProgressEvent,
  type CandidateStashAnalysisSubscription,
} from '../../../api'

type Params = {
  stashUuid: string
  onCompleted: () => void
}

export function useCandidateStashAnalysisProgress({ stashUuid, onCompleted }: Params) {
  const [analysisProgress, setAnalysisProgress] = useState<CandidateStashAnalysisProgressEvent | null>(null)
  const [analysisError, setAnalysisError] = useState<string | null>(null)
  const requestSeqRef = useRef(0)

  useEffect(() => {
    let alive = true
    let subscription: CandidateStashAnalysisSubscription | null = null
    const closeSubscription = () => {
      const current = subscription
      subscription = null
      current?.close()
    }
    const requestSeq = requestSeqRef.current + 1
    requestSeqRef.current = requestSeq
    queueMicrotask(() => {
      if (!alive || requestSeqRef.current !== requestSeq) return
      setAnalysisError(null)
      setAnalysisProgress({
        jobId: '',
        stashUuid,
        status: 'queued',
        totalItems: 0,
        completedItems: 0,
        currentItemUuid: null,
        currentProductName: null,
        message: '후보군 오류를 AI 분석 요청 백엔드에 전송하는 중입니다.',
        error: null,
      })
    })

    void (async () => {
      try {
        const started = await startCandidateStashAnalysis(stashUuid)
        if (!alive || requestSeqRef.current !== requestSeq) return
        setAnalysisProgress({
          jobId: started.jobId,
          stashUuid: started.stashUuid,
          status: 'queued',
          totalItems: started.itemCount,
          completedItems: 0,
          currentItemUuid: null,
          currentProductName: null,
          message: '백엔드가 AI 분석 작업을 접수했습니다.',
          error: null,
        })
        subscription = subscribeCandidateStashAnalysis(started.jobId, {
          onEvent: (event) => {
            if (!alive || requestSeqRef.current !== requestSeq) return
            setAnalysisProgress(event)
            if (event.status === 'failed') {
              setAnalysisError(event.error ?? event.message)
              closeSubscription()
            }
            if (event.status === 'completed') {
              onCompleted()
              closeSubscription()
            }
          },
          onError: (err) => {
            if (!alive || requestSeqRef.current !== requestSeq) return
            setAnalysisError(err.message)
            setAnalysisProgress((prev) => prev
              ? { ...prev, status: 'failed', message: err.message, error: err.message }
              : null)
            closeSubscription()
          },
        })
      } catch (err) {
        if (!alive || requestSeqRef.current !== requestSeq) return
        const message = err instanceof Error ? err.message : '후보군 AI 분석 요청에 실패했습니다.'
        setAnalysisError(message)
        setAnalysisProgress((prev) => prev
          ? { ...prev, status: 'failed', message, error: message }
          : null)
        closeSubscription()
      }
    })()

    return () => {
      alive = false
      closeSubscription()
    }
  }, [onCompleted, stashUuid])

  return { analysisProgress, analysisError }
}
