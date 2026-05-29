import { useEffect, useRef, useState } from 'react'

export type DashboardRequestError = {
  message: string
}

export type DashboardRequestState<T> = {
  data: T
  dataKey: string | null
  requestKey: string
  loading: boolean
  isRefreshing: boolean
  error: DashboardRequestError | null
  lastUpdatedAt: string | null
  isStale: boolean
}

function toRequestError(error: unknown): DashboardRequestError {
  if (error instanceof Error && error.message.trim()) return { message: error.message }
  return { message: '요청에 실패했습니다.' }
}

export function useDashboardRequest<T>(
  request: () => Promise<T>,
  initialData: T,
  requestKey = 'default',
): DashboardRequestState<T> {
  const requestSeqRef = useRef(0)
  const hasLoadedRef = useRef(false)
  const [data, setData] = useState<T>(initialData)
  const [dataKey, setDataKey] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<DashboardRequestError | null>(null)
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    const reqSeq = ++requestSeqRef.current

    queueMicrotask(() => {
      if (!alive || reqSeq !== requestSeqRef.current) return
      if (hasLoadedRef.current) {
        setIsRefreshing(true)
      } else {
        setLoading(true)
      }
    })

    void request()
      .then((nextData) => {
        if (!alive || reqSeq !== requestSeqRef.current) return
        hasLoadedRef.current = true
        setData(nextData)
        setDataKey(requestKey)
        setError(null)
        setLastUpdatedAt(new Date().toISOString())
      })
      .catch((nextError: unknown) => {
        if (!alive || reqSeq !== requestSeqRef.current) return
        if (!hasLoadedRef.current) {
          setData(initialData)
          setDataKey(null)
        }
        setError(toRequestError(nextError))
      })
      .finally(() => {
        if (!alive || reqSeq !== requestSeqRef.current) return
        setLoading(false)
        setIsRefreshing(false)
      })

    return () => {
      alive = false
    }
  }, [initialData, request, requestKey])

  return {
    data,
    dataKey,
    requestKey,
    loading,
    isRefreshing,
    error,
    lastUpdatedAt,
    isStale: Boolean(error && lastUpdatedAt),
  }
}
