import type { ProductPrimarySummary, ProductSecondaryDetail } from '../../types'
import { clamp } from './utils'
import { allKnownProductIds, competitorById, selfById } from './salesTables'

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
export const makeSalesTrend = (base: number, seed: number, forecastMonths: number) => {
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
  // 경쟁사 비중은 자사와 유사하지 않도록 별도 프로파일을 선택
  const competitorProfile = (() => {
    if (profile === 'unisex') return seed % 2 === 0 ? 'male' : 'female'
    if (profile === 'male') return seed % 3 === 0 ? 'unisex' : 'female'
    return seed % 3 === 0 ? 'unisex' : 'male'
  })()
  const competitorRatioWeightsBase =
    competitorProfile === 'male'
      ? ratioWeightsMale
      : competitorProfile === 'female'
        ? ratioWeightsFemale
        : ratioWeightsUnisex
  const competitorTilt = (seed % 4) - 1.5
  const mid = (sizes.length - 1) / 2
  const qtyAlloc = allocateByWeights(productQty, ratioWeights)
  const stockAlloc = allocateByWeights(productAvailableStock, ratioWeights)
  const orderAlloc = allocateByWeights(recommendedOrderQty, ratioWeights)
  return sizes.map((size, idx) => ({
    size,
    ratio: ratioWeights[idx],
    competitorRatio: Math.max(
      1,
      Math.round(
        competitorRatioWeightsBase[idx]! * (1 + (idx - mid) * competitorTilt * 0.08),
      ),
    ),
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
    const { competitorRatio, ...primaryRow } = r
    void competitorRatio
    return primaryRow
  })
  return { sizeMix, competitorRatioBySize }
}

export const historicalMonths = SALES_MONTHS.filter((month) => month < '2026-01')

export const estimatePeriodWeight = (startDate?: string, endDate?: string) => {
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
export const { primary: productPrimaryById, secondary: productSecondaryById } = (() => {
  const primary: Record<string, ProductPrimarySummary> = {}
  const secondary: Record<string, ProductSecondaryDetail> = {}
  for (const id of allKnownProductIds) {
    const s = selfById[id]
    const c = competitorById[id]
    const seed = id.charCodeAt(0)

    const name = s?.name ?? c?.name ?? `상품-${id}`
    const brand = s?.brand ?? c?.brand ?? '나이키'
    const category = s?.category ?? c?.category ?? '신발'
    const productCode = s?.productCode ?? c?.productCode ?? id

    const price = s?.avgPrice ?? c?.selfAvgPrice ?? Math.round((c?.competitorAvgPrice ?? 120000) * 0.96)
    const competitorPrice = c?.competitorAvgPrice ?? Math.round(price * 1.03)
    const productQty = s?.qty ?? c?.selfQty ?? Math.round((c?.competitorQty ?? 5000) * 0.85)
    const competitorQty = c?.competitorQty ?? Math.round(productQty * 0.9)
    const recommendedOrderQty = Math.round(productQty / 1.7)
    const availableStock = Math.round(productQty * 0.45)

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
export const stockTrendById: Record<string, Array<{
  date: string
  stock: number
  inboundExpected: number
  inboundQty: number
}>> = Object.fromEntries(allKnownProductIds.map((id) => {
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
    if (monthsUntilInbound <= 0) {
      /** 기존 재고를 반영해 부족분만 보충: 목표 월말 재고 - (입고 없을 때 월말 재고) */
      const projectedEndStockWithoutInbound = Math.max(0, stock - sold)
      const targetCoverMonths = inboundCycleMonths * (0.88 + (seed % 3) * 0.05)
      const targetEndStock = Math.round(avgMonthlySales * targetCoverMonths)
      const shortage = Math.max(0, targetEndStock - projectedEndStockWithoutInbound)
      const minInbound = Math.round(avgMonthlySales * (0.35 + (seed % 4) * 0.04))
      inbound = shortage > 0 ? Math.max(shortage, minInbound) : 0
      monthsUntilInbound = inboundCycleMonths

      /** 1차 드로어: 미래 구간만 입고 예정 금액 노출 */
      if (point.isForecast && inbound > 0) {
        inboundForDisplay = inbound
      }
    }
    monthsUntilInbound -= 1
    stock = Math.max(0, stock + inbound - sold)
    return {
      date: point.date,
      stock,
      inboundExpected: inboundForDisplay,
      inboundQty: inbound,
    }
  })
  return [id, series]
}))
