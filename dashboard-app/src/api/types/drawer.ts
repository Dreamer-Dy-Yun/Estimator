import type { ProductPrimarySummary } from '../../types'
import type {
  ComparisonBaseSubject,
  ComparisonBaseSubjectRef,
  ComparisonComparisonSubject,
  ComparisonComparisonSubjectRef,
  ComparisonSubject,
  ComparisonSubjectKind,
  ComparisonSubjectRef,
  ComparisonSubjectRole,
  ComparisonTarget,
  ComparisonTargetKind,
} from './subject'

export interface ProductDrawerBundle {
  summary: ProductPrimarySummary
}

export interface ProductDrawerBundleParams {
  base: ProductComparisonBaseSubjectRef
}

export type ProductComparisonSubjectKind = ComparisonSubjectKind
export type ProductComparisonSubjectRole = ComparisonSubjectRole
export type ProductComparisonTargetKind = ComparisonTargetKind
export type ProductComparisonBaseSubjectRef = ComparisonBaseSubjectRef
export type ProductComparisonComparisonSubjectRef = ComparisonComparisonSubjectRef
export type ProductComparisonSubjectRef = ComparisonSubjectRef
export type ProductComparisonSubject<TSubject extends ProductComparisonSubjectRef = ProductComparisonSubjectRef> = ComparisonSubject<TSubject>
export type ProductComparisonBaseSubject = ComparisonBaseSubject
export type ProductComparisonComparisonSubject = ComparisonComparisonSubject
/** Backend/mock-provided comparison option. id/label are response-owned; clients pass role/kind/sourceId as the API subject. */
export type ProductComparisonTarget = ComparisonTarget

/** Query for targets available to a base subject. Empty response means unavailable, not default-target fallback. */
export interface ProductComparisonTargetParams {
  base: ProductComparisonBaseSubjectRef
}

export interface ProductMonthlyTrendParams {
  startDate: string
  endDate: string
  forecastMonths: number
  base: ProductComparisonBaseSubjectRef
  comparison: ProductComparisonComparisonSubjectRef
}

export interface ProductMonthlyTrendPoint {
  date: string
  baseSales: number
  comparisonSales: number | null
  isForecast: boolean
}

export interface ProductMonthlyTrend {
  skuGroupKey: string
  targetPeriodDays: {
    start: string
    end: string
  }
  base: ProductComparisonBaseSubject
  comparison: ProductComparisonComparisonSubject
  points: ProductMonthlyTrendPoint[]
}

export interface ProductSalesInsightParams {
  startDate: string
  endDate: string
  base: ProductComparisonBaseSubjectRef
  comparison: ProductComparisonComparisonSubjectRef
}

export interface ProductSalesInsightColumn {
  avgPrice: number
  qty: number
  amount: number
  avgCost: number | null
  grossMarginPerUnit: number | null
  feePerUnit: number | null
  feeRatePct: number | null
  opMarginPerUnit: number | null
  opMarginRatePct: number | null
  qtyRank: number
  amountRank: number
  feeRank: number | null
  opMarginRank: number | null
  rankTotal: number
  costRatioPct: number | null
}

export interface ProductSalesInsight {
  skuGroupKey: string
  targetPeriodDays: {
    start: string
    end: string
  }
  base: ProductComparisonBaseSubject
  comparison: ProductComparisonComparisonSubject
  baseMetrics: ProductSalesInsightColumn
  comparisonMetrics: ProductSalesInsightColumn
}
