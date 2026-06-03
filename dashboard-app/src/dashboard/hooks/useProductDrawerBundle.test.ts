import { describe, expect, it } from 'vitest'
import {
  pickProductDrawerBundleFromCache,
  type ProductDrawerBundleCache,
} from './useProductDrawerBundle'

const bundleA: { summary: { skuGroupKey: string; productName: string; brand: string; category: string; code: string; colorCode: string; price: number; qty: number; availableStock: number; }; } = {
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




  },
}

describe('pickProductDrawerBundleFromCache', () : void => {
  it('returns null when selected id is null', () : void => {
    const cache: ProductDrawerBundleCache = { skuGroupKey: 'A__010', bundle: bundleA }
    expect(pickProductDrawerBundleFromCache(null, cache, true)).toBeNull()
  })

  it('returns null when cache is empty', () : void => {
    expect(pickProductDrawerBundleFromCache('A__010', null, true)).toBeNull()
  })

  it('returns stale bundle when stale is allowed and id mismatches', () : void => {
    const cache: ProductDrawerBundleCache = { skuGroupKey: 'A__010', bundle: bundleA }
    expect(pickProductDrawerBundleFromCache('B__010', cache, true)).toBe(bundleA)
  })

  it('returns null when stale is not allowed and id mismatches', () : void => {
    const cache: ProductDrawerBundleCache = { skuGroupKey: 'A__010', bundle: bundleA }
    expect(pickProductDrawerBundleFromCache('B__010', cache, false)).toBeNull()
  })

  it('returns cache bundle when ids match regardless of stale option', () : void => {
    const cache: ProductDrawerBundleCache = { skuGroupKey: 'A__010', bundle: bundleA }
    expect(pickProductDrawerBundleFromCache('A__010', cache, true)).toBe(bundleA)
    expect(pickProductDrawerBundleFromCache('A__010', cache, false)).toBe(bundleA)
  })
})
