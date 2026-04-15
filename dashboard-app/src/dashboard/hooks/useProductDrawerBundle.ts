import { useEffect, useState } from 'react'
import { getProductDrawerBundle, type ProductDrawerBundle } from '../../api'

/** 1차 드로어: 품번 선택 시 자사 요약·재고 번들만 로드. id 없으면 null. `forecastMonths`는 판매추이(월간) 포캐스트 개월 수. */
export function useProductDrawerBundle(selectedId: string | null, forecastMonths: number) {
  const [cache, setCache] = useState<{ id: string; bundle: ProductDrawerBundle } | null>(null)

  useEffect(() => {
    if (!selectedId) return
    let alive = true
    const fc = Math.max(1, Math.min(24, Math.round(forecastMonths)))
    getProductDrawerBundle(selectedId, { forecastMonths: fc }).then((data) => {
      if (alive) setCache({ id: selectedId, bundle: data })
    })
    return () => {
      alive = false
    }
  }, [selectedId, forecastMonths])

  if (!selectedId) return null
  if (!cache || cache.id !== selectedId) return null
  return cache.bundle
}
