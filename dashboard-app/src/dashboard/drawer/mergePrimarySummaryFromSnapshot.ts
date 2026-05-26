import type { ProductDrawerBundle } from '../../api'
import type {
  OrderSnapshotDocumentV2,
  OrderSnapshotPrimarySummaryV2,
} from '../../snapshot/orderSnapshotTypes'
import type { ProductPrimarySummary } from '../../types'

type SnapshotPrimarySummary = Partial<ProductPrimarySummary>
type CompactSnapshotPrimarySummary = Partial<OrderSnapshotPrimarySummaryV2>

type CompleteLegacyPrimarySummaryFields = Pick<
  ProductPrimarySummary,
  | 'skuGroupKey'
  | 'productName'
  | 'brand'
  | 'category'
  | 'code'
  | 'colorCode'
  | 'price'
  | 'qty'
  | 'availableStock'
  | 'recommendedOrderQty'
  | 'monthlySalesTrend'
  | 'seasonality'
  | 'sizeMix'
>

function hasCompleteLegacyPrimarySummaryFields(
  summary: SnapshotPrimarySummary,
): summary is SnapshotPrimarySummary & CompleteLegacyPrimarySummaryFields {
  return (
    typeof summary.skuGroupKey === 'string' &&
    typeof summary.productName === 'string' &&
    typeof summary.brand === 'string' &&
    typeof summary.category === 'string' &&
    typeof summary.code === 'string' &&
    typeof summary.colorCode === 'string' &&
    typeof summary.price === 'number' &&
    typeof summary.qty === 'number' &&
    typeof summary.availableStock === 'number' &&
    typeof summary.recommendedOrderQty === 'number' &&
    Array.isArray(summary.monthlySalesTrend) &&
    Array.isArray(summary.seasonality) &&
    Array.isArray(summary.sizeMix)
  )
}

function withoutUndefinedPrimaryFields<T extends object>(summary: T): Partial<T> {
  return Object.fromEntries(Object.entries(summary).filter(([, value]) => value !== undefined)) as Partial<T>
}

function toCompactSnapshotPrimarySummary(summary: SnapshotPrimarySummary): CompactSnapshotPrimarySummary {
  const {
    monthlySalesTrend,
    seasonality,
    sizeMix,
    recommendedOrderQty,
    ...compactSummary
  } = summary
  void monthlySalesTrend
  void seasonality
  void sizeMix
  void recommendedOrderQty
  return withoutUndefinedPrimaryFields(compactSummary)
}

function mergeBundleSummaryWithSnapshotSummary(
  bundleSummary: ProductPrimarySummary,
  snapshotSummary: SnapshotPrimarySummary,
): ProductPrimarySummary {
  return {
    ...bundleSummary,
    ...toCompactSnapshotPrimarySummary(snapshotSummary),
  }
}

function getCompleteLegacySnapshotSummary(
  drawerSkuGroupKey: string,
  snapshotSummary: SnapshotPrimarySummary,
): ProductPrimarySummary | null {
  if (snapshotSummary.skuGroupKey !== drawerSkuGroupKey) return null
  if (!hasCompleteLegacyPrimarySummaryFields(snapshotSummary)) return null
  return snapshotSummary as ProductPrimarySummary
}

/**
 * API bundle + order snapshot primary summary merge.
 * Current compact snapshots only override fields they persist.
 * Non-persisted summary fields must come from the live bundle, or from a complete legacy snapshot
 * when the bundle is unavailable.
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

  if (snapMatches && snap1) {
    return getCompleteLegacySnapshotSummary(drawerSkuGroupKey, snap1)
  }

  return null
}
