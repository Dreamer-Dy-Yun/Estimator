import type { CompanyScopeParams } from './company'

/** Query params for self sales list (keep in sync with backend when wired). */
export interface SelfSalesParams extends CompanyScopeParams {
  startDate?: string
  endDate?: string
  brand?: string
  category?: string
  /** SKU.code 품번 부분 일치(대소문자 무시). */
  codeQuery?: string
  colorCode?: string
  /** 상품명 부분 일치(대소문자 무시). */
  nameQuery?: string
}

/** 경쟁 분석 목록 — 자사 필터 + 선택 경쟁 채널. competitorChannelId 생략은 전체 경쟁 채널 합계. */
export interface CompetitorSalesParams extends SelfSalesParams {
  /** 특정 경쟁 채널 id. 생략하면 모든 경쟁 채널을 합산해 반환한다. */
  competitorChannelId?: string
}

/** Filter and period UI metadata shared by self and competitor sales analysis. */
export type SalesFilterMetaParams = CompanyScopeParams

export interface SalesFilterMeta {
  brands: string[]
  categories: string[]
  /** 목록 콤보 제안용 고유 SKU.code(자사·경쟁 데이터 합집합). */
  codes: string[]
  colorCodes: string[]
  /** 목록 콤보 제안용 고유 상품명(자사·경쟁 데이터 합집합). */
  productNames: string[]
  /** Closed historical months axis (vs forecast months), e.g. period sliders. */
  historicalMonths: string[]
}

export interface ScatterGridBinParams {
  /**
   * Requested bucket size for X axis in data units.
   * If omitted, backend chooses a derived value and returns the actual value in meta.
   * Backend is Python and should use this only for server-side binning.
   */
  xBucketSize?: number
  /**
   * Requested bucket size for Y axis in data units.
   * This controls server-side binning only; rendered point radius is frontend-only.
   */
  yBucketSize?: number
  /** Optional max number of ids returned per cell. */
  maxSkuIdsPerCell?: number
}

export interface SelfSalesGridParams extends SelfSalesParams, ScatterGridBinParams {}
export interface CompetitorSalesGridParams extends CompetitorSalesParams, ScatterGridBinParams {}

export interface ScatterGridAxisMeta {
  min: number
  max: number
  bucketSize: number
}

export interface ScatterSalesGridMeta {
  xAxis: ScatterGridAxisMeta
  yAxis: ScatterGridAxisMeta
}

export interface ScatterGridCell {
  /** Stable cell id built from x/y bucket range. Used only for UI selection. */
  cellKey: string
  /** Number of skuGroupKey rows in this occupied cell. */
  count: number
  /**
   * Current field name is legacy. Values are skuGroupKey strings
   * (SKU.code + SKU.color_code grouping), not physical SKU.uuid values.
   * Point click filters the already-loaded list with these keys and must not
   * call the backend again.
   */
  skuIds: string[]
  /** True only if skuIds was intentionally truncated by maxSkuIdsPerCell. */
  hasMoreSkuIds: boolean
  /** Inclusive/exclusive-ish bucket display range; use consistently in tooltip. */
  xStart: number
  xEnd: number
  yStart: number
  yEnd: number
  /** Center point of the bucket used by Recharts Scatter. */
  representativeX: number
  representativeY: number
}

export interface ScatterSalesGridResponse {
  /** Occupied cells only; empty cells are omitted. */
  cells: ScatterGridCell[]
  /** Actual axis ranges and bucket sizes used by the backend. */
  meta: ScatterSalesGridMeta
}

