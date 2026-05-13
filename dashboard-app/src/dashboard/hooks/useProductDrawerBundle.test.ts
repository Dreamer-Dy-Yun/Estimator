import { describe, expect, it } from 'vitest'
import {
  pickProductDrawerBundleFromCache,
  type ProductDrawerBundleCache,
} from './useProductDrawerBundle'

const bundleA = {
  summary: {
    skuGroupKey: 'A__010',
    productName: 'A',
    brand: 'x',
    category: 'c',
    code: 'A',
    colorCode: '010',
    price: 100,
    qty: 10,
    availableStock: 5,
    recommendedOrderQty: 3,
    monthlySalesTrend: [],
    seasonality: [],
    sizeMix: [],
  },
}

describe('pickProductDrawerBundleFromCache', () => {
  it('returns null when selected id is null', () => {
    const cache: ProductDrawerBundleCache = { skuGroupKey: 'A__010', bundle: bundleA }
    expect(pickProductDrawerBundleFromCache(null, cache, true)).toBeNull()
  })

  it('returns null when cache is empty', () => {
    expect(pickProductDrawerBundleFromCache('A__010', null, true)).toBeNull()
  })

  it('returns stale bundle when stale is allowed and id mismatches', () => {
    const cache: ProductDrawerBundleCache = { skuGroupKey: 'A__010', bundle: bundleA }
    expect(pickProductDrawerBundleFromCache('B__010', cache, true)).toBe(bundleA)
  })

  it('returns null when stale is not allowed and id mismatches', () => {
    const cache: ProductDrawerBundleCache = { skuGroupKey: 'A__010', bundle: bundleA }
    expect(pickProductDrawerBundleFromCache('B__010', cache, false)).toBeNull()
  })

  it('returns cache bundle when ids match regardless of stale option', () => {
    const cache: ProductDrawerBundleCache = { skuGroupKey: 'A__010', bundle: bundleA }
    expect(pickProductDrawerBundleFromCache('A__010', cache, true)).toBe(bundleA)
    expect(pickProductDrawerBundleFromCache('A__010', cache, false)).toBe(bundleA)
  })
})
