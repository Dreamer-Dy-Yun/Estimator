import type { CompetitorSalesRow, SelfSalesRow } from '../../types'
import type { MonthlySalesPoint, ProductPrimarySummary, ProductSecondaryDetail } from '../../types'
import { clamp } from './utils'
import { allKnownSkuGroupKeys, competitorBySkuGroupKey, selfBySkuGroupKey } from './salesTables'
import { KREAM_TO_SELF_QTY_RATIO, SALES_MONTHS } from './productCatalogData'
import {
  allocateByWeights,
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

const TWENTY_SIZE_SCROLL_TEST_SIZE_COUNT = 20 as const
const TWENTY_SIZE_SCROLL_TEST_MIN_SIZE = 200 as const
const TWENTY_SIZE_SCROLL_TEST_STEP = 5 as const
const TWENTY_SIZE_SCROLL_TEST_SIZES: readonly string[] = Array.from(
  { length: TWENTY_SIZE_SCROLL_TEST_SIZE_COUNT },
  (_: unknown, index: number): string => String(TWENTY_SIZE_SCROLL_TEST_MIN_SIZE + index * TWENTY_SIZE_SCROLL_TEST_STEP),
)
const TWENTY_SIZE_SCROLL_TEST_SELF_WEIGHTS: readonly number[] = [2, 3, 4, 5, 6, 7, 8, 9, 10, 10, 9, 8, 7, 5, 3, 2, 1.5, 1.2, 1, 0.8]
const TWENTY_SIZE_SCROLL_TEST_COMPARISON_WEIGHTS: readonly number[] = [1, 1.4, 2, 3, 4, 5, 7, 8, 9, 10, 10, 9, 8, 7, 5, 4, 3, 2, 1.4, 1]

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
  const selfRatios: number[] = [8, 18, 34, 26, 14]
  const comparisonRatios: number[] = [30, 28, 22, 14, 6]
  const confirmedQtyValues: number[] = [160, 360, 680, 520, 280]
  const salesQtyValues: number[] = [192, 432, 816, 624, 336]
  const stockQtyValues: number[] = [96, 216, 408, 312, 168]
  const avgPriceValues: number[] = [98000, 99000, 100000, 101000, 102000]
  return {
    skuGroupKey,
    comparisonPrice,
    comparisonQty,
    comparisonRatioBySize: Object.fromEntries(sizes.map((size: string, index: number) : [string, number] => [size, (comparisonRatios[index] ?? 0) / 100])),
    sizeRows: sizes.map((size: string, index: number) : { size: string; selfRatio: number; confirmedQty: number; avgPrice: number; qty: number; availableStock: number; } => ({
      size,
      selfRatio: selfRatios[index] ?? 0,
      confirmedQty: confirmedQtyValues[index] ?? 0,
      avgPrice: avgPriceValues[index] ?? 0,
      qty: salesQtyValues[index] ?? 0,
      availableStock: stockQtyValues[index] ?? 0,
    })),
  }
}

function buildInboundSplitVerificationSecondary(skuGroupKey: string): ProductSecondaryDetail {
  const sizes: string[] = ['230', '240', '250', '260']
  const selfRatios: number[] = [11, 23, 31, 17]
  const comparisonRatios: number[] = [19, 13, 41, 27]
  const comparisonRatioTotal: number = comparisonRatios.reduce((sum: number, ratio: number): number => sum + ratio, 0)
  const confirmedQtyValues: number[] = [137, 221, 358, 149]
  const salesQtyValues: number[] = [203, 328, 473, 255]
  const stockQtyValues: number[] = [87, 29, 0, 11]
  return {
    skuGroupKey,
    comparisonPrice: 129000,
    comparisonQty: 1391,
    comparisonRatioBySize: Object.fromEntries(sizes.map((size: string, index: number): [string, number] => [size, (comparisonRatios[index] ?? 0) / comparisonRatioTotal])),
    sizeRows: sizes.map((size: string, index: number): ProductSecondaryDetail['sizeRows'][number] => ({
      size,
      selfRatio: selfRatios[index] ?? 0,
      confirmedQty: confirmedQtyValues[index] ?? 0,
      avgPrice: 129000,
      qty: salesQtyValues[index] ?? 0,
      availableStock: stockQtyValues[index] ?? 0,
    })),
  }
}

