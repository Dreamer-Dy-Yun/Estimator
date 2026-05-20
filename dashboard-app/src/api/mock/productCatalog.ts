import type { ProductPrimarySummary, ProductSecondaryDetail } from '../../types'
import { clamp } from './utils'
import { allKnownSkuGroupKeys, competitorBySkuGroupKey, selfBySkuGroupKey } from './salesTables'
import { KREAM_TO_SELF_QTY_RATIO, SALES_MONTHS } from './productCatalogData'
import {
  buildSkuMetadata,
  makeSalesTrend as buildSalesTrend,
  makeSeasonality,
  makeSizeMix,
  makeStockTrend,
  splitPrimarySecondaryFromSizeMix,
} from './productCatalogBuilders'

export { makeSalesTrend } from './productCatalogBuilders'

type MockSkuMetadata = Pick<
  ProductPrimarySummary,
  'skuGroupKey' | 'productName' | 'brand' | 'category' | 'code' | 'colorCode'
>

export const historicalMonths = SALES_MONTHS.filter((month) => month < '2026-01')

export const skuMetadataBySkuGroupKey: Record<string, MockSkuMetadata> = Object.fromEntries(
  allKnownSkuGroupKeys.map((skuGroupKey) => [skuGroupKey, buildSkuMetadata(skuGroupKey)]),
)

export const estimatePeriodWeight = (startDate?: string, endDate?: string) => {
  if (!startDate || !endDate) return 1
  const toMonthIndex = (date: string) => {
    const [y, m] = date.split('-').map(Number)
    return y * 12 + m
  }
  const from = toMonthIndex(startDate)
  const to = toMonthIndex(endDate)
  const span = clamp(Math.abs(to - from) + 1, 1, 24)
  return clamp(span / 12, 0.2, 1.8)
}

export const { primary: productPrimaryBySkuGroupKey, secondary: productSecondaryBySkuGroupKey } = (() => {
  const primary: Record<string, ProductPrimarySummary> = {}
  const secondary: Record<string, ProductSecondaryDetail> = {}
  for (const skuGroupKey of allKnownSkuGroupKeys) {
    const s = selfBySkuGroupKey[skuGroupKey]
    const c = competitorBySkuGroupKey[skuGroupKey]
    const seed = skuGroupKey.charCodeAt(0)
    const metadata = skuMetadataBySkuGroupKey[skuGroupKey]
    if (!metadata) throw new Error(`Missing mock SKU metadata: ${skuGroupKey}`)

    const price = s?.avgPrice ?? c?.selfAvgPrice ?? Math.round((c?.competitorAvgPrice ?? 120000) * 0.96)
    const productQty = s?.qty ?? c?.selfQty ?? Math.round((c?.competitorQty ?? 5000) * 0.85)
    const competitorPrice = c?.competitorAvgPrice ?? Math.round(price * 1.03)
    const competitorQty = c?.competitorQty ?? Math.max(0, Math.round(productQty * KREAM_TO_SELF_QTY_RATIO))
    const recommendedOrderQty = Math.round(productQty / 1.7)
    const availableStock = Math.round(productQty * 0.45)

    const fullMix = makeSizeMix(recommendedOrderQty, productQty, price, availableStock, seed, metadata.category)
    const { sizeMix, competitorRatioBySize } = splitPrimarySecondaryFromSizeMix(fullMix)

    primary[skuGroupKey] = {
      ...metadata,
      price,
      qty: productQty,
      availableStock,
      recommendedOrderQty,
      monthlySalesTrend: buildSalesTrend(Math.max(800, Math.round(productQty * 0.42)), seed, 8),
      seasonality: makeSeasonality(skuGroupKey),
      sizeMix,
    }
    secondary[skuGroupKey] = {
      skuGroupKey,
      competitorPrice,
      competitorQty,
      competitorRatioBySize,
    }
  }
  return { primary, secondary }
})()

export const stockTrendBySkuGroupKey: Record<string, Array<{
  date: string
  stock: number
  inboundExpected: number
  inboundQty: number
}>> = Object.fromEntries(Object.keys(productPrimaryBySkuGroupKey).map((skuGroupKey) => {
  const product = productPrimaryBySkuGroupKey[skuGroupKey]
  if (!product) throw new Error(`Missing product primary for stock trend: ${skuGroupKey}`)
  return [skuGroupKey, makeStockTrend(skuGroupKey, product)]
}))
