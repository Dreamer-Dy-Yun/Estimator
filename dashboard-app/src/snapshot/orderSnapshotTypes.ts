import type { ProductPrimarySummary, ProductSecondaryDetail } from '../types'
import type { SecondaryForecastDerived, SecondaryForecastInputs } from '../dashboard/components/product-drawer/secondary/secondaryDrawerTypes'
import type { SalesKpiColumn } from '../utils/salesKpiColumn'

/** 오더 확정 시 저장하는 통합 스냅샷 스키마 버전 */
export const ORDER_SNAPSHOT_SCHEMA_VERSION = 2 as const

export type OrderSnapshotSizeRowV1 = {
  size: string
  selfSharePct: number
  competitorSharePct: number
  blendedSharePct: number
  forecastQty: number
  recommendedQty: number
  confirmQty: number
}

/** 1차 요약(판매추이 월간·재고 시계열 제외 — `productId`+`context`로 번들 재요청) */
export type OrderSnapshotPrimarySummaryV2 = Omit<ProductPrimarySummary, 'monthlySalesTrend'>

export type OrderSnapshotDrawer1V2 = {
  summary: OrderSnapshotPrimarySummaryV2
}

/**
 * 2차 드로워: 경쟁 채널·판매예측 지표·확정 수량·AI 코멘트 등
 * `secondary`는 당시 경쟁사 베이스라인 스냅샷
 */
export type OrderSnapshotDrawer2V1 = {
  secondary: ProductSecondaryDetail
  competitorChannelId: string
  competitorChannelLabel: string
  /** `null`: 하한 없음(전체). 2차 상세 재조회 시 `ProductSecondaryDetailParams`와 동일 의미로 맞출 것. */
  minOpMarginPct: number | null
  salesSelf: SalesKpiColumn
  salesCompetitor: SalesKpiColumn
  stockInputs: SecondaryForecastInputs
  stockDerived: SecondaryForecastDerived
  selfWeightPct: number
  sizeForecastSource: 'periodMean' | 'forecastQty'
  bufferStock: number
  llmPrompt: string
  llmAnswer: string
  /** 저장 시점의 확정 합계(이너 후보 리스트 요약/열 표시용) */
  confirmedTotals?: {
    orderQty: number
    expectedSalesAmount: number
    expectedOpProfit: number
    expectedOpProfitRatePct: number | null
  }
  sizeRows: OrderSnapshotSizeRowV1[]
}

/** DB·로컬 저장용 단일 JSON 문서. 행 PK용 UUID는 DB에서 자동 생성 — 프론트는 보내지 않음 */
export type OrderSnapshotDocumentV1 = {
  schemaVersion: typeof ORDER_SNAPSHOT_SCHEMA_VERSION
  productId: string
  savedAt: string
  context: {
    periodStart: string
    periodEnd: string
    forecastMonths: number
    /** `getSecondaryDailyTrend` 재조회용 `startMonth` */
    dailyTrendStartMonth: string
    /** `getSecondaryDailyTrend` 재조회용 `leadTimeDays` */
    dailyTrendLeadTimeDays: number
  }
  drawer1: OrderSnapshotDrawer1V2
  drawer2: OrderSnapshotDrawer2V1
}
