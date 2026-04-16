import { useMemo, useState } from 'react'
import type { ApiUnitErrorInfo } from '../types'

type Props = {
  error: ApiUnitErrorInfo | null
}

export function ApiUnitErrorBadge({ error }: Props) {
  const [copied, setCopied] = useState(false)
  const detail = useMemo(() => {
    if (!error) return ''
    return [
      `에러 확인시간: ${error.checkedAt}`,
      `페이지: ${error.page}`,
      `호출 내용: ${error.request}`,
      `에러 내용: ${error.error}`,
    ].join('\n')
  }, [error])

  if (!error) return null

  return (
    <button
      type="button"
      title={detail}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(detail)
          setCopied(true)
          window.setTimeout(() => setCopied(false), 1200)
        } catch {
          setCopied(false)
        }
      }}
      style={{
        marginLeft: 8,
        padding: '2px 6px',
        borderRadius: 6,
        border: '1px solid #dc2626',
        background: '#fee2e2',
        color: '#991b1b',
        fontSize: 11,
        fontWeight: 700,
        cursor: 'pointer',
      }}
      aria-label={copied ? '에러 정보 복사됨' : '에러 정보 복사'}
    >
      {copied ? 'COPIED' : 'ERROR'}
    </button>
  )
}
