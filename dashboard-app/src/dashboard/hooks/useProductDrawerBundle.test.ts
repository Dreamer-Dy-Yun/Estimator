import { describe, expect, it } from 'vitest'
import {
  pickProductDrawerBundleFromCache,
  type ProductDrawerBundleCache,
  type ProductDrawerBundleFailedRequestState,
} from './useProductDrawerBundle'
import type { ProductComparisonBaseSubjectRef } from '../../api'

const BASE_SUBJECT: ProductComparisonBaseSubjectRef = { role: 'base', kind: 'self-company', sourceId: 'company-1' }
const OTHER_BASE_SUBJECT: ProductComparisonBaseSubjectRef = { role: 'base', kind: 'self-company', sourceId: 'company-2' }
const BASE_SUBJECT_KEY = 'base:self-company:company-1' as const

const bundleA: { summary: { skuGroupKey: string; productName: string; brand: string; category: string; code: string; colorCode: string; imageUrl: string | null; price: number; qty: number; availableStock: number; }; } = {
  summary: {
    skuGroupKey: 'A__010',
    productName: 'A',
    brand: 'x',
    category: 'c',
    code: 'A',
    colorCode: '010',
    imageUrl: null,
    price: 100,
    qty: 10,
    availableStock: 5,




  },
}

describe('pickProductDrawerBundleFromCache', () : void => {
  it('returns null when selected id is null', () : void => {
    const cache: ProductDrawerBundleCache = { skuGroupKey: 'A__010', baseSubjectKey: BASE_SUBJECT_KEY, bundle: bundleA }
    expect(pickProductDrawerBundleFromCache(null, cache, true, BASE_SUBJECT)).toBeNull()
  })

  it('returns null when cache is empty', () : void => {
    expect(pickProductDrawerBundleFromCache('A__010', null, true, BASE_SUBJECT)).toBeNull()
  })

  it('returns stale bundle when stale is allowed and id mismatches', () : void => {
    const cache: ProductDrawerBundleCache = { skuGroupKey: 'A__010', baseSubjectKey: BASE_SUBJECT_KEY, bundle: bundleA }
    expect(pickProductDrawerBundleFromCache('B__010', cache, true, BASE_SUBJECT)).toBe(bundleA)
  })

  it('returns null when stale is not allowed and id mismatches', () : void => {
    const cache: ProductDrawerBundleCache = { skuGroupKey: 'A__010', baseSubjectKey: BASE_SUBJECT_KEY, bundle: bundleA }
    expect(pickProductDrawerBundleFromCache('B__010', cache, false, BASE_SUBJECT)).toBeNull()
  })

  it('returns null for previous sku cache after selected sku request fails', () : void => {
    const cache: ProductDrawerBundleCache = { skuGroupKey: 'A__010', baseSubjectKey: BASE_SUBJECT_KEY, bundle: bundleA }
    const failedRequestState: ProductDrawerBundleFailedRequestState = { skuGroupKey: 'B__010', baseSubjectKey: BASE_SUBJECT_KEY }
    expect(pickProductDrawerBundleFromCache('B__010', cache, true, BASE_SUBJECT, failedRequestState)).toBeNull()
  })

  it('returns cache bundle when ids match regardless of stale option', () : void => {
    const cache: ProductDrawerBundleCache = { skuGroupKey: 'A__010', baseSubjectKey: BASE_SUBJECT_KEY, bundle: bundleA }
    expect(pickProductDrawerBundleFromCache('A__010', cache, true, BASE_SUBJECT)).toBe(bundleA)
    expect(pickProductDrawerBundleFromCache('A__010', cache, false, BASE_SUBJECT)).toBe(bundleA)
  })

  it('returns null when base subject mismatches', () : void => {
    const cache: ProductDrawerBundleCache = { skuGroupKey: 'A__010', baseSubjectKey: BASE_SUBJECT_KEY, bundle: bundleA }
    expect(pickProductDrawerBundleFromCache('A__010', cache, true, OTHER_BASE_SUBJECT)).toBeNull()
  })
})
