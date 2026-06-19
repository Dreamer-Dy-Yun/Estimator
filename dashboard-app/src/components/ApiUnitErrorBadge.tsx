import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import type { ApiUnitErrorInfo } from '../types'
import { copyToClipboard } from '../utils/copyToClipboard'
import styles from './ApiUnitErrorBadge.module.css'

export type Props = {
  error: ApiUnitErrorInfo | null
}

type CopyStatusState = {
  readonly status: 'copied' | 'failed'
  readonly detail: string
}

export function ApiUnitErrorBadge({ error }: Props) : React.JSX.Element | null {
  const [copyStatusState, setCopyStatusState]: [CopyStatusState | null, React.Dispatch<React.SetStateAction<CopyStatusState | null>>] = useState<CopyStatusState | null>(null)
  const tooltipId: string = useId()
  const statusId: string = useId()
  const mountedRef: React.RefObject<boolean> = useRef(false)
  const copySequenceRef: React.RefObject<number> = useRef(0)
  const copiedResetTimerRef: React.RefObject<number | null> = useRef<number | null>(null)
  const detail: string = useMemo(() : string => {
    if (!error) return ''
    return [
      `에러 확인시간: ${error.checkedAt}`,
      `페이지: ${error.page}`,
      `호출 내용: ${error.request}`,
      `에러 내용: ${error.error}`,
    ].join('\n')
  }, [error])

  const clearCopiedResetTimer: () => void = useCallback(() : void => {
    if (copiedResetTimerRef.current == null) return
    window.clearTimeout(copiedResetTimerRef.current)
    copiedResetTimerRef.current = null
  }, [])

  useEffect(() : () => void => {
    mountedRef.current = true
    return () : void => {
      mountedRef.current = false
      clearCopiedResetTimer()
    }
  }, [clearCopiedResetTimer])

  useEffect(() : void => {
    copySequenceRef.current += 1
    clearCopiedResetTimer()
  }, [clearCopiedResetTimer, detail])

  const handleCopy: () => Promise<void> = useCallback(async () : Promise<void> => {
    const copySequence: number = copySequenceRef.current + 1
    copySequenceRef.current = copySequence
    const copied: boolean = await copyToClipboard(detail)
    if (!copied) {
      if (!mountedRef.current || copySequenceRef.current !== copySequence) return
      clearCopiedResetTimer()
      setCopyStatusState({ status: 'failed', detail })
      copiedResetTimerRef.current = window.setTimeout(() : void => {
        copiedResetTimerRef.current = null
        if (mountedRef.current && copySequenceRef.current === copySequence) setCopyStatusState(null)
      }, 1200)
      return
    }
    if (!mountedRef.current || copySequenceRef.current !== copySequence) return
    clearCopiedResetTimer()
    setCopyStatusState({ status: 'copied', detail })
    copiedResetTimerRef.current = window.setTimeout(() : void => {
      copiedResetTimerRef.current = null
      if (mountedRef.current && copySequenceRef.current === copySequence) setCopyStatusState(null)
    }, 1200)
  }, [clearCopiedResetTimer, detail])

  if (!error) return null

  const copyStatus: 'idle' | 'copied' | 'failed' = copyStatusState?.detail === detail ? copyStatusState.status : 'idle'
  const copied: boolean = copyStatus === 'copied'

  return (
    <span className={styles.wrapper}>
      <button
        type="button"
        onClick={handleCopy}
        className={styles.badge}
        aria-label={copied ? '에러 정보 복사됨' : '에러 정보 복사'}
        aria-describedby={`${tooltipId} ${statusId}`}
      >
        {copied ? 'COPIED' : 'ERROR'}
      </button>
      <span id={statusId} className={styles.srOnly} role="status" aria-live="polite">
        {copyStatus === 'copied' ? '복사되었습니다.' : copyStatus === 'failed' ? '복사에 실패했습니다.' : ''}
      </span>
      <span id={tooltipId} className={styles.tooltip} role="tooltip">
        <span className={styles.tooltipActionHint}>
          <span className={styles.tooltipIcon} aria-hidden="true">i</span>
          <span>클릭하면 복사됩니다.</span>
        </span>
        <span className={styles.tooltipDetail}>{detail}</span>
      </span>
    </span>
  )
}
