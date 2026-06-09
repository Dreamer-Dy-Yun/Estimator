import type { OrderSnapshotDocument } from './orderSnapshotTypes'
import { describe, expect, it } from 'vitest'
import { parseOrderSnapshot } from './parseOrderSnapshot'
import { validSnapshot } from './orderSnapshotTestFixtures'

function cloneValidSnapshot(): OrderSnapshotDocument {
  return JSON.parse(JSON.stringify(validSnapshot)) as OrderSnapshotDocument
}

function expectInvalidSnapshot(snapshot: unknown, message: RegExp): void {
  expect(() : OrderSnapshotDocument => parseOrderSnapshot(snapshot)).toThrow(message)
}

describe('parseOrderSnapshot v3 validation', () : void => {
  it('validates base subject role, kind, and sourceId', () : void => {
    const wrongRole: OrderSnapshotDocument = cloneValidSnapshot()
    const wrongKind: OrderSnapshotDocument = cloneValidSnapshot()
    const emptySource: OrderSnapshotDocument = cloneValidSnapshot()

    ;(wrongRole.drawer2.baseSubject as unknown as Record<string, unknown>).role = 'comparison'
    ;(wrongKind.drawer2.baseSubject as unknown as Record<string, unknown>).kind = 'competitor-channel'
    ;(emptySource.drawer2.baseSubject as unknown as Record<string, unknown>).sourceId = ''

    expectInvalidSnapshot(wrongRole, /baseSubject\.role/)
    expectInvalidSnapshot(wrongKind, /baseSubject\.kind/)
    expectInvalidSnapshot(emptySource, /baseSubject\.sourceId/)
  })

  it('validates comparison subject role, kind, id, label, and sourceId requirement', () : void => {
    const wrongRole: OrderSnapshotDocument = cloneValidSnapshot()
    const wrongKind: OrderSnapshotDocument = cloneValidSnapshot()
    const missingId: OrderSnapshotDocument = cloneValidSnapshot()
    const missingLabel: OrderSnapshotDocument = cloneValidSnapshot()
    const missingSource: OrderSnapshotDocument = cloneValidSnapshot()

    ;(wrongRole.drawer2.comparisonSubject as unknown as Record<string, unknown>).role = 'base'
    ;(wrongKind.drawer2.comparisonSubject as unknown as Record<string, unknown>).kind = 'unknown'
    ;(missingId.drawer2.comparisonSubject as unknown as Record<string, unknown>).id = ''
    ;(missingLabel.drawer2.comparisonSubject as unknown as Record<string, unknown>).label = ''
    ;(missingSource.drawer2.comparisonSubject as unknown as Record<string, unknown>).sourceId = undefined

    expectInvalidSnapshot(wrongRole, /comparisonSubject\.role/)
    expectInvalidSnapshot(wrongKind, /comparisonSubject\.kind/)
    expectInvalidSnapshot(missingId, /comparisonSubject\.id/)
    expectInvalidSnapshot(missingLabel, /comparisonSubject\.label/)
    expectInvalidSnapshot(missingSource, /comparisonSubject\.sourceId/)
  })

  it('allows self-company comparison subject without sourceId', () : void => {
    const snapshot: OrderSnapshotDocument = cloneValidSnapshot()
    snapshot.drawer2.comparisonSubject = {
      role: 'comparison',
      kind: 'self-company',
      id: 'comparison:self-company:all',
      label: '자사 전체',
    }

    const parsed: OrderSnapshotDocument = parseOrderSnapshot(snapshot)

    expect(parsed.drawer2.comparisonSubject).toEqual(snapshot.drawer2.comparisonSubject)
  })

  it('validates comparison basis numeric fields and ratio range', () : void => {
    const badPrice: OrderSnapshotDocument = cloneValidSnapshot()
    const badQty: OrderSnapshotDocument = cloneValidSnapshot()
    const badRatio: OrderSnapshotDocument = cloneValidSnapshot()

    ;(badPrice.drawer2.comparisonBasis as unknown as Record<string, unknown>).comparisonPrice = Number.NaN
    ;(badQty.drawer2.comparisonBasis as unknown as Record<string, unknown>).comparisonQty = '32'
    badRatio.drawer2.comparisonBasis.comparisonRatioBySize['250'] = 1.1

    expectInvalidSnapshot(badPrice, /comparisonPrice/)
    expectInvalidSnapshot(badQty, /comparisonQty/)
    expectInvalidSnapshot(badRatio, /comparisonRatioBySize/)
  })

  it('validates size orders and confirmed totals consistency', () : void => {
    const duplicateSize: OrderSnapshotDocument = cloneValidSnapshot()
    const badShare: OrderSnapshotDocument = cloneValidSnapshot()
    const mismatchedTotals: OrderSnapshotDocument = cloneValidSnapshot()

    duplicateSize.drawer2.sizeOrders.push({ ...duplicateSize.drawer2.sizeOrders[0] })
    badShare.drawer2.sizeOrders[0].baseSharePct = 101
    mismatchedTotals.drawer2.confirmedTotals.orderQty += 1

    expectInvalidSnapshot(duplicateSize, /duplicate size/)
    expectInvalidSnapshot(badShare, /baseSharePct/)
    expectInvalidSnapshot(mismatchedTotals, /confirmedTotals\.orderQty/)
  })

  it('validates stock order result display rows against size orders', () : void => {
    const missingDisplaySize: OrderSnapshotDocument = cloneValidSnapshot()
    const duplicateDisplaySize: OrderSnapshotDocument = cloneValidSnapshot()
    const forecastSafetyStock: OrderSnapshotDocument = cloneValidSnapshot()

    missingDisplaySize.drawer2.stockOrderResult!.display.sizeRows[0].size = '999'
    duplicateDisplaySize.drawer2.stockOrderResult!.display.sizeRows.push({
      ...duplicateDisplaySize.drawer2.stockOrderResult!.display.sizeRows[0],
    })
    forecastSafetyStock.drawer2.stockOrderResult!.forecastQtyCalc.safetyStock = 1 as unknown as null

    expectInvalidSnapshot(missingDisplaySize, /display\.sizeRows/)
    expectInvalidSnapshot(duplicateDisplaySize, /duplicate size/)
    expectInvalidSnapshot(forecastSafetyStock, /forecastQtyCalc\.safetyStock/)
  })

  it('validates unit economics and ai comment shapes', () : void => {
    const badFeeRate: OrderSnapshotDocument = cloneValidSnapshot()
    const badGeneratedAt: OrderSnapshotDocument = cloneValidSnapshot()

    badFeeRate.drawer2.unitEconomics!.expectedFeeRatePct = 101
    ;(badGeneratedAt.drawer2.aiComment as unknown as Record<string, unknown>).generatedAt = 123

    expectInvalidSnapshot(badFeeRate, /expectedFeeRatePct/)
    expectInvalidSnapshot(badGeneratedAt, /generatedAt/)
  })
})
