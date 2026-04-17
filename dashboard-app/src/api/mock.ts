import type {
  CompetitorSalesRow,
  MonthlySalesPoint,
  OrderPlanRow,
  ProductPrimarySummary,
  ProductSecondaryDetail,
  SelfSalesRow,
} from '../types'
import type {
  CompetitorSalesParams,
  ProductDrawerBundleParams,
  SecondaryCompetitorChannel,
  SecondaryStockOrderCalcParams,
  SecondaryStockOrderCalcResult,
  SecondaryDailyTrendParams,
  SecondaryDailyTrendPoint,
  SecondaryLlmAnswerParams,
  SecondaryOrderSnapshotPayload,
} from './types'

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v))
const SNAPSHOT_STORAGE_KEY = 'dashboard.orderSnapshots.v1'

const secondaryCompetitorChannels: SecondaryCompetitorChannel[] = [
  { id: 'kream', label: '크림', priceSkew: 1, qtySkew: 1 },
  { id: 'naver', label: '네이버 스토어', priceSkew: 0.97, qtySkew: 1.12 },
  { id: 'musinsa', label: '무신사', priceSkew: 1.02, qtySkew: 0.88 },
]

const selfSalesRows: SelfSalesRow[] = [
  { id: 'B', rank: 1, rankPercentile: 99.8, brand: '나이키', category: '신발', productCode: 'B', name: 'BBBBB', avgPrice: 119000, qty: 11000, amount: 1309000000, avgCost: 97000, marginRate: 18.5, feeRate: 13, opMarginRate: 5.5, opMarginAmount: 71830000 },
  { id: 'D', rank: 2, rankPercentile: 99.6, brand: '아디다스', category: '의류', productCode: 'D', name: 'DDDDD', avgPrice: 119000, qty: 7500, amount: 892500000, avgCost: 87000, marginRate: 26.9, feeRate: 13, opMarginRate: 13.9, opMarginAmount: 123975000 },
  { id: 'H', rank: 3, rankPercentile: 99.4, brand: '뉴발란스', category: '신발', productCode: 'H', name: 'HHHHH', avgPrice: 149000, qty: 2500, amount: 372500000, avgCost: 115000, marginRate: 22.8, feeRate: 13, opMarginRate: 9.8, opMarginAmount: 36575000 },
  { id: 'J', rank: 4, rankPercentile: 99.2, brand: '푸마', category: '가방', productCode: 'J', name: 'JJJJJ', avgPrice: 159000, qty: 1500, amount: 238500000, avgCost: 126000, marginRate: 20.8, feeRate: 13, opMarginRate: 7.8, opMarginAmount: 18495000 },
  { id: 'F', rank: 5, rankPercentile: 99.0, brand: '나이키', category: '의류', productCode: 'F', name: 'FFFFF', avgPrice: 99000, qty: 5000, amount: 495000000, avgCost: 82000, marginRate: 17.2, feeRate: 13, opMarginRate: 4.2, opMarginAmount: 20650000 },
  { id: 'K', rank: 6, rankPercentile: 98.8, brand: '아식스', category: '신발', productCode: 'K', name: 'KKKKK', avgPrice: 129000, qty: 6200, amount: 799800000, avgCost: 101000, marginRate: 21.7, feeRate: 13, opMarginRate: 8.7, opMarginAmount: 69582600 },
  { id: 'L', rank: 7, rankPercentile: 98.6, brand: '푸마', category: '의류', productCode: 'L', name: 'LLLLL', avgPrice: 89000, qty: 8400, amount: 747600000, avgCost: 69000, marginRate: 22.5, feeRate: 13, opMarginRate: 9.5, opMarginAmount: 71022000 },
  { id: 'M', rank: 8, rankPercentile: 98.4, brand: '나이키', category: '가방', productCode: 'M', name: 'MMMMM', avgPrice: 139000, qty: 3300, amount: 458700000, avgCost: 109000, marginRate: 21.6, feeRate: 13, opMarginRate: 8.6, opMarginAmount: 39448200 },
  { id: 'N', rank: 9, rankPercentile: 98.2, brand: '아디다스', category: '신발', productCode: 'N', name: 'NNNNN', avgPrice: 125000, qty: 5900, amount: 737500000, avgCost: 98000, marginRate: 21.6, feeRate: 13, opMarginRate: 8.6, opMarginAmount: 63425000 },
  { id: 'P', rank: 10, rankPercentile: 98.0, brand: '뉴발란스', category: '의류', productCode: 'P', name: 'PPPPP', avgPrice: 105000, qty: 6800, amount: 714000000, avgCost: 82000, marginRate: 21.9, feeRate: 13, opMarginRate: 8.9, opMarginAmount: 63546000 },
  { id: 'Q', rank: 11, rankPercentile: 97.8, brand: '나이키', category: '신발', productCode: 'Q', name: 'QQQQQ', avgPrice: 132000, qty: 5200, amount: 686400000, avgCost: 103000, marginRate: 22.0, feeRate: 13, opMarginRate: 9.0, opMarginAmount: 61776000 },
  { id: 'R', rank: 12, rankPercentile: 97.6, brand: '아식스', category: '가방', productCode: 'R', name: 'RRRRR', avgPrice: 98000, qty: 4300, amount: 421400000, avgCost: 76000, marginRate: 22.4, feeRate: 13, opMarginRate: 9.4, opMarginAmount: 39611600 },
  { id: 'S', rank: 13, rankPercentile: 97.4, brand: '푸마', category: '신발', productCode: 'S', name: 'SSSSS', avgPrice: 119000, qty: 4700, amount: 559300000, avgCost: 93000, marginRate: 21.8, feeRate: 13, opMarginRate: 8.8, opMarginAmount: 49218400 },
  { id: 'T', rank: 14, rankPercentile: 97.2, brand: '아디다스', category: '가방', productCode: 'T', name: 'TTTTT', avgPrice: 112000, qty: 3600, amount: 403200000, avgCost: 87000, marginRate: 22.3, feeRate: 13, opMarginRate: 9.3, opMarginAmount: 37497600 },
  { id: 'U', rank: 15, rankPercentile: 97.0, brand: '뉴발란스', category: '의류', productCode: 'U', name: 'UUUUU', avgPrice: 94000, qty: 7900, amount: 742600000, avgCost: 73000, marginRate: 22.3, feeRate: 13, opMarginRate: 9.3, opMarginAmount: 69061800 },
  { id: 'V', rank: 16, rankPercentile: 96.8, brand: '나이키', category: '가방', productCode: 'V', name: 'VVVVV', avgPrice: 146000, qty: 2800, amount: 408800000, avgCost: 114000, marginRate: 21.9, feeRate: 13, opMarginRate: 8.9, opMarginAmount: 36383200 },
  { id: 'W', rank: 17, rankPercentile: 96.6, brand: '아식스', category: '의류', productCode: 'W', name: 'WWWWW', avgPrice: 91000, qty: 6100, amount: 555100000, avgCost: 71000, marginRate: 22.0, feeRate: 13, opMarginRate: 9.0, opMarginAmount: 49959000 },
  { id: 'X', rank: 18, rankPercentile: 96.4, brand: '푸마', category: '가방', productCode: 'X', name: 'XXXXX', avgPrice: 121000, qty: 4100, amount: 496100000, avgCost: 95000, marginRate: 21.5, feeRate: 13, opMarginRate: 8.5, opMarginAmount: 42168500 },
  { id: 'Y', rank: 19, rankPercentile: 96.2, brand: '아디다스', category: '신발', productCode: 'Y', name: 'YYYYY', avgPrice: 136000, qty: 5400, amount: 734400000, avgCost: 106000, marginRate: 22.1, feeRate: 13, opMarginRate: 9.1, opMarginAmount: 66830400 },
  { id: 'Z', rank: 20, rankPercentile: 96.0, brand: '뉴발란스', category: '가방', productCode: 'Z', name: 'ZZZZZ', avgPrice: 108000, qty: 3900, amount: 421200000, avgCost: 84000, marginRate: 22.2, feeRate: 13, opMarginRate: 9.2, opMarginAmount: 38750400 },
  { id: 'AA', rank: 21, rankPercentile: 95.8, brand: '나이키', category: '의류', productCode: 'AA', name: 'AAAAA-2', avgPrice: 101000, qty: 7300, amount: 737300000, avgCost: 79000, marginRate: 21.8, feeRate: 13, opMarginRate: 8.8, opMarginAmount: 64882400 },
  { id: 'AB', rank: 22, rankPercentile: 95.6, brand: '아식스', category: '신발', productCode: 'AB', name: 'ABBBB', avgPrice: 124000, qty: 4900, amount: 607600000, avgCost: 97000, marginRate: 21.8, feeRate: 13, opMarginRate: 8.8, opMarginAmount: 53468800 },
  { id: 'AC', rank: 23, rankPercentile: 95.4, brand: '푸마', category: '의류', productCode: 'AC', name: 'ACCCC', avgPrice: 93000, qty: 5600, amount: 520800000, avgCost: 72000, marginRate: 22.6, feeRate: 13, opMarginRate: 9.6, opMarginAmount: 49996800 },
  { id: 'AD', rank: 24, rankPercentile: 95.2, brand: '아디다스', category: '가방', productCode: 'AD', name: 'ADDDD', avgPrice: 116000, qty: 4400, amount: 510400000, avgCost: 90000, marginRate: 22.4, feeRate: 13, opMarginRate: 9.4, opMarginAmount: 47977600 },
  { id: 'AE', rank: 25, rankPercentile: 95.0, brand: '뉴발란스', category: '신발', productCode: 'AE', name: 'AEEEE', avgPrice: 141000, qty: 3000, amount: 423000000, avgCost: 110000, marginRate: 22.0, feeRate: 13, opMarginRate: 9.0, opMarginAmount: 38070000 },
]

