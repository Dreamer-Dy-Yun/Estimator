import { productPrimaryBySkuGroupKey, productSecondaryBySkuGroupKey, stockTrendBySkuGroupKey } from './productCatalog'

export function requireMockProductPrimary(skuGroupKey: string) {
  const primary = productPrimaryBySkuGroupKey[skuGroupKey]
  if (!primary) throw new Error(`Unknown mock product primary: ${skuGroupKey}`)
  return primary
}

export function requireMockProductSecondary(skuGroupKey: string) {
  const secondary = productSecondaryBySkuGroupKey[skuGroupKey]
  if (!secondary) throw new Error(`Unknown mock product secondary: ${skuGroupKey}`)
  return secondary
}

export function requireMockStockTrend(skuGroupKey: string) {
  const stockTrend = stockTrendBySkuGroupKey[skuGroupKey]
  if (!stockTrend) throw new Error(`Unknown mock stock trend: ${skuGroupKey}`)
  return stockTrend
}
