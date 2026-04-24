import { useCallback, useEffect, useState } from 'react'
import { copyToClipboard } from '../../utils/copyToClipboard'
import styles from './CopyToastBanner.module.css'

const DEFAULT_MESSAGE = '정보가 클립보드에 복사되었습니다.'

export function useCopyToastMessage(durationMs = 2800) {
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!message) return
    const id = window.setTimeout(() => setMessage(null), durationMs)
    return () => window.clearTimeout(id)
  }, [message, durationMs])

  const notifyCopied = useCallback(() => {
    setMessage(DEFAULT_MESSAGE)
  }, [])

  const copyAndNotify = useCallback(
    async (text: string) => {
      const ok = await copyToClipboard(text)
      if (ok) notifyCopied()
    },
    [notifyCopied],
  )

  return { toastMessage: message, copyAndNotify }
}

export function CopyToastBanner({ message }: { message: string | null }) {
  if (!message) return null
  return (
    <div className={styles.root} role="status" aria-live="polite">
      {message}
    </div>
  )
}