const competitorSalesRows: CompetitorSalesRow[] = [
  { id: 'A', rank: 1, rankPercentile: 99.8, brand: '아식스', category: '신발', productCode: 'A', name: 'AAAAA', competitorAvgPrice: 119000, competitorQty: 10000, competitorAmount: 1190000000, selfAvgPrice: null, selfQty: null, selfAmount: null },
  { id: 'B', rank: 2, rankPercentile: 99.6, brand: '나이키', category: '신발', productCode: 'B', name: 'BBBBB', competitorAvgPrice: 123000, competitorQty: 9000, competitorAmount: 1107000000, selfAvgPrice: 119000, selfQty: 11000, selfAmount: 1309000000 },
  { id: 'C', rank: 3, rankPercentile: 99.4, brand: '뉴발란스', category: '가방', productCode: 'C', name: 'CCCCC', competitorAvgPrice: 142000, competitorQty: 7500, competitorAmount: 1065000000, selfAvgPrice: null, selfQty: null, selfAmount: null },
  { id: 'D', rank: 4, rankPercentile: 99.2, brand: '아디다스', category: '의류', productCode: 'D', name: 'DDDDD', competitorAvgPrice: 122000, competitorQty: 7000, competitorAmount: 854000000, selfAvgPrice: 119000, selfQty: 7500, selfAmount: 892500000 },
  { id: 'H', rank: 5, rankPercentile: 99.0, brand: '뉴발란스', category: '신발', productCode: 'H', name: 'HHHHH', competitorAvgPrice: 149000, competitorQty: 3700, competitorAmount: 551300000, selfAvgPrice: 149000, selfQty: 2500, selfAmount: 372500000 },
  { id: 'K', rank: 6, rankPercentile: 98.8, brand: '아식스', category: '신발', productCode: 'K', name: 'KKKKK', competitorAvgPrice: 132000, competitorQty: 5900, competitorAmount: 778800000, selfAvgPrice: 129000, selfQty: 6200, selfAmount: 799800000 },
  { id: 'L', rank: 7, rankPercentile: 98.6, brand: '푸마', category: '의류', productCode: 'L', name: 'LLLLL', competitorAvgPrice: 92000, competitorQty: 7900, competitorAmount: 726800000, selfAvgPrice: 89000, selfQty: 8400, selfAmount: 747600000 },
  { id: 'M', rank: 8, rankPercentile: 98.4, brand: '나이키', category: '가방', productCode: 'M', name: 'MMMMM', competitorAvgPrice: 143000, competitorQty: 3100, competitorAmount: 443300000, selfAvgPrice: 139000, selfQty: 3300, selfAmount: 458700000 },
  { id: 'N', rank: 9, rankPercentile: 98.2, brand: '아디다스', category: '신발', productCode: 'N', name: 'NNNNN', competitorAvgPrice: 128000, competitorQty: 5600, competitorAmount: 716800000, selfAvgPrice: 125000, selfQty: 5900, selfAmount: 737500000 },
  { id: 'P', rank: 10, rankPercentile: 98.0, brand: '뉴발란스', category: '의류', productCode: 'P', name: 'PPPPP', competitorAvgPrice: 109000, competitorQty: 6400, competitorAmount: 697600000, selfAvgPrice: 105000, selfQty: 6800, selfAmount: 714000000 },
  { id: 'Q', rank: 11, rankPercentile: 97.8, brand: '나이키', category: '신발', productCode: 'Q', name: 'QQQQQ', competitorAvgPrice: 136000, competitorQty: 5000, competitorAmount: 680000000, selfAvgPrice: 132000, selfQty: 5200, selfAmount: 686400000 },
  { id: 'R', rank: 12, rankPercentile: 97.6, brand: '아식스', category: '가방', productCode: 'R', name: 'RRRRR', competitorAvgPrice: 101000, competitorQty: 4000, competitorAmount: 404000000, selfAvgPrice: 98000, selfQty: 4300, selfAmount: 421400000 },
  { id: 'S', rank: 13, rankPercentile: 97.4, brand: '푸마', category: '신발', productCode: 'S', name: 'SSSSS', competitorAvgPrice: 123000, competitorQty: 4500, competitorAmount: 553500000, selfAvgPrice: 119000, selfQty: 4700, selfAmount: 559300000 },
  { id: 'T', rank: 14, rankPercentile: 97.2, brand: '아디다스', category: '가방', productCode: 'T', name: 'TTTTT', competitorAvgPrice: 115000, competitorQty: 3500, competitorAmount: 402500000, selfAvgPrice: 112000, selfQty: 3600, selfAmount: 403200000 },
  { id: 'U', rank: 15, rankPercentile: 97.0, brand: '뉴발란스', category: '의류', productCode: 'U', name: 'UUUUU', competitorAvgPrice: 97000, competitorQty: 7600, competitorAmount: 737200000, selfAvgPrice: 94000, selfQty: 7900, selfAmount: 742600000 },
  { id: 'V', rank: 16, rankPercentile: 96.8, brand: '나이키', category: '가방', productCode: 'V', name: 'VVVVV', competitorAvgPrice: 150000, competitorQty: 2700, competitorAmount: 405000000, selfAvgPrice: 146000, selfQty: 2800, selfAmount: 408800000 },
  { id: 'W', rank: 17, rankPercentile: 96.6, brand: '아식스', category: '의류', productCode: 'W', name: 'WWWWW', competitorAvgPrice: 95000, competitorQty: 5900, competitorAmount: 560500000, selfAvgPrice: 91000, selfQty: 6100, selfAmount: 555100000 },
  { id: 'X', rank: 18, rankPercentile: 96.4, brand: '푸마', category: '가방', productCode: 'X', name: 'XXXXX', competitorAvgPrice: 124000, competitorQty: 3900, competitorAmount: 483600000, selfAvgPrice: 121000, selfQty: 4100, selfAmount: 496100000 },
  { id: 'Y', rank: 19, rankPercentile: 96.2, brand: '아디다스', category: '신발', productCode: 'Y', name: 'YYYYY', competitorAvgPrice: 139000, competitorQty: 5200, competitorAmount: 722800000, selfAvgPrice: 136000, selfQty: 5400, selfAmount: 734400000 },
  { id: 'Z', rank: 20, rankPercentile: 96.0, brand: '뉴발란스', category: '가방', productCode: 'Z', name: 'ZZZZZ', competitorAvgPrice: 111000, competitorQty: 3700, competitorAmount: 410700000, selfAvgPrice: 108000, selfQty: 3900, selfAmount: 421200000 },
  { id: 'AA', rank: 21, rankPercentile: 95.8, brand: '나이키', category: '의류', productCode: 'AA', name: 'AAAAA-2', competitorAvgPrice: 104000, competitorQty: 7000, competitorAmount: 728000000, selfAvgPrice: 101000, selfQty: 7300, selfAmount: 737300000 },
  { id: 'AB', rank: 22, rankPercentile: 95.6, brand: '아식스', category: '신발', productCode: 'AB', name: 'ABBBB', competitorAvgPrice: 128000, competitorQty: 4700, competitorAmount: 601600000, selfAvgPrice: 124000, selfQty: 4900, selfAmount: 607600000 },
  { id: 'AC', rank: 23, rankPercentile: 95.4, brand: '푸마', category: '의류', productCode: 'AC', name: 'ACCCC', competitorAvgPrice: 96000, competitorQty: 5400, competitorAmount: 518400000, selfAvgPrice: 93000, selfQty: 5600, selfAmount: 520800000 },
  { id: 'AD', rank: 24, rankPercentile: 95.2, brand: '아디다스', category: '가방', productCode: 'AD', name: 'ADDDD', competitorAvgPrice: 119000, competitorQty: 4200, competitorAmount: 499800000, selfAvgPrice: 116000, selfQty: 4400, selfAmount: 510400000 },
  { id: 'AE', rank: 25, rankPercentile: 95.0, brand: '뉴발란스', category: '신발', productCode: 'AE', name: 'AEEEE', competitorAvgPrice: 145000, competitorQty: 2800, competitorAmount: 406000000, selfAvgPrice: 141000, selfQty: 3000, selfAmount: 423000000 },
]

