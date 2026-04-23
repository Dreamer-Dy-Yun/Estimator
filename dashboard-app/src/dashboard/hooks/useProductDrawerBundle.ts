import { useEffect, useState } from 'react'
import { getProductDrawerBundle, type ProductDrawerBundle } from '../../api'

export type UseProductDrawerBundleOptions = {
  /**
   * `true`(기본): 새 품번 fetch 동안에도 **이전 번들**을 반환해 `summary`가 잠깐 `null`이 되지 않음 → 드로어가 언마운트되지 않아 2차 패널이 유지됨.
   * `false`: 캐시 품번이 현재 선택과 일치할 때만 반환(이너 후보: 스냅샷·번들 id 불일치 방지).
   */
  allowStaleWhileRevalidate?: boolean
}

export type ProductDrawerBundleCache = {
  id: string
  bundle: ProductDrawerBundle
} | null

/** Hook 외부에서도 재사용 가능한 번들 선택 규칙(순수 함수). */
export function pickProductDrawerBundleFromCache(
  selectedId: string | null,
  cache: ProductDrawerBundleCache,
  allowStaleWhileRevalidate: boolean,
): ProductDrawerBundle | null {
  if (!selectedId) return null
  if (!cache) return null
  if (!allowStaleWhileRevalidate && cache.id !== selectedId) return null
  return cache.bundle
}

/** 1차 드로어: 품번 선택 시 자사 요약·재고 번들만 로드. id 없으면 null. `forecastMonths`는 판매추이(월간) 포캐스트 개월 수. */
export function useProductDrawerBundle(
  selectedId: string | null,
  forecastMonths: number,
  options?: UseProductDrawerBundleOptions,
) {
  const allowStale = options?.allowStaleWhileRevalidate !== false
  const [cache, setCache] = useState<ProductDrawerBundleCache>(null)

  useEffect(() => {
    if (!selectedId) {
      setCache(null)
      return
    }
    let alive = true
    const fc = Math.max(1, Math.min(24, Math.round(forecastMonths)))
    getProductDrawerBundle(selectedId, { forecastMonths: fc })
      .then((data) => {
        if (alive) setCache({ id: selectedId, bundle: data })
      })
      .catch(() => {
        // 네트워크/목업 실패 시 이전 품번 캐시 오염을 막기 위해 현재 선택 품번 캐시를 비운다.
        if (alive) setCache((prev) => (prev?.id === selectedId ? null : prev))
      })
    return () => {
      alive = false
    }
  }, [selectedId, forecastMonths])

  return pickProductDrawerBundleFromCache(selectedId, cache, allowStale)
}
