export interface SecondaryDailyTrendPoint {
  idx: number
  date: string
  month: string
  sales: number
  stockBar: number
  inboundAccumBar: number
  /** 0~1 정규화된 자사 판매 지표(금일 이후 구간은 null). */
  selfSalesNorm: number | null
  /** 0~1 정규화된 경쟁사 판매 지표(금일 이후 구간은 null). */
  competitorSalesNorm: number | null
  isForecast: boolean
}

export interface SecondaryDailyTrendParams {
  productId: string
  startMonth: string
  leadTimeDays: number
}

export interface SecondaryCompetitorChannel {
  id: string
  label: string
  priceSkew: number
  qtySkew: number
}

export interface SecondaryLlmAnswerParams {
  productId: string
  prompt: string
}

/**
 * 2차 상세(`getProductSecondaryDetail`) 조회 옵션.
 * 예: 영업이익률 하한 — 값이 바뀌면 동일 품번이라도 패널에서 이 객체를 deps에 넣고 재요청.
 * UI가 없을 때는 생략하거나 필드를 두지 않음.
 */
export interface ProductSecondaryDetailParams {
  minOpMarginPct?: number | null
}

/** 통합 오더 스냅샷(JSON 한 문서). 구 스키마는 `schemaVersion`으로 구분 */
export type { OrderSnapshotDocumentV1 as SecondaryOrderSnapshotPayload } from '../../snapshot/orderSnapshotTypes'

export interface SecondaryStockOrderCalcParams {
  productId: string
  periodStart: string
  periodEnd: string
  serviceLevelPct: number
  leadTimeDays: number
  safetyStockMode: 'manual' | 'formula'
  manualSafetyStock: number
  /** 미지정 시 백엔드(목)가 기간 트렌드로 산출 */
  dailyMean?: number
}

export interface SecondaryStockSafetyCalcBlock {
  safetyStock: number
  recommendedOrderQty: number
  expectedOrderAmount: number
  expectedSalesAmount: number
  expectedOpProfit: number
}

export interface SecondaryStockForecastQtyCalcBlock {
  safetyStock: null
  recommendedOrderQty: number
  expectedOrderAmount: number
  expectedSalesAmount: number
  expectedOpProfit: number
}

export interface SecondaryStockOrderCalcResult {
  /** 표시용: 트렌드 기반 일평균(소수 첫째 자리) */
  trendDailyMean: number
  /** 연산에 사용된 μ */
  dailyMean: number
  sigma: number
  /** UI 표시용 목데이터(하드코딩) */
  display: {
    currentStockQtyTotal: number
    totalOrderBalanceTotal: number
    expectedInboundOrderBalanceTotal: number
    currentStockQtyBySize: number[]
    totalOrderBalanceBySize: number[]
    expectedInboundOrderBalanceBySize: number[]
  }
  safetyStockCalc: SecondaryStockSafetyCalcBlock
  forecastQtyCalc: SecondaryStockForecastQtyCalcBlock
}