const orderPlanRows: OrderPlanRow[] = selfSalesRows.map((r) => ({
  id: r.id,
  rank: r.rank,
  rankPercentile: r.rankPercentile,
  brand: r.brand,
  category: r.category,
  productCode: r.productCode,
  name: r.name,
  dailyQty: Number((r.qty / 352).toFixed(1)),
  predictedDailyQtyUntilInbound: Number((r.qty / 333).toFixed(1)),
  predictedDailyQtyAfterInbound: Number((r.qty / 321).toFixed(1)),
  availableStock: Math.round(r.qty / 2),
  currentStock: Math.round(r.qty / 2.8),
  inboundQty: Math.round(r.qty / 7),
  safetyStock: 250,
  stockCoverDays: 170,
  safetyReachDays: 162,
  recommendedOrderQty: Math.round(r.qty / 1.7),
  confirmedOrderQty: Math.round(r.qty / 1.8),
  orderCost: r.avgCost,
  targetPrice: r.avgPrice,
  orderAmount: Math.round((r.qty / 1.8) * r.avgCost),
  expectedSales: Math.round((r.qty / 1.8) * r.avgPrice),
  expectedOpMargin: Math.round((r.qty / 1.8) * (r.avgPrice - r.avgCost) * 0.75),
}))

const selfById = Object.fromEntries(selfSalesRows.map((row) => [row.id, row]))
const competitorById = Object.fromEntries(competitorSalesRows.map((row) => [row.id, row]))
const orderById = Object.fromEntries(orderPlanRows.map((row) => [row.id, row]))