function buildTwentySizeScrollTestSecondary(
  skuGroupKey: string,
  price: number,
  comparisonPrice: number,
  comparisonQty: number,
  productQty: number,
  availableStock: number,
): ProductSecondaryDetail {
  const orderQty: number = Math.max(0, Math.round(productQty * 0.76))
  const confirmedQtyValues: number[] = allocateByWeights(orderQty, TWENTY_SIZE_SCROLL_TEST_SELF_WEIGHTS)
  const salesQtyValues: number[] = allocateByWeights(productQty, TWENTY_SIZE_SCROLL_TEST_SELF_WEIGHTS)
  const stockQtyValues: number[] = allocateByWeights(availableStock, TWENTY_SIZE_SCROLL_TEST_COMPARISON_WEIGHTS)
  const comparisonRatioTotal: number = TWENTY_SIZE_SCROLL_TEST_COMPARISON_WEIGHTS.reduce((sum: number, ratio: number): number => sum + ratio, 0)
  const midpoint: number = (TWENTY_SIZE_SCROLL_TEST_SIZES.length - 1) / 2

  return {
    skuGroupKey,
    comparisonPrice,
    comparisonQty,
    comparisonRatioBySize: Object.fromEntries(TWENTY_SIZE_SCROLL_TEST_SIZES.map((size: string, index: number): [string, number] => [
      size,
      (TWENTY_SIZE_SCROLL_TEST_COMPARISON_WEIGHTS[index] ?? 0) / comparisonRatioTotal,
    ])),
    sizeRows: TWENTY_SIZE_SCROLL_TEST_SIZES.map((size: string, index: number): ProductSecondaryDetail['sizeRows'][number] => ({
      size,
      selfRatio: TWENTY_SIZE_SCROLL_TEST_SELF_WEIGHTS[index] ?? 0,
      confirmedQty: confirmedQtyValues[index] ?? 0,
      avgPrice: Math.round(price * (1 + (index - midpoint) * 0.0025)),
      qty: salesQtyValues[index] ?? 0,
      availableStock: stockQtyValues[index] ?? 0,
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

    if (metadata.code === 'TEST-SHOE') {
      primary[skuGroupKey] = {
        ...metadata,
        productName: '예상입고/기존재고 분할설정 적용 테스트',
        brand: '입고분할검증',
        category: '신발',
        price: 129000,
        qty: 1259,
        availableStock: 127,
        monthlySalesTrend: makeFlatTrend(0, 210),
      }
      secondary[skuGroupKey] = buildInboundSplitVerificationSecondary(skuGroupKey)
      continue
    }

    if (metadata.code === 'TEST-SIZE20') {
      const price: number = s?.avgPrice ?? c?.selfAvgPrice ?? 137000
      const productQty: number = s?.qty ?? c?.selfQty ?? 4200
      const comparisonPrice: number = c?.competitorAvgPrice ?? Math.round(price * 1.03)
      const comparisonQty: number = c?.competitorQty ?? Math.round(productQty * 1.08)
      const availableStock: number = Math.round(productQty * 0.4)

      primary[skuGroupKey] = {
        ...metadata,
        price,
        qty: productQty,
        availableStock,
        monthlySalesTrend: buildSalesTrend(Math.max(800, Math.round(productQty * 0.42)), seed, 8),
      }
      secondary[skuGroupKey] = buildTwentySizeScrollTestSecondary(
        skuGroupKey,
        price,
        comparisonPrice,
        comparisonQty,
        productQty,
        availableStock,
      )
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
