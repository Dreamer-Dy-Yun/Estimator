import type { ProductDrawerBundle } from '../../api'
import type { OrderSnapshotDocumentV1 } from '../../snapshot/orderSnapshotTypes'
import type { ProductPrimarySummary } from '../../types'

/**
 * 이너 후보: API 번들 + 오더 스냅샷 1차 요약 병합.
 * `allowStaleWhileRevalidate: false` 일 때 품번 전환 직후 번들이 잠깐 비면
 * 스냅만으로 1차 요약을 유지해 드로어 언마운트·뷰포트 깜빡임을 막는다.
 */
export function mergePrimarySummaryFromBundleAndSnapshot(
  drawerProductId: string | null,
  bundle: ProductDrawerBundle | null,
  hydrateSnap: OrderSnapshotDocumentV1 | null,
): ProductPrimarySummary | null {
  if (!drawerProductId) return null
  const snap1 = hydrateSnap?.drawer1?.summary
  const snapMatches = hydrateSnap?.productId === drawerProductId

  if (bundle) {
    if (!snap1 || !snapMatches) return bundle.summary
    return {
      ...bundle.summary,
      ...snap1,
      monthlySalesTrend: bundle.summary.monthlySalesTrend,
    }
  }

  if (snapMatches && snap1) {
    return { ...snap1, monthlySalesTrend: [] }
  }

  return null
}
