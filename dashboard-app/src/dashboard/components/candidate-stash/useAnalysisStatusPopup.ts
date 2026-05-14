import { useEffect, useMemo, useState } from 'react'
import type { CandidateStashAnalysisProgressEvent } from '../../../api'

const AUTO_DISMISS_SECONDS = 5

type Args = {
  stashUuid: string
  progress: CandidateStashAnalysisProgressEvent | null
}

export function useAnalysisStatusPopup({ stashUuid, progress }: Args) {
  const [dismissedJobKey, setDismissedJobKey] = useState<string | null>(null)
  const [autoDismissState, setAutoDismissState] = useState<{
    key: string
    remainingSec: number
  } | null>(null)

  const jobKey = progress ? `${stashUuid}:${progress.jobId}` : null
  const isTerminal = progress?.status === 'completed' || progress?.status === 'failed'
  const show = Boolean(progress && jobKey && dismissedJobKey !== jobKey)
  const remainingSec =
    autoDismissState?.key === jobKey ? autoDismissState.remainingSec : AUTO_DISMISS_SECONDS

  const progressPct = useMemo(() => {
    if (!progress) return 0
    if (progress.totalItems <= 0) return progress.status === 'completed' ? 100 : 0
    return Math.max(0, Math.min(100, Math.round((progress.completedItems / progress.totalItems) * 100)))
  }, [progress])

  const statusLabel = (() => {
    switch (progress?.status) {
      case 'queued':
        return '대기'
      case 'running':
        return '처리중'
      case 'completed':
        return '완료'
      case 'failed':
        return '실패'
      default:
        return '대기'
    }
  })()

  useEffect(() => {
    if (!isTerminal || !jobKey || dismissedJobKey === jobKey) return
    const timer = window.setInterval(() => {
      setAutoDismissState((prev) => {
        const current = prev?.key === jobKey ? prev.remainingSec : AUTO_DISMISS_SECONDS
        const nextRemainingSec = Math.max(0, current - 1)
        if (nextRemainingSec === 0) setDismissedJobKey(jobKey)
        return { key: jobKey, remainingSec: nextRemainingSec }
      })
    }, 1000)
    return () => window.clearInterval(timer)
  }, [dismissedJobKey, isTerminal, jobKey])

  return {
    show,
    progressPct,
    statusLabel,
    isTerminal,
    remainingSec,
    dismiss: () => setDismissedJobKey(jobKey),
  }
}
