import { useEffect, useState } from 'react'
import { getProductSummaryBundle, type ProductSummaryBundle } from '../../api'

/** 1차 드로어: 품번 선택 시 요약 번들 로드. id 없으면 null */
export function useProductSummaryBundle(selectedId: string | null) {
  const [cache, setCache] = useState<{ id: string; bundle: ProductSummaryBundle } | null>(null)

  useEffect(() => {
    if (!selectedId) return
    let alive = true
    getProductSummaryBundle(selectedId).then((data) => {
      if (alive) setCache({ id: selectedId, bundle: data })
    })
    return () => { alive = false }
  }, [selectedId])

  return selectedId && cache?.id === selectedId ? cache.bundle : null
}
