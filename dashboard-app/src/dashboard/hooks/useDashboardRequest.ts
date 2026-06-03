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
  requestKey: string = 'default',
): DashboardRequestState<T> {
  const requestSeqRef: React.RefObject<number> = useRef(0)
  const hasLoadedRef: React.RefObject<boolean> = useRef(false)
  const [data, setData]: [T, React.Dispatch<React.SetStateAction<T>>] = useState<T>(initialData)
  const [dataKey, setDataKey]: [string | null, React.Dispatch<React.SetStateAction<string | null>>] = useState<string | null>(null)
  const [loading, setLoading]: [boolean, React.Dispatch<React.SetStateAction<boolean>>] = useState(true)
  const [isRefreshing, setIsRefreshing]: [boolean, React.Dispatch<React.SetStateAction<boolean>>] = useState(false)
  const [error, setError]: [DashboardRequestError | null, React.Dispatch<React.SetStateAction<DashboardRequestError | null>>] = useState<DashboardRequestError | null>(null)
  const [lastUpdatedAt, setLastUpdatedAt]: [string | null, React.Dispatch<React.SetStateAction<string | null>>] = useState<string | null>(null)

  useEffect(() : () => void => {
    let alive: boolean = true
    const reqSeq: number = ++requestSeqRef.current

    queueMicrotask(() : void => {
      if (!alive || reqSeq !== requestSeqRef.current) return
      if (hasLoadedRef.current) {
        setIsRefreshing(true)
      } else {
        setLoading(true)
      }
    })

    void request()
      .then((nextData: T) : void => {
        if (!alive || reqSeq !== requestSeqRef.current) return
        hasLoadedRef.current = true
        setData(nextData)
        setDataKey(requestKey)
        setError(null)
        setLastUpdatedAt(new Date().toISOString())
      })
      .catch((nextError: unknown) : void => {
        if (!alive || reqSeq !== requestSeqRef.current) return
        if (!hasLoadedRef.current) {
          setData(initialData)
          setDataKey(null)
        }
        setError(toRequestError(nextError))
      })
      .finally(() : void => {
        if (!alive || reqSeq !== requestSeqRef.current) return
        setLoading(false)
        setIsRefreshing(false)
      })

    return () : void => {
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
