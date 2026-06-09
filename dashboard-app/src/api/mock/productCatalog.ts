import type { CompetitorSalesRow, SelfSalesRow } from '../../types'
import type { MonthlySalesPoint, ProductPrimarySummary, ProductSecondaryDetail } from '../../types'
import { clamp } from './utils'
import { allKnownSkuGroupKeys, competitorBySkuGroupKey, selfBySkuGroupKey } from './salesTables'
import { KREAM_TO_SELF_QTY_RATIO, SALES_MONTHS } from './productCatalogData'
import {
  buildSkuMetadata,
  makeSalesTrend as buildSalesTrend,
  makeSizeMix,
  makeStockTrend,
  splitSecondarySizeRows,
} from './productCatalogBuilders'

export { makeSalesTrend } from './productCatalogBuilders'

export type MockSkuMetadata = Pick<
  ProductPrimarySummary,
  'skuGroupKey' | 'productName' | 'brand' | 'category' | 'code' | 'colorCode'
>

export const historicalMonths: string[] = SALES_MONTHS.filter((month: string) : boolean => month < '2026-01')

function makeFlatTrend(historySales: number, forecastSales: number): MonthlySalesPoint[] {
  return SALES_MONTHS.map((date: string) : { date: string; sales: number; isForecast: boolean; } => ({
    date,
    sales: date < '2026-01' ? historySales : forecastSales,
    isForecast: date >= '2026-01',
  }))
}

function buildSimpleCalcSecondary(skuGroupKey: string, comparisonPrice: number, comparisonQty: number): ProductSecondaryDetail {
  const sizes: string[] = ['S', 'M', 'L', 'XL', 'XXL']
  return {
    skuGroupKey,
    comparisonPrice,
    comparisonQty,
    comparisonRatioBySize: Object.fromEntries(sizes.map((size: string) : [string, number] => [size, 0.2])),
    sizeRows: sizes.map((size: string) : { size: string; selfRatio: number; confirmedQty: number; avgPrice: number; qty: number; availableStock: number; } => ({
      size,
      selfRatio: 20,
      confirmedQty: 400,
      avgPrice: 100000,
      qty: 480,
      availableStock: 240,
    })),
  }
}

export const skuMetadataBySkuGroupKey: Record<string, MockSkuMetadata> = Object.fromEntries(
  allKnownSkuGroupKeys.map((skuGroupKey: string) : [string, MockSkuMetadata] => [skuGroupKey, buildSkuMetadata(skuGroupKey)]),
)

export const estimatePeriodWeight: (startDate?: string, endDate?: string) => number = (startDate?: string, endDate?: string) : number => {
  if (!startDate || !endDate) return 1
  const toMonthIndex: (date: string) => number = (date: string) : number => {
    const [y, m]: number[] = date.split('-').map(Number)
    return y * 12 + m
  }
  const from: number = toMonthIndex(startDate)
  const to: number = toMonthIndex(endDate)
  const span: number = clamp(Math.abs(to - from) + 1, 1, 24)
  return clamp(span / 12, 0.2, 1.8)
}

export const { primary: productPrimaryBySkuGroupKey, secondary: productSecondaryBySkuGroupKey }: { primary: Record<string, ProductPrimarySummary>; secondary: Record<string, ProductSecondaryDetail>; } = (() : { primary: Record<string, ProductPrimarySummary>; secondary: Record<string, ProductSecondaryDetail>; } => {
  const primary: Record<string, ProductPrimarySummary> = {}
  const secondary: Record<string, ProductSecondaryDetail> = {}
  for (const skuGroupKey of allKnownSkuGroupKeys) {
    const s: SelfSalesRow = selfBySkuGroupKey[skuGroupKey]
    const c: CompetitorSalesRow = competitorBySkuGroupKey[skuGroupKey]
    const seed: number = skuGroupKey.charCodeAt(0)
    const metadata: MockSkuMetadata = skuMetadataBySkuGroupKey[skuGroupKey]
    if (!metadata) throw new Error(`Missing mock SKU metadata: ${skuGroupKey}`)

    if (metadata.code === 'TEST-TOP') {
      primary[skuGroupKey] = {
        ...metadata,
        price: 100000,
        qty: 2400,
        availableStock: 1200,
        monthlySalesTrend: makeFlatTrend(200, 200),
      }
      secondary[skuGroupKey] = buildSimpleCalcSecondary(skuGroupKey, 110000, 4800)
      continue
    }

    const price: number = s?.avgPrice ?? c?.selfAvgPrice ?? Math.round((c?.competitorAvgPrice ?? 120000) * 0.96)
    const productQty: number = s?.qty ?? c?.selfQty ?? Math.round((c?.competitorQty ?? 5000) * 0.85)
    const comparisonPrice: number = c?.competitorAvgPrice ?? Math.round(price * 1.03)
    const comparisonQty: number = c?.competitorQty ?? Math.max(0, Math.round(productQty * KREAM_TO_SELF_QTY_RATIO))
    const initialOrderQty: number = Math.round(productQty / 1.7)
    const availableStock: number = Math.round(productQty * 0.45)

    const monthlySalesTrend: MonthlySalesPoint[] = buildSalesTrend(Math.max(800, Math.round(productQty * 0.42)), seed, 8)
    const fullMix: { size: string; ratio: number; competitorRatio: number; confirmedQty: number; avgPrice: number; qty: number; availableStock: number; }[] = makeSizeMix(initialOrderQty, productQty, price, availableStock, seed, metadata.category)
    const { sizeRows, comparisonRatioBySize }: { sizeRows: ProductSecondaryDetail['sizeRows']; comparisonRatioBySize: ProductSecondaryDetail['comparisonRatioBySize']; } = splitSecondarySizeRows(fullMix)

    primary[skuGroupKey] = {
      ...metadata,
      price,
      qty: productQty,
      availableStock,
      monthlySalesTrend,
    }
    secondary[skuGroupKey] = {
      skuGroupKey,
      comparisonPrice,
      comparisonQty,
      comparisonRatioBySize: comparisonRatioBySize,
      sizeRows,
    }
  }
  return { primary, secondary }
})()

export const stockTrendBySkuGroupKey: Record<string, Array<{
  date: string
  stock: number
  inboundExpected: number
  inboundQty: number
}>> = Object.fromEntries(Object.keys(productPrimaryBySkuGroupKey).map((skuGroupKey: string) : [string, { date: string; stock: number; inboundExpected: number; inboundQty: number; }[]] => {
  const product: ProductPrimarySummary = productPrimaryBySkuGroupKey[skuGroupKey]
  if (!product) throw new Error(`Missing product primary for stock trend: ${skuGroupKey}`)
  return [skuGroupKey, makeStockTrend(skuGroupKey, product.monthlySalesTrend ?? [])]
}))
