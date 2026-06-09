import type { ProductPrimarySummary } from '../../types'
import type { CompanyScopeParams } from './company'

export interface ProductDrawerBundle {
  summary: ProductPrimarySummary
}

export interface ProductDrawerBundleParams extends CompanyScopeParams {
  companyUuid?: CompanyScopeParams['companyUuid']
}

export type ProductComparisonSubjectKind = 'competitor-channel' | 'self-company'
export type ProductComparisonSubjectRole = 'base' | 'comparison'
export type ProductComparisonTargetKind = ProductComparisonSubjectKind

export interface ProductComparisonBaseSubjectRef {
  role: 'base'
  kind: 'self-company'
  sourceId: string
}

export interface ProductComparisonComparisonSubjectRef {
  role: 'comparison'
  kind: ProductComparisonSubjectKind
  sourceId: string
}

export type ProductComparisonSubjectRef = ProductComparisonBaseSubjectRef | ProductComparisonComparisonSubjectRef

export type ProductComparisonSubject<TSubject extends ProductComparisonSubjectRef = ProductComparisonSubjectRef> =
  TSubject & {
    id: string
    label: string
  }

export type ProductComparisonBaseSubject = ProductComparisonSubject<ProductComparisonBaseSubjectRef>
export type ProductComparisonComparisonSubject = ProductComparisonSubject<ProductComparisonComparisonSubjectRef>

export interface ProductComparisonTarget extends ProductComparisonComparisonSubjectRef {
  id: string
  label: string
}

export interface ProductComparisonTargetParams {
  base: ProductComparisonBaseSubjectRef
}

export interface ProductMonthlyTrendParams extends CompanyScopeParams {
  startDate: string
  endDate: string
  forecastMonths: number
  competitorChannelId: string
}

export interface ProductMonthlyTrendPoint {
  date: string
  selfSales: number
  competitorSales: number | null
  isForecast: boolean
}

export interface ProductMonthlyTrend {
  skuGroupKey: string
  targetPeriodDays: {
    start: string
    end: string
  }
  competitorChannelId: string
  competitorChannelLabel: string
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