const SALES_MONTHS: string[] = (() => {
  const months: string[] = []
  for (let y = 2024; y <= 2026; y += 1) {
    for (let m = 1; m <= 12; m += 1) {
      if (y === 2024 && m < 7) continue
      if (y === 2026 && m > 6) continue
      months.push(`${y}-${String(m).padStart(2, '0')}`)
    }
  }
  return months
})()

const FORECAST_START_MONTH = '2026-01'

/** `2026-01`부터 연속 `count`개의 YYYY-MM 키 (예측 구간). */
const monthKeysFrom = (year: number, month: number, count: number): string[] => {
  const out: string[] = []
  let y = year
  let m = month
  for (let i = 0; i < count; i += 1) {
    out.push(`${y}-${String(m).padStart(2, '0')}`)
    m += 1
    if (m > 12) {
      m = 1
      y += 1
    }
  }
  return out
}

/**
 * 월간 판매추이: `SALES_MONTHS` 중 예측 시작 이전은 실적, 이후는 `forecastMonths`만큼만 예측 월 생성.
 * `forecastMonths`: 1~24 (호출부에서 클램프 권장).
 */
const makeSalesTrend = (base: number, seed: number, forecastMonths: number) => {
  const fc = Math.max(1, Math.min(24, Math.round(forecastMonths)))
  const historical = SALES_MONTHS.filter((d) => d < FORECAST_START_MONTH)
  const forecastKeys = monthKeysFrom(2026, 1, fc)
  const allDates = [...historical, ...forecastKeys]
  return allDates.map((date, idx) => {
    const trend = 0.84 + idx * 0.018
    const seasonality = 1 + Math.sin((idx + (seed % 11)) * 0.45) * 0.1
    const noise = ((seed + idx * 17) % 9) * 0.01
    return {
      date,
      sales: Math.max(80, Math.round(base * trend * seasonality * (1 + noise))),
      isForecast: date >= FORECAST_START_MONTH,
    }
  })
}

/**
 * Estimator 출력과 유사: 1~12월 비율, 합 1, 일부 월 0 가능.
 * 제품 id마다 서로 다른 베이스 프로파일 + 월별 지터 후 정규화 (예시 한 벌을 모든 SKU에 고정하지 않음).
 */
const SEASONALITY_TEMPLATES: ReadonlyArray<readonly number[]> = [
  // 겨울·연말 집중 (예시에 가까운 형태)
  [0.63, 0.13, 0.025, 0, 0.007, 0.0035, 0.0035, 0.011, 0.007, 0.025, 0.21, 0.47],
  // 여름 피크
  [0.02, 0.02, 0.04, 0.06, 0.08, 0.14, 0.22, 0.2, 0.12, 0.06, 0.03, 0.02],
  // 봄 (3~5월)
  [0.05, 0.06, 0.14, 0.22, 0.18, 0.1, 0.06, 0.05, 0.04, 0.04, 0.05, 0.06],
  // 가을 (9~11월)
  [0.07, 0.06, 0.05, 0.04, 0.04, 0.05, 0.06, 0.08, 0.14, 0.18, 0.16, 0.12],
  // 상반·하반 두 번
  [0.12, 0.1, 0.11, 0.09, 0.06, 0.04, 0.03, 0.04, 0.08, 0.1, 0.12, 0.14],
  // 초봄 + 연말
  [0.18, 0.08, 0.12, 0.1, 0.05, 0.03, 0.02, 0.02, 0.05, 0.07, 0.14, 0.19],
  // 비교적 평탄 + 약한 여름
  [0.075, 0.075, 0.08, 0.085, 0.09, 0.095, 0.11, 0.1, 0.085, 0.08, 0.075, 0.075],
  // 1·2월 + 8월 방학 류
  [0.22, 0.15, 0.04, 0.02, 0.03, 0.05, 0.08, 0.18, 0.12, 0.06, 0.03, 0.05],
]

const hashProductId = (id: string) => [...id].reduce((acc, ch) => acc + ch.charCodeAt(0), 0)

const makeSeasonality = (id: string) => {
  const h = hashProductId(id)
  const templateIndex = h % SEASONALITY_TEMPLATES.length
  const base = SEASONALITY_TEMPLATES[templateIndex]
  const raw = base.map((v, i) => {
    const jitter = 1 + (((h + i * 13) % 19) * 0.035 - 0.28)
    return Math.max(0, v * jitter)
  })
  const sum = raw.reduce((a, b) => a + b, 0)
  if (sum <= 0) {
    return Array.from({ length: 12 }, (_, i) => ({ month: i + 1, ratio: 1 / 12 }))
  }
  return raw.map((r, i) => ({ month: i + 1, ratio: r / sum }))
}

/** 합계 `total`을 가중치 배열에 맞게 정수로 쪼갬(합이 정확히 `total`) */
const allocateByWeights = (total: number, weights: number[]): number[] => {
  if (weights.length === 0) return []
  const wsum = weights.reduce((a, b) => a + b, 0)
  if (wsum <= 0) return weights.map(() => 0)
  const exact = weights.map((w) => (total * w) / wsum)
  const floors = exact.map((x) => Math.floor(x))
  const rem = total - floors.reduce((a, b) => a + b, 0)
  const order = exact.map((x, i) => ({ i, r: x - Math.floor(x) })).sort((a, b) => b.r - a.r)
  const out = [...floors]
  for (let k = 0; k < rem; k += 1) {
    out[order[k % order.length].i] += 1
  }
  return out
}

