import type { MonthlySalesPoint, ProductPrimarySummary, ProductSecondaryDetail } from '../../types'
import { competitorBySkuGroupKey, selfBySkuGroupKey } from './salesTables'
import { FORECAST_START_MONTH, SALES_MONTHS } from './productCatalogData'

type MockSkuMetadata = Pick<ProductPrimarySummary, 'skuGroupKey' | 'productName' | 'brand' | 'category' | 'code' | 'colorCode'>

const monthKeysFrom = (year: number, month: number, count: number): string[] => Array.from({ length: count }, (_, idx) => {
  const total = year * 12 + month - 1 + idx
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, '0')}`
})

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

export const makeSalesTrend = (base: number, seed: number, forecastMonths: number): MonthlySalesPoint[] => {
  const historical = SALES_MONTHS.filter((date) => date < FORECAST_START_MONTH)
  return [...historical, ...monthKeysFrom(2026, 1, Math.max(1, Math.min(24, Math.round(forecastMonths))))]
    .map((date, index) => ({
      date,
      sales: Math.max(80, Math.round(base * (0.84 + index * 0.018) * (1 + Math.sin((index + seed) * 0.45) * 0.1))),
      isForecast: date >= FORECAST_START_MONTH,
    }))
}

function allocateByWeights(total: number, weights: readonly number[]): number[] {
  const sum = weights.reduce((acc, value) => acc + value, 0)
  const floors = weights.map((weight) => Math.floor((total * weight) / Math.max(1, sum)))
  let remain = total - floors.reduce((acc, value) => acc + value, 0)
  for (let index = 0; remain > 0; index = (index + 1) % floors.length, remain -= 1) {
    floors[index] = (floors[index] ?? 0) + 1
  }
  return floors
}

export const makeSizeMix = (
  initialOrderQty: number,
  productQty: number,
  productPrice: number,
  productAvailableStock: number,
  seed: number,
  category: string,
) => {
  const isApparel = category === '의류'
  const sizes = isApparel ? ['S', 'M', 'L', 'XL', 'XXL'] : ['235', '240', '245', '250', '255', '260', '265', '270', '275', '280']
  const baseWeights = isApparel ? [7, 12, 15, 13, 8] : [5, 7, 9, 11, 13, 14, 13, 11, 9, 7]
  const midpoint = (sizes.length - 1) / 2
  const weights = baseWeights.map((weight, index) => Math.max(1, Math.round(weight * (1 + ((index - midpoint) * ((seed % 5) - 2)) / 30))))
  const qtyAlloc = allocateByWeights(productQty, weights)
  const stockAlloc = allocateByWeights(productAvailableStock, weights)
  const orderAlloc = allocateByWeights(initialOrderQty, weights)
  return sizes.map((size, index) => ({
    size,
    ratio: weights[index]!,
    competitorRatio: Math.max(1, Math.round(baseWeights[index]! * (1 - ((index - midpoint) * ((seed % 3) - 1)) / 24))),
    confirmedQty: orderAlloc[index]!,
    avgPrice: Math.round(productPrice * (1 + (index - midpoint) * 0.004)),
    qty: qtyAlloc[index]!,
    availableStock: stockAlloc[index]!,
  }))
}

export function splitSecondarySizeRows(rows: ReturnType<typeof makeSizeMix>): Pick<ProductSecondaryDetail, 'sizeRows' | 'competitorRatioBySize'> {
  const competitorRatioBySize: Record<string, number> = {}
  const competitorRatioTotal = rows.reduce((sum, row) => sum + Math.max(0, row.competitorRatio), 0)
  const sizeRows = rows.map(({ ratio, competitorRatio, ...row }) => {
    competitorRatioBySize[row.size] = competitorRatioTotal > 0 ? Math.max(0, competitorRatio) / competitorRatioTotal : 0
    return { ...row, selfRatio: ratio }
  })
  return { sizeRows, competitorRatioBySize }
}

export function makeStockTrend(skuGroupKey: string, monthlySalesTrend: MonthlySalesPoint[]) {
  const seed = skuGroupKey.charCodeAt(0)
  const warm = monthlySalesTrend.slice(0, Math.min(24, monthlySalesTrend.length))
  const avgSales = warm.reduce((sum, point) => sum + point.sales, 0) / Math.max(1, warm.length)
  let stock = Math.max(200, Math.round(avgSales * (0.9 + (seed % 6) * 0.12)))
  return monthlySalesTrend.map((point, index) => {
    const sold = Math.max(1, Math.round(point.sales * (0.88 + (seed % 3) * 0.02)))
    const inboundQty = index % (3 + (seed % 2)) === 0 ? Math.round(avgSales * (0.35 + (seed % 4) * 0.04)) : 0
    stock = Math.max(0, stock + inboundQty - sold)
    return {
      date: point.date,
      stock,
      inboundExpected: point.isForecast ? inboundQty : 0,
      inboundQty,
    }
  })
}
