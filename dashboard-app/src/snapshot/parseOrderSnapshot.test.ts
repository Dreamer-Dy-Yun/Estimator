import { describe, expect, it } from 'vitest'
import { parseOrderSnapshot } from './parseOrderSnapshot'
import { validSnapshot } from './orderSnapshotTestFixtures'

describe('parseOrderSnapshot', () => {
  it('returns current snapshot when required fields are valid', () => {
    const parsed = parseOrderSnapshot(validSnapshot)
    expect(parsed).toEqual(validSnapshot)
    expect(parsed).not.toBe(validSnapshot)
  })

  it('preserves top-level companyUuid when it is a valid non-empty string', () => {
    const withCompanyUuid = {
      ...validSnapshot,
      companyUuid: 'company-uuid-001',
    }

    const parsed = parseOrderSnapshot(withCompanyUuid)

    expect(parsed.companyUuid).toBe('company-uuid-001')
    expect(parsed).toEqual(withCompanyUuid)
  })

  it('does not add top-level companyUuid when it is omitted', () => {
    const parsed = parseOrderSnapshot(validSnapshot)

    expect(parsed).not.toHaveProperty('companyUuid')
  })

  it('strips fields that are not part of the current v2 snapshot contract', () => {
    const withExtra = {
      ...validSnapshot,
      extraMeta: { source: 'test' },
      context: {
        ...validSnapshot.context,
        unknownContextField: true,
      },
      drawer1: {
        ...validSnapshot.drawer1,
        unknownDrawer1Field: true,
        summary: {
          ...validSnapshot.drawer1.summary,
          unknownSummaryField: true,
        },
      },
      drawer2: {
        ...validSnapshot.drawer2,
        unknownDrawer2Field: true,
        stockOrderRequest: {
          ...validSnapshot.drawer2.stockOrderRequest,
          unknownStockOrderRequestField: true,
        },
      },
    }
    const parsed = parseOrderSnapshot(withExtra)
    expect(parsed).toEqual(validSnapshot)
    expect(parsed).not.toHaveProperty('extraMeta')
    expect(parsed.context).not.toHaveProperty('unknownContextField')
    expect(parsed.drawer1).not.toHaveProperty('unknownDrawer1Field')
    expect(parsed.drawer1.summary).not.toHaveProperty('unknownSummaryField')
    expect(parsed.drawer2).not.toHaveProperty('unknownDrawer2Field')
    expect(parsed.drawer2.stockOrderRequest).toEqual(validSnapshot.drawer2.stockOrderRequest)
    expect(parsed.drawer2.stockOrderRequest).not.toHaveProperty('unknownStockOrderRequestField')
  })

  it('throws when snapshot body is missing', () => {
    expect(() => parseOrderSnapshot(null)).toThrow()
    expect(() => parseOrderSnapshot(undefined)).toThrow()
  })

  it('throws when snapshot body is non-object primitive', () => {
    expect(() => parseOrderSnapshot('text')).toThrow()
    expect(() => parseOrderSnapshot(123)).toThrow()
    expect(() => parseOrderSnapshot(true)).toThrow()
  })

  it('throws when snapshot body is empty object', () => {
    expect(() => parseOrderSnapshot({})).toThrow()
  })

  it('throws when schemaVersion does not match current version', () => {
    const wrongVersion = { ...validSnapshot, schemaVersion: 1 }
    expect(() => parseOrderSnapshot(wrongVersion)).toThrow()
  })

  it('throws when schemaVersion type is invalid', () => {
    const wrongTypeVersion = { ...validSnapshot, schemaVersion: '2' }
    expect(() => parseOrderSnapshot(wrongTypeVersion)).toThrow()
  })

  it('throws when drawer block is missing', () => {
    const withoutDrawer1 = { ...validSnapshot, drawer1: null }
    const withoutDrawer2 = { ...validSnapshot, drawer2: null }
    expect(() => parseOrderSnapshot(withoutDrawer1)).toThrow(/drawer/)
    expect(() => parseOrderSnapshot(withoutDrawer2)).toThrow(/drawer/)
  })

  it('throws when drawer block is undefined', () => {
    const withoutDrawer1 = { ...validSnapshot, drawer1: undefined }
    const withoutDrawer2 = { ...validSnapshot, drawer2: undefined }
    expect(() => parseOrderSnapshot(withoutDrawer1)).toThrow(/drawer/)
    expect(() => parseOrderSnapshot(withoutDrawer2)).toThrow(/drawer/)
  })

  it('throws when skuGroupKey is missing or empty', () => {
    const missingSkuGroupKey = { ...validSnapshot, skuGroupKey: null }
    const emptySkuGroupKey = { ...validSnapshot, skuGroupKey: '' }
    expect(() => parseOrderSnapshot(missingSkuGroupKey)).toThrow(/skuGroupKey/)
    expect(() => parseOrderSnapshot(emptySkuGroupKey)).toThrow(/skuGroupKey/)
  })

  it('throws when skuGroupKey is not a string', () => {
    const numericSkuGroupKey = { ...validSnapshot, skuGroupKey: 1234 }
    expect(() => parseOrderSnapshot(numericSkuGroupKey)).toThrow(/skuGroupKey/)
  })

  it('throws when top-level companyUuid is empty or not a string', () => {
    const emptyCompanyUuid = { ...validSnapshot, companyUuid: '' }
    const nullCompanyUuid = { ...validSnapshot, companyUuid: null }
    const numericCompanyUuid = { ...validSnapshot, companyUuid: 1234 }

    expect(() => parseOrderSnapshot(emptyCompanyUuid)).toThrow(/companyUuid/)
    expect(() => parseOrderSnapshot(nullCompanyUuid)).toThrow(/companyUuid/)
    expect(() => parseOrderSnapshot(numericCompanyUuid)).toThrow(/companyUuid/)
  })
})