const makeSizeMix = (
  recommendedOrderQty: number,
  productQty: number,
  productPrice: number,
  productAvailableStock: number,
  seed: number,
  category: string,
) => {
  const sizes = ['235', '240', '245', '250', '255', '260', '265', '270', '275', '280']
  // 유니섹스: 중앙(260~270) 집중 + 양끝 완만 하락(정규분포 유사)
  const ratioWeightsUnisex = [5, 7, 9, 11, 13, 14, 13, 11, 9, 7]
  // 남성 치우침: 큰 사이즈로 갈수록 비중 상승
  const ratioWeightsMale = [3, 4, 6, 8, 10, 12, 14, 15, 15, 13]
  // 여성 치우침: 작은 사이즈로 갈수록 비중 상승
  const ratioWeightsFemale = [14, 15, 15, 13, 11, 9, 7, 6, 5, 4]
  const profile = (() => {
    // 신발은 유니섹스 비율을 높이고, 그 외는 성별 치우침을 더 자주 보이게
    if (category === '신발') return seed % 5 < 3 ? 'unisex' : (seed % 2 === 0 ? 'male' : 'female')
    return seed % 3 === 0 ? 'unisex' : (seed % 2 === 0 ? 'male' : 'female')
  })()
  const ratioWeights =
    profile === 'male'
      ? ratioWeightsMale
      : profile === 'female'
        ? ratioWeightsFemale
        : ratioWeightsUnisex
  const compShift = (seed % 5) - 2
  const mid = (sizes.length - 1) / 2
  const qtyAlloc = allocateByWeights(productQty, ratioWeights)
  const stockAlloc = allocateByWeights(productAvailableStock, ratioWeights)
  const orderAlloc = allocateByWeights(recommendedOrderQty, ratioWeights)
  return sizes.map((size, idx) => ({
    size,
    ratio: ratioWeights[idx],
    competitorRatio: Math.max(1, ratioWeights[idx]! + (idx % 2 === 0 ? compShift : -compShift)),
    confirmedQty: orderAlloc[idx]!,
    avgPrice: Math.round(productPrice * (1 + (idx - mid) * 0.004)),
    qty: qtyAlloc[idx]!,
    availableStock: stockAlloc[idx]!,
  }))
}

function splitPrimarySecondaryFromSizeMix(
  rows: ReturnType<typeof makeSizeMix>,
): { sizeMix: ProductPrimarySummary['sizeMix']; competitorRatioBySize: Record<string, number> } {
  const competitorRatioBySize: Record<string, number> = {}
  const sizeMix = rows.map((r) => {
    competitorRatioBySize[r.size] = r.competitorRatio
    const { competitorRatio: _, ...primaryRow } = r
    return primaryRow
  })
  return { sizeMix, competitorRatioBySize }
}

const allKnownProductIds = Array.from(new Set([...selfSalesRows, ...competitorSalesRows, ...orderPlanRows].map((row) => row.id)))
const brands = Array.from(new Set([...selfSalesRows, ...competitorSalesRows, ...orderPlanRows].map((row) => row.brand)))
const categories = Array.from(new Set([...selfSalesRows, ...competitorSalesRows, ...orderPlanRows].map((row) => row.category)))
const historicalMonths = SALES_MONTHS.filter((month) => month < '2026-01')

const estimatePeriodWeight = (startDate?: string, endDate?: string) => {
  if (!startDate || !endDate) return 1
  const toMonthIndex = (date: string) => {
    const [y, m] = date.split('-').map(Number)
    return y * 12 + m
  }
  const from = toMonthIndex(startDate)
  const to = toMonthIndex(endDate)
  const span = clamp(Math.abs(to - from) + 1, 1, 24)
  // 12개월 기준으로 환산 (너무 작아지지 않게 하한 적용)
  return clamp(span / 12, 0.2, 1.8)
}
const { primary: productPrimaryById, secondary: productSecondaryById } = (() => {
  const primary: Record<string, ProductPrimarySummary> = {}
  const secondary: Record<string, ProductSecondaryDetail> = {}
  for (const id of allKnownProductIds) {
    const s = selfById[id]
    const c = competitorById[id]
    const o = orderById[id]
    const seed = id.charCodeAt(0)

    const name = s?.name ?? c?.name ?? o?.name ?? `상품-${id}`
    const brand = s?.brand ?? c?.brand ?? o?.brand ?? '나이키'
    const category = s?.category ?? c?.category ?? o?.category ?? '신발'
    const productCode = s?.productCode ?? c?.productCode ?? o?.productCode ?? id

    const price = s?.avgPrice ?? c?.selfAvgPrice ?? Math.round((c?.competitorAvgPrice ?? 120000) * 0.96)
    const competitorPrice = c?.competitorAvgPrice ?? Math.round(price * 1.03)
    const productQty = s?.qty ?? c?.selfQty ?? Math.round((c?.competitorQty ?? 5000) * 0.85)
    const competitorQty = c?.competitorQty ?? Math.round(productQty * 0.9)
    const recommendedOrderQty = o?.recommendedOrderQty ?? Math.round(productQty / 1.7)
    const availableStock = o?.availableStock ?? Math.round(productQty * 0.45)

    const fullMix = makeSizeMix(recommendedOrderQty, productQty, price, availableStock, seed, category)
    const { sizeMix, competitorRatioBySize } = splitPrimarySecondaryFromSizeMix(fullMix)

    primary[id] = {
      id,
      name,
      brand,
      category,
      productCode,
      price,
      qty: productQty,
      availableStock,
      recommendedOrderQty,
      monthlySalesTrend: makeSalesTrend(Math.max(800, Math.round(productQty * 0.42)), seed, 8),
      seasonality: makeSeasonality(id),
      sizeMix,
    }
    secondary[id] = {
      id,
      competitorPrice,
      competitorQty,
      competitorRatioBySize,
    }
  }
  return { primary, secondary }
})()

