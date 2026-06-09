import { useEffect, useState } from 'react'
import { getComparisonSubjectKey, getProductDrawerBundle, type ProductComparisonBaseSubjectRef, type ProductDrawerBundle } from '../../api'

const DEFAULT_PRODUCT_DRAWER_BASE_SUBJECT: ProductComparisonBaseSubjectRef = { role: 'base', kind: 'self-company' }

export type UseProductDrawerBundleOptions = {
  baseSubject?: ProductComparisonBaseSubjectRef
  /**
   * `true`(기본): 새 품번 fetch 동안에도 **이전 번들**을 반환해 `summary`가 잠깐 `null`이 되지 않음 → 드로어가 언마운트되지 않아 2차 드로워가 유지됨.
   * `false`: 캐시 품번이 현재 선택과 일치할 때만 반환(이너 후보: 스냅샷·번들 id 불일치 방지).
   */
  allowStaleWhileRevalidate?: boolean
}

export type ProductDrawerBundleCache = {
  skuGroupKey: string
  baseSubjectKey: string
  bundle: ProductDrawerBundle
} | null

export type ProductDrawerBundleRequestState = {
  skuGroupKey: string | null
  baseSubjectKey: string | null
  loading: boolean
}


/** Hook 외부에서도 재사용 가능한 번들 선택 규칙(순수 함수). */
export function pickProductDrawerBundleFromCache(
  selectedSkuGroupKey: string | null,
  cache: ProductDrawerBundleCache,
  allowStaleWhileRevalidate: boolean,
  baseSubject: ProductComparisonBaseSubjectRef,
): ProductDrawerBundle | null {
  if (!selectedSkuGroupKey) return null
  if (!cache) return null
  if (cache.baseSubjectKey !== getComparisonSubjectKey(baseSubject)) return null
  if (!allowStaleWhileRevalidate && cache.skuGroupKey !== selectedSkuGroupKey) return null
  return cache.bundle
}

/** 1차 드로어: 품번 선택 시 자사 요약 번들만 로드. id 없으면 null. */
export function useProductDrawerBundleState(
  selectedSkuGroupKey: string | null,
  options?: UseProductDrawerBundleOptions,
) : { bundle: ProductDrawerBundle | null; loading: boolean; } {
  const allowStale: boolean = options?.allowStaleWhileRevalidate !== false
  const baseSubject: ProductComparisonBaseSubjectRef = options?.baseSubject ?? DEFAULT_PRODUCT_DRAWER_BASE_SUBJECT
  const baseSubjectKey: string = getComparisonSubjectKey(baseSubject)
  const [cache, setCache]: [ProductDrawerBundleCache, React.Dispatch<React.SetStateAction<ProductDrawerBundleCache>>] = useState<ProductDrawerBundleCache>(null)
  const [requestState, setRequestState]: [ProductDrawerBundleRequestState, React.Dispatch<React.SetStateAction<ProductDrawerBundleRequestState>>] = useState<ProductDrawerBundleRequestState>({
    skuGroupKey: null,
    baseSubjectKey: null,
    loading: false,
  })

  useEffect(() : (() => void) | undefined => {
    if (!selectedSkuGroupKey) {
      queueMicrotask(() : void => setRequestState({ skuGroupKey: null, baseSubjectKey: null, loading: false }))
      return
    }
    let alive: boolean = true
    queueMicrotask(() : void => {
      if (alive) setRequestState({ skuGroupKey: selectedSkuGroupKey, baseSubjectKey, loading: true })
    })
    getProductDrawerBundle(selectedSkuGroupKey, { base: baseSubject })
      .then((data: ProductDrawerBundle) : void => {
        if (alive) setCache({ skuGroupKey: selectedSkuGroupKey, baseSubjectKey, bundle: data })
      })
      .catch(() : void => {
        // 네트워크/목업 실패 시 이전 품번 캐시 오염을 막기 위해 현재 선택 품번 캐시를 비운다.
        if (alive) {
          setCache((prev: ProductDrawerBundleCache) : ProductDrawerBundleCache => (
            prev?.skuGroupKey === selectedSkuGroupKey && prev.baseSubjectKey === baseSubjectKey ? null : prev
          ))
        }
      })
      .finally(() : void => {
        if (alive) setRequestState({ skuGroupKey: selectedSkuGroupKey, baseSubjectKey, loading: false })
      })
    return () : void => {
      alive = false
    }
  }, [baseSubject, baseSubjectKey, selectedSkuGroupKey])

  const bundle: ProductDrawerBundle | null = pickProductDrawerBundleFromCache(selectedSkuGroupKey, cache, allowStale, baseSubject)
  const loading: boolean = Boolean(
    selectedSkuGroupKey &&
      requestState.skuGroupKey === selectedSkuGroupKey &&
      requestState.baseSubjectKey === baseSubjectKey &&
      requestState.loading &&
      (!bundle || !allowStale),
  )

  return { bundle, loading }
}

/** 1차 드로어: 기존 호출부용 bundle-only wrapper. */
export function useProductDrawerBundle(
  selectedSkuGroupKey: string | null,
  options?: UseProductDrawerBundleOptions,
) : ProductDrawerBundle | null {
  return useProductDrawerBundleState(selectedSkuGroupKey, options).bundle
}
