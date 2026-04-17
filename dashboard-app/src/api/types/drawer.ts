import type { ProductPrimarySummary } from '../../types'

/** One point on the product stock time series. */
export interface ProductStockTrendPoint {
  date: string
  stock: number
  inboundExpected: number
  expectedInboundDate: string | null
}

/** 1차 드로어 번들 요청 옵션 — 판매추이(월간) 포캐스트 구간 길이. */
export interface ProductDrawerBundleParams {
  /** 포캐스트로 포함할 월 수. 1~24, 생략 시 구현체 기본값(8). */
  forecastMonths?: number
}

/** 1차 드로어: 자사 요약 + 재고 시계열만. 경쟁·2차 전용은 `getProductSecondaryDetail`. */
export interface ProductDrawerBundle {
  summary: ProductPrimarySummary
  stockTrend: ProductStockTrendPoint[]
}
