export interface SecondaryDailyTrendPoint {
  idx: number
  date: string
  month: string
  sales: number
  stockBar: number
  inboundAccumBar: number
  /** 자사 실 판매량(EA) */
  selfSales: number | null
  /** 경쟁사 실 판매량(EA) */
  competitorSales: number | null
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

import type { OrderSnapshotDocumentV1 } from '../../snapshot/orderSnapshotTypes'

/** 통합 오더 스냅샷(JSON 한 문서). 구 스키마는 `schemaVersion`으로 구분 */
export type SecondaryOrderSnapshotPayload = OrderSnapshotDocumentV1

export interface SecondaryStockOrderCalcParams {
  productId: string
  periodStart: string
  periodEnd: string
  forecastPeriodEnd?: string
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

export interface CandidateStashSummary {
  uuid: string
  name: string
  note: string | null
  productId: string
  itemCount: number
  dbCreatedAt: string
  dbUpdatedAt: string
}

export interface CandidateItemSummary {
  uuid: string
  stashUuid: string
  productId: string
  brand: string
  productCode: string
  productName: string
  qty: number
  /** 예상 발주 금액(원). 스냅샷 `drawer2.stockDerived.expectedOrderAmount`와 동일 */
  expectedOrderAmount: number
  expectedSalesAmount: number
  /** 예상 영업이익(원). 스냅샷 `drawer2.stockDerived.expectedOpProfit`와 동일 */
  expectedOpProfit: number
  dbCreatedAt: string
  dbUpdatedAt: string
}

/** 후보군 단일 행 상세(스냅샷 JSON 포함) */
export interface CandidateItemDetail {
  uuid: string
  stashUuid: string
  productId: string
  details: SecondaryOrderSnapshotPayload
  dbCreatedAt: string
  dbUpdatedAt: string
}

export interface CreateCandidateStashPayload {
  productId: string
  name: string
  note?: string | null
}

/** 후보군 메타(이름·비고)만 갱신 */
export interface UpdateCandidateStashPayload {
  stashUuid: string
  name: string
  note?: string | null
}

export interface AppendCandidateItemPayload {
  stashUuid: string
  productId: string
  details: SecondaryOrderSnapshotPayload
}

export interface UpdateCandidateItemPayload {
  itemUuid: string
  details: SecondaryOrderSnapshotPayload
}

export interface CandidateStashExcelUploadResult {
  stashUuid: string
  stashName: string
  itemCount: number
  warnings: string[]
}
