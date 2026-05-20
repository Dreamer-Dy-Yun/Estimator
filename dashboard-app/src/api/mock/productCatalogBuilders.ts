import type { ProductPrimarySummary } from '../../types'
import { competitorBySkuGroupKey, selfBySkuGroupKey } from './salesTables'
import { FORECAST_START_MONTH, SALES_MONTHS, SEASONALITY_TEMPLATES } from './productCatalogData'

type MockSkuMetadata = Pick<
  ProductPrimarySummary,
  'skuGroupKey' | 'productName' | 'brand' | 'category' | 'code' | 'colorCode'
>

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

export function buildSkuMetadata(skuGroupKey: string): MockSkuMetadata {
  const source = selfBySkuGroupKey[skuGroupKey] ?? competitorBySkuGroupKey[skuGroupKey]
  if (!source) throw new Error(`Missing mock SKU metadata: ${skuGroupKey}`)
  return {
    skuGroupKey,
    productName: source.productName,
    brand: source.brand,
    category: source.category,
    code: source.code,
    colorCode: source.colorCode,
  }
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

const hashSkuGroupKey = (skuGroupKey: string) => [...skuGroupKey].reduce((acc, ch) => acc + ch.charCodeAt(0), 0)

export const makeSeasonality = (skuGroupKey: string) => {
  const h = hashSkuGroupKey(skuGroupKey)
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

export const makeSizeMix = (
  recommendedOrderQty: number,
  productQty: number,
  productPrice: number,
  productAvailableStock: number,
  seed: number,
  category: string,
) => {
  const isApparel = category === '의류'
  const sizes = isApparel
    ? ['S', 'M', 'L', 'XL', 'XXL']
    : ['235', '240', '245', '250', '255', '260', '265', '270', '275', '280']
  const ratioWeightsUnisex = isApparel
    ? [7, 12, 15, 13, 8]
    : [5, 7, 9, 11, 13, 14, 13, 11, 9, 7]
  const ratioWeightsMale = isApparel
    ? [4, 9, 13, 16, 14]
    : [3, 4, 6, 8, 10, 12, 14, 15, 15, 13]
  const ratioWeightsFemale = isApparel
    ? [15, 16, 13, 9, 4]
    : [14, 15, 15, 13, 11, 9, 7, 6, 5, 4]
  const profile = (() => {
    if (category === '신발') return seed % 5 < 3 ? 'unisex' : (seed % 2 === 0 ? 'male' : 'female')
    return seed % 3 === 0 ? 'unisex' : (seed % 2 === 0 ? 'male' : 'female')
  })()
  const ratioWeights =
    profile === 'male'
      ? ratioWeightsMale
      : profile === 'female'
        ? ratioWeightsFemale
        : ratioWeightsUnisex
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

export function splitPrimarySecondaryFromSizeMix(
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

export function makeStockTrend(
  skuGroupKey: string,
  product: ProductPrimarySummary,
): Array<{
  date: string
  stock: number
  inboundExpected: number
  inboundQty: number
}> {
  const seed = skuGroupKey.charCodeAt(0)
  const inboundCycleMonths = 3 + (seed % 2)
  const monthlySalesTrend = product.monthlySalesTrend ?? []
  const warm = monthlySalesTrend.slice(0, Math.min(24, monthlySalesTrend.length))
  const avgMonthlySales = warm.reduce((a, p) => a + p.sales, 0) / Math.max(1, warm.length)
  let monthsUntilInbound = (seed * 5 + skuGroupKey.length) % inboundCycleMonths
  let stock = Math.max(
    200,
    Math.round(avgMonthlySales * (0.9 + (seed % 6) * 0.12)),
  )

  return monthlySalesTrend.map((point) => {
    const sold = Math.max(1, Math.round(point.sales * (0.88 + (seed % 3) * 0.02)))
    let inbound = 0
    let inboundForDisplay = 0
    if (monthsUntilInbound <= 0) {
      const projectedEndStockWithoutInbound = Math.max(0, stock - sold)
      const targetCoverMonths = inboundCycleMonths * (0.88 + (seed % 3) * 0.05)
      const targetEndStock = Math.round(avgMonthlySales * targetCoverMonths)
      const shortage = Math.max(0, targetEndStock - projectedEndStockWithoutInbound)
      const minInbound = Math.round(avgMonthlySales * (0.35 + (seed % 4) * 0.04))
      inbound = shortage > 0 ? Math.max(shortage, minInbound) : 0
      monthsUntilInbound = inboundCycleMonths

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
}
