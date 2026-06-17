import type { ProductComparisonTarget } from './drawer'

export interface DashboardRuntimeConfig {
  /** Backend-owned comparison subject used for candidate order metric calculation. */
  candidateOrderMetricComparison: ProductComparisonTarget | null
}
