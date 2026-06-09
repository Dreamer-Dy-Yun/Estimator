import type { ProductDrawerBundle } from '../../api'
import type {
  OrderSnapshotDocument,
  OrderSnapshotPrimarySummary,
} from '../../snapshot/orderSnapshotTypes'
import type { ProductPrimarySummary } from '../../types'

export type SnapshotPrimarySummary = Partial<OrderSnapshotPrimarySummary>

function withoutUndefinedPrimaryFields<T extends object>(summary: T): Partial<T> {
  return Object.fromEntries(Object.entries(summary).filter(([, value]: [string, unknown]) : boolean => value !== undefined)) as Partial<T>
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
  hydrateSnap: OrderSnapshotDocument | null,
): ProductPrimarySummary | null {
  if (!drawerSkuGroupKey) return null
  const snap1: Partial<OrderSnapshotPrimarySummary> | undefined = hydrateSnap?.drawer1?.summary as SnapshotPrimarySummary | undefined
  const snapMatches: boolean = hydrateSnap?.skuGroupKey === drawerSkuGroupKey

  if (bundle) {
    if (!snap1 || !snapMatches) return bundle.summary
    if (snap1.skuGroupKey != null && snap1.skuGroupKey !== drawerSkuGroupKey) return bundle.summary
    return mergeBundleSummaryWithSnapshotSummary(bundle.summary, snap1)
  }

  return null
}
