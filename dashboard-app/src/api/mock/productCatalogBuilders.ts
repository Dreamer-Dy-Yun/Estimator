import type { SelfSalesRow } from '../../types'
import type { MonthlySalesPoint, ProductPrimarySummary, ProductSecondaryDetail } from '../../types'
import { MAX_FORECAST_MONTHS } from '../../utils/forecastMonthsStorage'
import { competitorBySkuGroupKey, selfBySkuGroupKey } from './salesTables'
import { FORECAST_START_MONTH, SALES_MONTHS } from './productCatalogData'

export type MockSkuMetadata = Pick<ProductPrimarySummary, 'skuGroupKey' | 'productName' | 'brand' | 'category' | 'code' | 'colorCode'>
type MakeSalesTrendOptions = {
  historyStartMonth?: string
  historyEndMonth?: string
  forecastStartMonth?: string
}

const monthIndex: (month: string) => number | null = (month: string) : number | null => {
  const [year, monthNo]: number[] = month.split('-').map(Number)
  if (!Number.isFinite(year) || !Number.isFinite(monthNo)) return null
  return year * 12 + monthNo - 1
}

const monthFromIndex: (index: number) => string = (index: number) : string => `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, '0')}`

const monthKeysBetween: (startMonth: string, endMonth: string) => string[] = (startMonth: string, endMonth: string): string[] => {
  const start: number | null = monthIndex(startMonth)
  const end: number | null = monthIndex(endMonth)
  if (start == null || end == null) return []
  const first: number = Math.min(start, end)
  const last: number = Math.max(start, end)
  return Array.from({ length: last - first + 1 }, (_: unknown, index: number) : string => monthFromIndex(first + index))
}