const stockTrendById: Record<string, Array<{ date: string; stock: number; inboundExpected: number; expectedInboundDate: string | null }>> = Object.fromEntries(allKnownProductIds.map((id) => {
  const d = productPrimaryById[id]
  const seed = id.charCodeAt(0)
  /** 이 SKU 기준 입고 주기(월): 3 또는 4 */
  const inboundCycleMonths = 3 + (seed % 2)
  const warm = d.monthlySalesTrend.slice(0, Math.min(24, d.monthlySalesTrend.length))
  const avgMonthlySales = warm.reduce((a, p) => a + p.sales, 0) / Math.max(1, warm.length)
  /** 전기간 재고 계산용 입고 사이클(표시 노출은 미래 구간만) */
  let monthsUntilInbound = (seed * 5 + id.length) % inboundCycleMonths
  /** 월말 재고: 전월말 + 당월 입고(특정 시점 반영) − 당월 판매 소진 */
  let stock = Math.max(
    200,
    Math.round(avgMonthlySales * (0.9 + (seed % 6) * 0.12)),
  )

  const series = d.monthlySalesTrend.map((point) => {
    const sold = Math.max(1, Math.round(point.sales * (0.88 + (seed % 3) * 0.02)))
    let inbound = 0
    let inboundForDisplay = 0
    let expectedInboundDate: string | null = null
    if (monthsUntilInbound <= 0) {
      /** 기존 재고를 반영해 부족분만 보충: 목표 월말 재고 - (입고 없을 때 월말 재고) */
      const projectedEndStockWithoutInbound = Math.max(0, stock - sold)
      const targetCoverMonths = inboundCycleMonths * (0.88 + (seed % 3) * 0.05)
      const targetEndStock = Math.round(avgMonthlySales * targetCoverMonths)
      const shortage = Math.max(0, targetEndStock - projectedEndStockWithoutInbound)
      const minInbound = Math.round(avgMonthlySales * (0.35 + (seed % 4) * 0.04))
      inbound = shortage > 0 ? Math.max(shortage, minInbound) : 0
      monthsUntilInbound = inboundCycleMonths

      /** 입고 노출 데이터는 미래 구간에서만 제공 */
      if (point.isForecast && inbound > 0) {
        inboundForDisplay = inbound
        const expectedDay = 5 + (seed % 18)
        expectedInboundDate = `${point.date.slice(0, 8)}${String(expectedDay).padStart(2, '0')}`
      }
    }
    monthsUntilInbound -= 1
    stock = Math.max(0, stock + inbound - sold)
    return { date: point.date, stock, inboundExpected: inboundForDisplay, expectedInboundDate }
  })
  return [id, series]
}))

const DAILY_PATTERN_STEADY: readonly number[] = [
  58, 60, 57, 61, 63, 59, 56, 62, 64, 60,
  58, 57, 61, 63, 66, 64, 60, 59, 57, 62,
  65, 67, 63, 61, 60, 58, 59, 62, 64, 66,
]

const DAILY_PATTERN_UP: readonly number[] = [
  48, 50, 49, 51, 52, 50, 53, 54, 55, 56,
  54, 53, 55, 57, 58, 59, 57, 56, 58, 60,
  61, 62, 60, 59, 61, 63, 64, 65, 63, 62,
]

const DAILY_PATTERN_PEAK: readonly number[] = [
  66, 68, 70, 69, 71, 73, 72, 74, 75, 76,
  74, 73, 75, 77, 78, 79, 78, 76, 75, 77,
  79, 81, 80, 78, 77, 76, 75, 77, 79, 80,
]

const DAILY_PATTERN_FORECAST: readonly number[] = [
  62, 63, 61, 64, 65, 63, 62, 64, 66, 65,
  63, 62, 64, 65, 67, 66, 64, 63, 65, 66,
  68, 69, 67, 66, 65, 64, 65, 66, 67, 68,
]

const DAILY_PATTERN_BY_MONTH: Record<string, readonly number[]> = {
  '2024-07': DAILY_PATTERN_STEADY,
  '2024-08': DAILY_PATTERN_STEADY,
  '2024-09': DAILY_PATTERN_UP,
  '2024-10': DAILY_PATTERN_UP,
  '2024-11': DAILY_PATTERN_PEAK,
  '2024-12': DAILY_PATTERN_PEAK,
  '2025-01': DAILY_PATTERN_STEADY,
  '2025-02': DAILY_PATTERN_STEADY,
  '2025-03': DAILY_PATTERN_UP,
  '2025-04': DAILY_PATTERN_UP,
  '2025-05': DAILY_PATTERN_STEADY,
  '2025-06': DAILY_PATTERN_STEADY,
  '2025-07': DAILY_PATTERN_UP,
  '2025-08': DAILY_PATTERN_UP,
  '2025-09': DAILY_PATTERN_PEAK,
  '2025-10': DAILY_PATTERN_PEAK,
  '2025-11': DAILY_PATTERN_PEAK,
  '2025-12': DAILY_PATTERN_PEAK,
  '2026-01': DAILY_PATTERN_FORECAST,
  '2026-02': DAILY_PATTERN_FORECAST,
  '2026-03': DAILY_PATTERN_FORECAST,
  '2026-04': DAILY_PATTERN_FORECAST,
  '2026-05': DAILY_PATTERN_FORECAST,
  '2026-06': DAILY_PATTERN_FORECAST,
}

const DAILY_EXT_SALES_DELTA: readonly number[] = [0, -1, 1, 0, -1, 0, 1, -1, 0, 1]
const DAILY_EXT_STOCK_DELTA: readonly number[] = [-2, -1, -2, -1, -1, -2, -1, -2, -1, -1]
const DAILY_EXT_INBOUND_ADD: readonly number[] = [8, 9, 7, 10, 8, 9, 7, 10, 8, 9]

const daysInMonth = (yyyymm: string) => {
  const [y, m] = yyyymm.split('-').map(Number)
  return new Date(y, m, 0).getDate()
}

const parseIsoDateUtc = (iso: string): Date => {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1))
}

