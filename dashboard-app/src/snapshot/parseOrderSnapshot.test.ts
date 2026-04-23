import { describe, expect, it } from 'vitest'
import { ORDER_SNAPSHOT_SCHEMA_VERSION } from './orderSnapshotTypes'
import { parseOrderSnapshot } from './parseOrderSnapshot'

const validSnapshot = {
  schemaVersion: ORDER_SNAPSHOT_SCHEMA_VERSION,
  productId: 'B',
  savedAt: '2026-04-23T00:00:00.000Z',
  context: {
    periodStart: '2026-01-01',
    periodEnd: '2026-01-31',
    forecastMonths: 8,
    dailyTrendStartMonth: '2026-01',
    dailyTrendLeadTimeDays: 30,
  },
  drawer1: { summary: {} },
  drawer2: {},
} as const

describe('parseOrderSnapshot', () => {
  it('returns snapshot when required fields are valid', () => {
    const parsed = parseOrderSnapshot(validSnapshot as never)
    expect(parsed).toBe(validSnapshot)
  })

  it('allows additional fields while preserving original object reference', () => {
    const withExtra = { ...validSnapshot, extraMeta: { source: 'test' } }
    const parsed = parseOrderSnapshot(withExtra as never)
    expect(parsed).toBe(withExtra)
  })

  it('throws when snapshot body is missing', () => {
    expect(() => parseOrderSnapshot(null)).toThrow()
    expect(() => parseOrderSnapshot(undefined)).toThrow()
  })

  it('throws when snapshot body is non-object primitive', () => {
    expect(() => parseOrderSnapshot('text' as never)).toThrow()
    expect(() => parseOrderSnapshot(123 as never)).toThrow()
    expect(() => parseOrderSnapshot(true as never)).toThrow()
  })

  it('throws when snapshot body is empty object', () => {
    expect(() => parseOrderSnapshot({} as never)).toThrow()
  })

  it('throws when schemaVersion does not match current version', () => {
    const wrongVersion = { ...validSnapshot, schemaVersion: 1 }
    expect(() => parseOrderSnapshot(wrongVersion as never)).toThrow()
  })

  it('throws when schemaVersion type is invalid', () => {
    const wrongTypeVersion = { ...validSnapshot, schemaVersion: '2' }
    expect(() => parseOrderSnapshot(wrongTypeVersion as never)).toThrow()
  })

  it('throws when drawer block is missing', () => {
    const withoutDrawer1 = { ...validSnapshot, drawer1: null }
    const withoutDrawer2 = { ...validSnapshot, drawer2: null }
    expect(() => parseOrderSnapshot(withoutDrawer1 as never)).toThrow(/drawer/)
    expect(() => parseOrderSnapshot(withoutDrawer2 as never)).toThrow(/drawer/)
  })

  it('throws when drawer block is undefined', () => {
    const withoutDrawer1 = { ...validSnapshot, drawer1: undefined }
    const withoutDrawer2 = { ...validSnapshot, drawer2: undefined }
    expect(() => parseOrderSnapshot(withoutDrawer1 as never)).toThrow(/drawer/)
    expect(() => parseOrderSnapshot(withoutDrawer2 as never)).toThrow(/drawer/)
  })

  it('throws when productId is missing or empty', () => {
    const missingProductId = { ...validSnapshot, productId: null }
    const emptyProductId = { ...validSnapshot, productId: '' }
    expect(() => parseOrderSnapshot(missingProductId as never)).toThrow(/productId/)
    expect(() => parseOrderSnapshot(emptyProductId as never)).toThrow(/productId/)
  })
  
  it('throws when productId is not a string', () => {
    const numericProductId = { ...validSnapshot, productId: 1234 }
    expect(() => parseOrderSnapshot(numericProductId as never)).toThrow(/productId/)
  })
})
