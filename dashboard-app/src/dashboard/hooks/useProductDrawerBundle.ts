import { useEffect, useState } from 'react'
import { getProductDrawerBundle, type ProductDrawerBundle } from '../../api'

export type UseProductDrawerBundleOptions = {
  /**
   * `true`(기본): 새 품번 fetch 동안에도 **이전 번들**을 반환해 `summary`가 잠깐 `null`이 되지 않음 → 드로어가 언마운트되지 않아 2차 드로워가 유지됨.
   * `false`: 캐시 품번이 현재 선택과 일치할 때만 반환(이너 후보: 스냅샷·번들 id 불일치 방지).
   */
  allowStaleWhileRevalidate?: boolean
}

export type ProductDrawerBundleCache = {
  skuGroupKey: string
  bundle: ProductDrawerBundle
} | null

type ProductDrawerBundleRequestState = {
  skuGroupKey: string | null
  loading: boolean
}

/** Hook 외부에서도 재사용 가능한 번들 선택 규칙(순수 함수). */
export function pickProductDrawerBundleFromCache(
  selectedSkuGroupKey: string | null,
  cache: ProductDrawerBundleCache,
  allowStaleWhileRevalidate: boolean,
): ProductDrawerBundle | null {
  if (!selectedSkuGroupKey) return null
  if (!cache) return null
  if (!allowStaleWhileRevalidate && cache.skuGroupKey !== selectedSkuGroupKey) return null
  return cache.bundle
}

/** 1차 드로어: 품번 선택 시 자사 요약 번들만 로드. id 없으면 null. */
export function useProductDrawerBundleState(
  selectedSkuGroupKey: string | null,
  options?: UseProductDrawerBundleOptions,
) {
  const allowStale = options?.allowStaleWhileRevalidate !== false
  const [cache, setCache] = useState<ProductDrawerBundleCache>(null)
  const [requestState, setRequestState] = useState<ProductDrawerBundleRequestState>({
    skuGroupKey: null,
    loading: false,
  })

  useEffect(() => {
    if (!selectedSkuGroupKey) {
      queueMicrotask(() => setRequestState({ skuGroupKey: null, loading: false }))
      return
    }
    let alive = true
    queueMicrotask(() => {
      if (alive) setRequestState({ skuGroupKey: selectedSkuGroupKey, loading: true })
    })
    getProductDrawerBundle(selectedSkuGroupKey)
      .then((data) => {
        if (alive) setCache({ skuGroupKey: selectedSkuGroupKey, bundle: data })
      })
      .catch(() => {
        // 네트워크/목업 실패 시 이전 품번 캐시 오염을 막기 위해 현재 선택 품번 캐시를 비운다.
        if (alive) setCache((prev) => (prev?.skuGroupKey === selectedSkuGroupKey ? null : prev))
      })
      .finally(() => {
        if (alive) setRequestState({ skuGroupKey: selectedSkuGroupKey, loading: false })
      })
    return () => {
      alive = false
    }
  }, [selectedSkuGroupKey])

  const bundle = pickProductDrawerBundleFromCache(selectedSkuGroupKey, cache, allowStale)
  const loading = Boolean(
    selectedSkuGroupKey &&
      requestState.skuGroupKey === selectedSkuGroupKey &&
      requestState.loading &&
      (!bundle || !allowStale),
  )

  return { bundle, loading }
}

/** 1차 드로어: 기존 호출부용 bundle-only wrapper. */
export function useProductDrawerBundle(
  selectedSkuGroupKey: string | null,
  options?: UseProductDrawerBundleOptions,
) {
  return useProductDrawerBundleState(selectedSkuGroupKey, options).bundle
}
