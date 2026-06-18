import type { OrderSnapshotDocument } from './orderSnapshotTypes'
import { ORDER_SNAPSHOT_SCHEMA_VERSION } from './orderSnapshotTypes'
import { describe, expect, it } from 'vitest'
import { parseOrderSnapshot } from './parseOrderSnapshot'
import { validSnapshot } from './orderSnapshotTestFixtures'

function cloneValidSnapshot(): OrderSnapshotDocument {
  return JSON.parse(JSON.stringify(validSnapshot)) as OrderSnapshotDocument
}

describe('parseOrderSnapshot', () : void => {
  it('returns current snapshot when required fields are valid', () : void => {
    const parsed: OrderSnapshotDocument = parseOrderSnapshot(validSnapshot)

    expect(parsed).toEqual(validSnapshot)
    expect(parsed).not.toBe(validSnapshot)
  })

  it('does not preserve removed top-level companyUuid', () : void => {
    const withCompanyUuid: Record<string, unknown> = {
      ...cloneValidSnapshot(),
      companyUuid: 'company-uuid-001',
    }

    const parsed: OrderSnapshotDocument = parseOrderSnapshot(withCompanyUuid)

    expect(parsed).not.toHaveProperty('companyUuid')
    expect(parsed.drawer2.baseSubject.sourceId).toBe('company-uuid-001')
  })

  it('strips fields that are not part of the current snapshot contract', () : void => {
    const source: OrderSnapshotDocument = cloneValidSnapshot()
    const withExtra: Record<string, unknown> = {
      ...source,
      extraMeta: { source: 'test' },
      context: {
        ...source.context,
        unknownContextField: true,
      },
      drawer1: {
        ...source.drawer1,
        unknownDrawer1Field: true,
        summary: {
          ...source.drawer1.summary,
          unknownSummaryField: true,
        },
      },
      drawer2: {
        ...source.drawer2,
        unknownDrawer2Field: true,
        stockOrderRequest: {
          ...source.drawer2.stockOrderRequest,
          unknownStockOrderRequestField: true,
        },
      },
    }

    const parsed: OrderSnapshotDocument = parseOrderSnapshot(withExtra)

    expect(parsed).toEqual(validSnapshot)
    expect(parsed).not.toHaveProperty('extraMeta')
    expect(parsed.context).not.toHaveProperty('unknownContextField')
    expect(parsed.drawer1).not.toHaveProperty('unknownDrawer1Field')
    expect(parsed.drawer1.summary).not.toHaveProperty('unknownSummaryField')
    expect(parsed.drawer2).not.toHaveProperty('unknownDrawer2Field')
    expect(parsed.drawer2.stockOrderRequest).not.toHaveProperty('unknownStockOrderRequestField')
  })

  it('throws when snapshot body is not a valid object', () : void => {
    expect(() : OrderSnapshotDocument => parseOrderSnapshot(null)).toThrow()
    expect(() : OrderSnapshotDocument => parseOrderSnapshot(undefined)).toThrow()
    expect(() : OrderSnapshotDocument => parseOrderSnapshot('text')).toThrow()
    expect(() : OrderSnapshotDocument => parseOrderSnapshot(123)).toThrow()
    expect(() : OrderSnapshotDocument => parseOrderSnapshot(true)).toThrow()
    expect(() : OrderSnapshotDocument => parseOrderSnapshot({})).toThrow()
  })

  it('throws when schemaVersion is neither current nor migratable', () : void => {
    const wrongVersion: Record<string, unknown> = { ...cloneValidSnapshot(), schemaVersion: ORDER_SNAPSHOT_SCHEMA_VERSION + 1 }
    const wrongTypeVersion: Record<string, unknown> = { ...cloneValidSnapshot(), schemaVersion: String(ORDER_SNAPSHOT_SCHEMA_VERSION) }

    expect(() : OrderSnapshotDocument => parseOrderSnapshot(wrongVersion)).toThrow(/schemaVersion/)
    expect(() : OrderSnapshotDocument => parseOrderSnapshot(wrongTypeVersion)).toThrow(/schemaVersion/)
  })

  it('migrates v4 renamed coverage day fields into the current snapshot contract', () : void => {
    const legacyVersion: Record<string, unknown> = { ...cloneValidSnapshot() }
    const legacyContext: Record<string, unknown> = { ...(legacyVersion.context as Record<string, unknown>) }
    const legacyDrawer2: Record<string, unknown> = { ...(legacyVersion.drawer2 as Record<string, unknown>) }
    const legacyStockOrderRequest: Record<string, unknown> = { ...(legacyDrawer2.stockOrderRequest as Record<string, unknown>) }
    legacyVersion.schemaVersion = 4
    legacyContext.dailyTrendLeadTimeDays = legacyContext.dailyTrendForecastDays
    delete legacyContext.dailyTrendForecastDays
    legacyStockOrderRequest.leadTimeDays = legacyStockOrderRequest.orderCoverageDays
    delete legacyStockOrderRequest.orderCoverageDays
    legacyVersion.context = legacyContext
    legacyDrawer2.stockOrderRequest = legacyStockOrderRequest
    legacyVersion.drawer2 = legacyDrawer2

    const parsed: OrderSnapshotDocument = parseOrderSnapshot(legacyVersion)

    expect(parsed.schemaVersion).toBe(ORDER_SNAPSHOT_SCHEMA_VERSION)
    expect(parsed.context.dailyTrendForecastDays).toBe(validSnapshot.context.dailyTrendForecastDays)
    expect(parsed.drawer2.stockOrderRequest.orderCoverageDays).toBe(validSnapshot.drawer2.stockOrderRequest.orderCoverageDays)
    expect(parsed.context).not.toHaveProperty('dailyTrendLeadTimeDays')
    expect(parsed.drawer2.stockOrderRequest).not.toHaveProperty('leadTimeDays')
  })

  it('throws when drawer blocks are missing', () : void => {
    expect(() : OrderSnapshotDocument => parseOrderSnapshot({ ...cloneValidSnapshot(), drawer1: null })).toThrow(/drawer1/)
    expect(() : OrderSnapshotDocument => parseOrderSnapshot({ ...cloneValidSnapshot(), drawer2: null })).toThrow(/drawer2/)
    expect(() : OrderSnapshotDocument => parseOrderSnapshot({ ...cloneValidSnapshot(), drawer1: undefined })).toThrow(/drawer1/)
    expect(() : OrderSnapshotDocument => parseOrderSnapshot({ ...cloneValidSnapshot(), drawer2: undefined })).toThrow(/drawer2/)
  })

  it('throws when skuGroupKey does not match drawer contracts', () : void => {
    const mismatchPrimary: OrderSnapshotDocument = cloneValidSnapshot()
    mismatchPrimary.drawer1.summary.skuGroupKey = 'OTHER'
    const mismatchComparison: OrderSnapshotDocument = cloneValidSnapshot()
    mismatchComparison.drawer2.comparisonBasis.skuGroupKey = 'OTHER'

    expect(() : OrderSnapshotDocument => parseOrderSnapshot(mismatchPrimary)).toThrow(/skuGroupKey/)
    expect(() : OrderSnapshotDocument => parseOrderSnapshot(mismatchComparison)).toThrow(/skuGroupKey/)
  })

  it('throws when context forecast days and request coverage days diverge', () : void => {
    const mismatch: OrderSnapshotDocument = cloneValidSnapshot()
    mismatch.context.dailyTrendForecastDays = mismatch.drawer2.stockOrderRequest.orderCoverageDays + 1

    expect(() : OrderSnapshotDocument => parseOrderSnapshot(mismatch)).toThrow(/dailyTrendForecastDays/)
  })

  it('throws when current schema stock-order identity fields are missing', () : void => {
    const missingProductIdentity: Record<string, unknown> = cloneValidSnapshot()
    const missingSupply: Record<string, unknown> = cloneValidSnapshot()
    delete (((missingProductIdentity['drawer2'] as Record<string, unknown>)['stockOrderResult'] as Record<string, unknown>)['productIdentity'])
    delete (((missingSupply['drawer2'] as Record<string, unknown>)['stockOrderResult'] as Record<string, unknown>)['existingOrderInboundSupplyBySize'])

    expect((): OrderSnapshotDocument => parseOrderSnapshot(missingProductIdentity)).toThrow(/productIdentity/)
    expect((): OrderSnapshotDocument => parseOrderSnapshot(missingSupply)).toThrow(/existingOrderInboundSupplyBySize/)
  })
})