export function buildSkuMetadata(skuGroupKey: string): MockSkuMetadata {
  const source: SelfSalesRow = selfBySkuGroupKey[skuGroupKey] ?? competitorBySkuGroupKey[skuGroupKey]
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

export const makeSalesTrend: (base: number, seed: number, forecastMonths: number, options?: MakeSalesTrendOptions) => MonthlySalesPoint[] = (
  base: number,
  seed: number,
  forecastMonths: number,
  options: MakeSalesTrendOptions = {},
): MonthlySalesPoint[] => {
  const historical: string[] = options.historyStartMonth && options.historyEndMonth
    ? monthKeysBetween(options.historyStartMonth, options.historyEndMonth)
    : SALES_MONTHS.filter((date: string) : boolean => date < FORECAST_START_MONTH)
  const forecastStart: number = monthIndex(options.forecastStartMonth ?? FORECAST_START_MONTH) ?? monthIndex(FORECAST_START_MONTH)!
  const forecastStartMonth: string = monthFromIndex(forecastStart)
  const forecastMonthsClamped: number = Math.max(1, Math.min(MAX_FORECAST_MONTHS, Math.round(forecastMonths)))
  return [...historical, ...Array.from({ length: forecastMonthsClamped }, (_: unknown, index: number) : string => monthFromIndex(forecastStart + index))]
    .map((date: string, index: number) : { date: string; sales: number; isForecast: boolean; } => ({
      date,
      sales: Math.max(80, Math.round(base * (0.84 + index * 0.018) * (1 + Math.sin((index + seed) * 0.45) * 0.1))),
      isForecast: date >= forecastStartMonth,
    }))
}

function allocateByWeights(total: number, weights: readonly number[]): number[] {
  const sum: number = weights.reduce((acc: number, value: number) : number => acc + value, 0)
  const floors: number[] = weights.map((weight: number) : number => Math.floor((total * weight) / Math.max(1, sum)))
  let remain: number = total - floors.reduce((acc: number, value: number) : number => acc + value, 0)
  for (let index: number = 0; remain > 0; index = (index + 1) % floors.length, remain -= 1) {
    floors[index] = (floors[index] ?? 0) + 1
  }
  return floors
}

export const makeSizeMix: (initialOrderQty: number, productQty: number, productPrice: number, productAvailableStock: number, seed: number, category: string) => { size: string; ratio: number; competitorRatio: number; confirmedQty: number; avgPrice: number; qty: number; availableStock: number; }[] = (
  initialOrderQty: number,
  productQty: number,
  productPrice: number,
  productAvailableStock: number,
  seed: number,
  category: string,
) : { size: string; ratio: number; competitorRatio: number; confirmedQty: number; avgPrice: number; qty: number; availableStock: number; }[] => {
  const isApparel: boolean = category === '의류'
  const sizes: string[] = isApparel ? ['S', 'M', 'L', 'XL', 'XXL'] : ['235', '240', '245', '250', '255', '260', '265', '270', '275', '280']
  const baseWeights: number[] = isApparel ? [7, 12, 15, 13, 8] : [5, 7, 9, 11, 13, 14, 13, 11, 9, 7]
  const midpoint: number = (sizes.length - 1) / 2
  const weights: number[] = baseWeights.map((weight: number, index: number) : number => Math.max(1, Math.round(weight * (1 + ((index - midpoint) * ((seed % 5) - 2)) / 30))))
  const qtyAlloc: number[] = allocateByWeights(productQty, weights)
  const stockAlloc: number[] = allocateByWeights(productAvailableStock, weights)
  const orderAlloc: number[] = allocateByWeights(initialOrderQty, weights)
  return sizes.map((size: string, index: number) : { size: string; ratio: number; competitorRatio: number; confirmedQty: number; avgPrice: number; qty: number; availableStock: number; } => ({
    size,
    ratio: weights[index]!,
    competitorRatio: Math.max(1, Math.round(baseWeights[index]! * (1 - ((index - midpoint) * ((seed % 3) - 1)) / 24))),
    confirmedQty: orderAlloc[index]!,
    avgPrice: Math.round(productPrice * (1 + (index - midpoint) * 0.004)),
    qty: qtyAlloc[index]!,
    availableStock: stockAlloc[index]!,
  }))
}

export function splitSecondarySizeRows(rows: ReturnType<typeof makeSizeMix>): Pick<ProductSecondaryDetail, 'sizeRows' | 'comparisonRatioBySize'> {
  const comparisonRatioBySize: Record<string, number> = {}
  const competitorRatioTotal: number = rows.reduce((sum: number, row: { size: string; ratio: number; competitorRatio: number; confirmedQty: number; avgPrice: number; qty: number; availableStock: number; }) : number => sum + Math.max(0, row.competitorRatio), 0)
  const sizeRows: { selfRatio: number; size: string; confirmedQty: number; avgPrice: number; qty: number; availableStock: number; }[] = rows.map(({ ratio, competitorRatio, ...row }: { size: string; ratio: number; competitorRatio: number; confirmedQty: number; avgPrice: number; qty: number; availableStock: number; }) : { selfRatio: number; size: string; confirmedQty: number; avgPrice: number; qty: number; availableStock: number; } => {
    comparisonRatioBySize[row.size] = competitorRatioTotal > 0 ? Math.max(0, competitorRatio) / competitorRatioTotal : 0
    return { ...row, selfRatio: ratio }
  })
  return { sizeRows, comparisonRatioBySize }
}

export function makeStockTrend(skuGroupKey: string, monthlySalesTrend: MonthlySalesPoint[]) : { date: string; stock: number; inboundExpected: number; inboundQty: number; }[] {
  const seed: number = skuGroupKey.charCodeAt(0)
  const warm: MonthlySalesPoint[] = monthlySalesTrend.slice(0, Math.min(24, monthlySalesTrend.length))
  const avgSales: number = warm.reduce((sum: number, point: MonthlySalesPoint) : number => sum + point.sales, 0) / Math.max(1, warm.length)
  let stock: number = Math.max(200, Math.round(avgSales * (0.9 + (seed % 6) * 0.12)))
  return monthlySalesTrend.map((point: MonthlySalesPoint, index: number) : { date: string; stock: number; inboundExpected: number; inboundQty: number; } => {
    const sold: number = Math.max(1, Math.round(point.sales * (0.88 + (seed % 3) * 0.02)))
    const inboundQty: number = index % (3 + (seed % 2)) === 0 ? Math.round(avgSales * (0.35 + (seed % 4) * 0.04)) : 0
    stock = Math.max(0, stock + inboundQty - sold)
    return {
      date: point.date,
      stock,
      inboundExpected: point.isForecast ? inboundQty : 0,
      inboundQty,
    }
  })
}
