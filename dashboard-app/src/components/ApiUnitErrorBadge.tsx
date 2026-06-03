import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ApiUnitErrorInfo } from '../types'
import styles from './ApiUnitErrorBadge.module.css'

export type Props = {
  error: ApiUnitErrorInfo | null
}

export function ApiUnitErrorBadge({ error }: Props) : React.JSX.Element | null {
  const [copiedDetail, setCopiedDetail]: [string | null, React.Dispatch<React.SetStateAction<string | null>>] = useState<string | null>(null)
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
    try {
      await navigator.clipboard.writeText(detail)
      if (!mountedRef.current || copySequenceRef.current !== copySequence) return
      clearCopiedResetTimer()
      setCopiedDetail(detail)
      copiedResetTimerRef.current = window.setTimeout(() : void => {
        copiedResetTimerRef.current = null
        if (mountedRef.current && copySequenceRef.current === copySequence) setCopiedDetail(null)
      }, 1200)
    } catch {
      if (!mountedRef.current || copySequenceRef.current !== copySequence) return
      clearCopiedResetTimer()
      setCopiedDetail(null)
    }
  }, [clearCopiedResetTimer, detail])

  if (!error) return null

  const copied: boolean = copiedDetail === detail

  return (
    <button
      type="button"
      title={detail}
      onClick={handleCopy}
      className={styles.badge}
      aria-label={copied ? '에러 정보 복사됨' : '에러 정보 복사'}
    >
      {copied ? 'COPIED' : 'ERROR'}
    </button>
  )
}
