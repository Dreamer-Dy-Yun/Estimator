import { describe, expect, it } from 'vitest'
import {
  pickProductDrawerBundleFromCache,
  type ProductDrawerBundleCache,
} from './useProductDrawerBundle'

const bundleA = {
  summary: {
    id: 'A',
    name: 'A',
    brand: 'x',
    category: 'c',
    productCode: 'A',
    price: 100,
    qty: 10,
    availableStock: 5,
    recommendedOrderQty: 3,
    monthlySalesTrend: [],
    seasonality: [],
    sizeMix: [],
  },
  stockTrend: [],
}

describe('pickProductDrawerBundleFromCache', () => {
  it('returns null when selected id is null', () => {
    const cache: ProductDrawerBundleCache = { id: 'A', bundle: bundleA }
    expect(pickProductDrawerBundleFromCache(null, cache, true)).toBeNull()
  })

  it('returns null when cache is empty', () => {
    expect(pickProductDrawerBundleFromCache('A', null, true)).toBeNull()
  })

  it('returns stale bundle when stale is allowed and id mismatches', () => {
    const cache: ProductDrawerBundleCache = { id: 'A', bundle: bundleA }
    expect(pickProductDrawerBundleFromCache('B', cache, true)).toBe(bundleA)
  })

  it('returns null when stale is not allowed and id mismatches', () => {
    const cache: ProductDrawerBundleCache = { id: 'A', bundle: bundleA }
    expect(pickProductDrawerBundleFromCache('B', cache, false)).toBeNull()
  })

  it('returns cache bundle when ids match regardless of stale option', () => {
    const cache: ProductDrawerBundleCache = { id: 'A', bundle: bundleA }
    expect(pickProductDrawerBundleFromCache('A', cache, true)).toBe(bundleA)
    expect(pickProductDrawerBundleFromCache('A', cache, false)).toBe(bundleA)
  })
})
