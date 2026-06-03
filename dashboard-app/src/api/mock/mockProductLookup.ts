import type { ProductSecondaryDetail } from '..'
import type { ProductPrimarySummary } from '../types'
import { productPrimaryBySkuGroupKey, productSecondaryBySkuGroupKey, stockTrendBySkuGroupKey } from './productCatalog'

export function requireMockProductPrimary(skuGroupKey: string) : ProductPrimarySummary {
  const primary: ProductPrimarySummary = productPrimaryBySkuGroupKey[skuGroupKey]
  if (!primary) throw new Error(`Unknown mock product primary: ${skuGroupKey}`)
  return primary
}

export function requireMockProductSecondary(skuGroupKey: string) : ProductSecondaryDetail {
  const secondary: ProductSecondaryDetail = productSecondaryBySkuGroupKey[skuGroupKey]
  if (!secondary) throw new Error(`Unknown mock product secondary: ${skuGroupKey}`)
  return secondary
}

export function requireMockStockTrend(skuGroupKey: string) : { date: string; stock: number; inboundExpected: number; inboundQty: number; }[] {
  const stockTrend: { date: string; stock: number; inboundExpected: number; inboundQty: number; }[] = stockTrendBySkuGroupKey[skuGroupKey]
  if (!stockTrend) throw new Error(`Unknown mock stock trend: ${skuGroupKey}`)
  return stockTrend
}
