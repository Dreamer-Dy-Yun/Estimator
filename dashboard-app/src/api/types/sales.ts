/** Query params for self sales list (keep in sync with backend when wired). */
export interface SelfSalesParams {
  startDate?: string
  endDate?: string
  brand?: string
  category?: string
  /** 상품명 부분 일치(대소문자 무시). */
  nameQuery?: string
}

/** 경쟁 분석 목록 — 자사 필터 + 선택 경쟁 채널(목업은 스큐 반영). */
export interface CompetitorSalesParams extends SelfSalesParams {
  competitorChannelId?: string
}

/** Filter and period UI metadata for self analysis (single fetch). */
export interface SelfSalesFilterMeta {
  brands: string[]
  categories: string[]
  /** 목록 콤보 제안용 고유 상품명(자사·경쟁 데이터 합집합). */
  productNames: string[]
  /** Closed historical months axis (vs forecast months), e.g. period sliders. */
  historicalMonths: string[]
}
