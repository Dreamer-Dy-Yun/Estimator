import type { ProductDrawerBundle } from '../../api'
import type {
  OrderSnapshotDocumentV2,
  OrderSnapshotPrimarySummaryV2,
} from '../../snapshot/orderSnapshotTypes'
import type { ProductPrimarySummary } from '../../types'

type SnapshotPrimarySummary = Partial<OrderSnapshotPrimarySummaryV2>

function withoutUndefinedPrimaryFields<T extends object>(summary: T): Partial<T> {
  return Object.fromEntries(Object.entries(summary).filter(([, value]) => value !== undefined)) as Partial<T>
}

function mergeBundleSummaryWithSnapshotSummary(
  bundleSummary: ProductPrimarySummary,
  snapshotSummary: SnapshotPrimarySummary,
): ProductPrimarySummary {
  return {
    ...bundleSummary,
    ...withoutUndefinedPrimaryFields(snapshotSummary),
  }
}

/**
 * API bundle + order snapshot primary summary merge.
 * Current compact snapshots only override fields they persist.
 * Non-persisted summary fields must come from the live bundle.
 */
export function mergePrimarySummaryFromBundleAndSnapshot(
  drawerSkuGroupKey: string | null,
  bundle: ProductDrawerBundle | null,
  hydrateSnap: OrderSnapshotDocumentV2 | null,
): ProductPrimarySummary | null {
  if (!drawerSkuGroupKey) return null
  const snap1 = hydrateSnap?.drawer1?.summary as SnapshotPrimarySummary | undefined
  const snapMatches = hydrateSnap?.skuGroupKey === drawerSkuGroupKey

  if (bundle) {
    if (!snap1 || !snapMatches) return bundle.summary
    if (snap1.skuGroupKey != null && snap1.skuGroupKey !== drawerSkuGroupKey) return bundle.summary
    return mergeBundleSummaryWithSnapshotSummary(bundle.summary, snap1)
  }

  return null
}