const formatIsoDateUtc = (date: Date) => {
  const y = date.getUTCFullYear()
  const m = String(date.getUTCMonth() + 1).padStart(2, '0')
  const d = String(date.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

const zFromServiceLevelPct = (p: number): number => {
  if (p >= 99) return 2.33
  if (p >= 98) return 2.05
  if (p >= 95) return 1.65
  if (p >= 90) return 1.28
  if (p >= 85) return 1.04
  return 0.84
}

const dailyMeanSigma = (
  trend: MonthlySalesPoint[],
  periodStart: string,
  periodEnd: string,
) => {
  const a = periodStart.slice(0, 7)
  const b = periodEnd.slice(0, 7)
  const inRange = trend.filter((p) => p.date >= a && p.date <= b)
  const slice = inRange.length ? inRange : trend.slice(-6)
  if (slice.length === 0) return { dailyMean: 0, sigma: 0 }
  const sales = slice.map((p) => p.sales)
  const mean = sales.reduce((x, y) => x + y, 0) / sales.length
  const variance = sales.reduce((acc, s) => acc + (s - mean) ** 2, 0) / sales.length
  return { dailyMean: mean / 30, sigma: Math.sqrt(variance) / 30 }
}

const buildSecondaryDailyTrend = (
  monthlyTrend: MonthlySalesPoint[],
  monthlyStockTrend: Array<{ date: string; stock: number; inboundExpected: number; expectedInboundDate: string | null }>,
  startMonth: string,
  leadTimeDays: number,
): SecondaryDailyTrendPoint[] => {
  const full: SecondaryDailyTrendPoint[] = []
  let idx = 0
  let inboundAccum = 0
  const stockByMonth = new Map(monthlyStockTrend.map((row) => [row.date, row]))
  monthlyTrend.forEach((m, monthIdx) => {
    const pattern = DAILY_PATTERN_BY_MONTH[m.date] ?? (m.isForecast ? DAILY_PATTERN_FORECAST : DAILY_PATTERN_STEADY)
    const days = daysInMonth(m.date)
    const stockNow = stockByMonth.get(m.date)
    const stockNext = stockByMonth.get(monthlyTrend[monthIdx + 1]?.date ?? '')
    const monthStartStock = Math.max(0, Math.round(stockNow?.stock ?? stockNext?.stock ?? (m.isForecast ? 160 : 210)))
    const monthEndStock = Math.max(0, Math.round(stockNext?.stock ?? stockNow?.stock ?? monthStartStock))
    const inboundMonthly = Math.max(0, Math.round(stockNow?.inboundExpected ?? 0))
    const inboundDayFromDate = (() => {
      const d = stockNow?.expectedInboundDate
      if (!d || d.slice(0, 7) !== m.date) return null
      const day = Number(d.slice(8, 10))
      if (!Number.isFinite(day)) return null
      return Math.max(1, Math.min(days, Math.trunc(day)))
    })()
    const inboundDay = inboundDayFromDate ?? Math.max(2, Math.min(days, Math.round(days * 0.35)))
    for (let i = 0; i < days; i += 1) {
      const sales = pattern[i % pattern.length]!
      const t = days <= 1 ? 0 : i / (days - 1)
      const baseStock = Math.round(monthStartStock + (monthEndStock - monthStartStock) * t)
      const inboundToday = inboundMonthly > 0 && i + 1 === inboundDay ? inboundMonthly : 0
      inboundAccum += inboundToday
      const stockBar = Math.max(0, baseStock + (i + 1 >= inboundDay ? inboundMonthly : 0))
      full.push({
        idx,
        date: `${m.date}-${String(i + 1).padStart(2, '0')}`,
        month: m.date,
        sales,
        stockBar,
        inboundAccumBar: inboundAccum,
        isForecast: m.isForecast,
      })
      idx += 1
    }
  })
  const startIdx = full.findIndex((p) => p.month >= startMonth)
  if (startIdx === -1) return []
  const out = full.slice(startIdx).map((row, i) => ({ ...row, idx: i }))
  const extendDays = Math.max(0, Math.round(leadTimeDays))
  if (extendDays <= 0) return out
  let last = out[out.length - 1]!
  let date = parseIsoDateUtc(last.date)
  for (let i = 0; i < extendDays; i += 1) {
    date = new Date(date.getTime() + 24 * 60 * 60 * 1000)
    const nextDate = formatIsoDateUtc(date)
    const next = {
      ...last,
      idx: out.length,
      date: nextDate,
      month: nextDate.slice(0, 7),
      sales: Math.max(1, last.sales + DAILY_EXT_SALES_DELTA[i % DAILY_EXT_SALES_DELTA.length]!),
      stockBar: Math.max(0, last.stockBar + DAILY_EXT_STOCK_DELTA[i % DAILY_EXT_STOCK_DELTA.length]!),
      inboundAccumBar: last.inboundAccumBar + DAILY_EXT_INBOUND_ADD[i % DAILY_EXT_INBOUND_ADD.length]!,
      isForecast: true,
    }
    out.push(next)
    last = next
  }
  return out
}

export const mockDashboardApi = {
  getSelfSales: async (params?: { startDate?: string; endDate?: string; brand?: string; category?: string }) => {
    await sleep(80)
    const brand = params?.brand
    const category = params?.category
    const weighted = estimatePeriodWeight(params?.startDate, params?.endDate)

    return selfSalesRows
      .filter((row) => (brand ? row.brand === brand : true))
      .filter((row) => (category ? row.category === category : true))
      .map((row) => {
        const qty = Math.max(1, Math.round(row.qty * weighted))
        const amount = Math.max(1, Math.round(row.amount * weighted))
        const opMarginAmount = Math.max(1, Math.round(row.opMarginAmount * weighted))
        return {
          ...row,
          qty,
          amount,
          opMarginAmount,
        }
      })
  },
  getCompetitorSales: async (params?: CompetitorSalesParams) => {
    await sleep(80)
    const brand = params?.brand
    const category = params?.category
    const weighted = estimatePeriodWeight(params?.startDate, params?.endDate)
    const channel = params?.competitorChannelId
      ? secondaryCompetitorChannels.find((c) => c.id === params.competitorChannelId)
      : undefined
    const priceSkew = channel?.priceSkew ?? 1
    const qtySkew = channel?.qtySkew ?? 1

    return competitorSalesRows
      .filter((row) => (brand ? row.brand === brand : true))
      .filter((row) => (category ? row.category === category : true))
      .map((row) => {
        const compQty = Math.max(1, Math.round(row.competitorQty * weighted * qtySkew))
        const compAvg = Math.max(1, Math.round(row.competitorAvgPrice * priceSkew))
        const competitorAmount = Math.max(1, Math.round(compQty * compAvg))
        const selfQty = row.selfQty != null ? Math.max(1, Math.round(row.selfQty * weighted)) : null
        const selfAmount = row.selfAmount != null ? Math.max(1, Math.round(row.selfAmount * weighted)) : null
        return {
          ...row,
          competitorQty: compQty,
          competitorAvgPrice: compAvg,
          competitorAmount,
          selfQty,
          selfAmount,
        }
      })
  },
  getOrderPlan: async () => { await sleep(80); return orderPlanRows },
  getSelfSalesFilterMeta: async () => {
    await sleep(60)
    return {
      brands,
      categories,
      historicalMonths,
    }
  },
  getProductDrawerBundle: async (id: string, params?: ProductDrawerBundleParams) => {
    await sleep(80)
    const primary = productPrimaryById[id] ?? productPrimaryById[allKnownProductIds[0]]!
    const stockTrend = stockTrendById[id] ?? stockTrendById[allKnownProductIds[0]]!
    const fc = Math.max(1, Math.min(24, Math.round(params?.forecastMonths ?? 8)))
    const seed = id.charCodeAt(0)
    const base = Math.max(800, Math.round(primary.qty * 0.42))
    const summary: ProductPrimarySummary = {
      ...primary,
      monthlySalesTrend: makeSalesTrend(base, seed, fc),
    }
    return { summary, stockTrend }
  },
  getProductSecondaryDetail: async (id: string) => {
    await sleep(80)
    return productSecondaryById[id] ?? productSecondaryById[allKnownProductIds[0]]!
  },
  getSecondaryDailyTrend: async ({ productId, startMonth, leadTimeDays }: SecondaryDailyTrendParams) => {
    await sleep(80)
    const primary = productPrimaryById[productId] ?? productPrimaryById[allKnownProductIds[0]]!
    const stockTrend = stockTrendById[productId] ?? stockTrendById[allKnownProductIds[0]]!
    return buildSecondaryDailyTrend(primary.monthlySalesTrend, stockTrend, startMonth, leadTimeDays)
  },
  getSecondaryCompetitorChannels: async () => {
    await sleep(40)
    return secondaryCompetitorChannels
  },
  getSecondaryLlmAnswer: async (_params: SecondaryLlmAnswerParams) => {
    await sleep(180)
    return [
      '현재 설정 기준으로는 리드타임 동안 수요 변동을 감안한 안전재고 수준이 양호한 편입니다.',
      '다만 시즌 전환 구간이 겹치면 완충재고를 한 단계 낮추고, 입고 주기를 짧게 가져가는 편이 유리해 보입니다.',
      '경쟁 채널 가격이 자사 대비 높게 잡혀 있으니, 프로모션 없이도 단기 수요는 유지될 가능성이 큽니다.',
    ].join('\n')
  },
  saveSecondaryOrderSnapshot: async (snapshot: SecondaryOrderSnapshotPayload) => {
    await sleep(40)
    try {
      const raw = localStorage.getItem(SNAPSHOT_STORAGE_KEY)
      const all = (raw ? JSON.parse(raw) : {}) as Record<string, SecondaryOrderSnapshotPayload[]>
      const list = all[snapshot.productId] ?? []
      list.push(snapshot)
      all[snapshot.productId] = list
      localStorage.setItem(SNAPSHOT_STORAGE_KEY, JSON.stringify(all))
    } catch {
      /* ignore quota */
    }
  },
  getSecondaryStockOrderCalc: async ({
    productId,
    periodStart,
    periodEnd,
    serviceLevelPct,
    leadTimeDays,
    safetyStockMode,
    manualSafetyStock,
    dailyMean: dailyMeanParam,
  }: SecondaryStockOrderCalcParams): Promise<SecondaryStockOrderCalcResult> => {
    await sleep(70)
    const primary = productPrimaryById[productId] ?? productPrimaryById[allKnownProductIds[0]]!
    const fromTrend = dailyMeanSigma(primary.monthlySalesTrend, periodStart, periodEnd)
    const trendDailyMean = Math.round(fromTrend.dailyMean * 10) / 10
    const dailyMean =
      dailyMeanParam !== undefined && Number.isFinite(dailyMeanParam)
        ? Math.max(0, dailyMeanParam)
        : fromTrend.dailyMean
    const sigma = fromTrend.sigma
    const safeLead = Math.max(1, Math.round(leadTimeDays))
    const z = zFromServiceLevelPct(serviceLevelPct)
    const formulaSafetyStock = Math.max(0, Math.round(z * sigma * Math.sqrt(safeLead) + dailyMean * safeLead))
    const safetyStock =
      safetyStockMode === 'manual'
        ? Math.max(0, Math.round(manualSafetyStock))
        : formulaSafetyStock
    const safetyRecQty = Math.max(0, Math.round(safetyStock - primary.availableStock + dailyMean * safeLead))
    const forecastRecQty = Math.max(0, Math.round(dailyMean * safeLead * 1.05))

    const avgCost = Math.round(primary.price * 0.78)
    const opMarginPerUnit = primary.price - avgCost - Math.round(primary.price * 0.13)
    const toAmounts = (qty: number) => ({
      expectedOrderAmount: qty * avgCost,
      expectedSalesAmount: qty * primary.price,
      expectedOpProfit: qty * opMarginPerUnit,
    })

    return {
      trendDailyMean,
      dailyMean: Math.round(dailyMean * 10) / 10,
      sigma,
      display: {
        currentStockQtyTotal: 1330,
        totalOrderBalanceTotal: 520,
        expectedInboundOrderBalanceTotal: 230,
        currentStockQtyBySize: [95, 110, 120, 130, 125, 140, 160, 155, 150, 145],
        totalOrderBalanceBySize: [28, 36, 42, 48, 52, 58, 66, 64, 63, 63],
        expectedInboundOrderBalanceBySize: [10, 14, 18, 21, 23, 26, 31, 29, 29, 29],
      },
      safetyStockCalc: {
        safetyStock,
        recommendedOrderQty: safetyRecQty,
        ...toAmounts(safetyRecQty),
      },
      forecastQtyCalc: {
        safetyStock: null,
        recommendedOrderQty: forecastRecQty,
        ...toAmounts(forecastRecQty),
      },
    }
  },
}
