import { useEffect, useRef, useState } from 'react'

type DashboardRequestState<T> = {
  data: T
  loading: boolean
}

export function useDashboardRequest<T>(
  request: () => Promise<T>,
  fallbackData: T,
): DashboardRequestState<T> {
  const requestSeqRef = useRef(0)
  const [data, setData] = useState<T>(fallbackData)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    const reqSeq = ++requestSeqRef.current

    queueMicrotask(() => {
      if (alive && reqSeq === requestSeqRef.current) setLoading(true)
    })

    void request()
      .then((nextData) => {
        if (alive && reqSeq === requestSeqRef.current) setData(nextData)
      })
      .catch(() => {
        if (alive && reqSeq === requestSeqRef.current) setData(fallbackData)
      })
      .finally(() => {
        if (alive && reqSeq === requestSeqRef.current) setLoading(false)
      })

    return () => {
      alive = false
    }
  }, [fallbackData, request])

  return { data, loading }
}
