import type { OrderSnapshotDocument } from '../api/types'
import { describe, expect, it } from 'vitest'
import { buildMockOrderSnapshotForCandidate } from '../api/mock/orderSnapshotForCandidate'
import { productPrimaryBySkuGroupKey, productSecondaryBySkuGroupKey } from '../api/mock/productCatalog'
import { buildSecondaryOrderSnapshot } from '../dashboard/components/product-drawer/secondary/secondarySnapshot'
import {
  currentCandidateMockDrawer2Keys,
  currentDrawer2Keys,
  currentPrimarySummaryKeys,
  currentStockOrderRequestKeys,
  secondaryDetailFixture,
  sortedKeys,
  validSnapshot,
} from './orderSnapshotTestFixtures'

export type BuildSnapshotParams = Parameters<typeof buildSecondaryOrderSnapshot>[0]

function createBuildParams(overrides: Partial<BuildSnapshotParams> = {}): BuildSnapshotParams {
  return {
    primary: validSnapshot.drawer1.summary as BuildSnapshotParams['primary'],
    monthlySalesTrend: validSnapshot.drawer1.monthlySalesTrend,
    secondary: secondaryDetailFixture as BuildSnapshotParams['secondary'],
    periodStart: validSnapshot.context.periodStart,
    periodEnd: validSnapshot.context.periodEnd,
    forecastMonths: validSnapshot.context.forecastMonths,
    selectedStart: validSnapshot.context.dailyTrendStartMonth,
    orderCoverageDays: validSnapshot.context.dailyTrendForecastDays,
    baseSubject: validSnapshot.drawer2.baseSubject,
    comparisonSubject: validSnapshot.drawer2.comparisonSubject,
    stockOrderRequest: validSnapshot.drawer2.stockOrderRequest,
    stockOrderResult: validSnapshot.drawer2.stockOrderResult,
    selfWeightPct: validSnapshot.drawer2.selfWeightPct,
    bufferStock: validSnapshot.drawer2.bufferStock,
    aiComment: validSnapshot.drawer2.aiComment,
    unitPrice: validSnapshot.drawer2.unitEconomics.unitPrice,
    unitCost: validSnapshot.drawer2.unitEconomics.unitCost,
    expectedFeeRatePct: validSnapshot.drawer2.unitEconomics.expectedFeeRatePct,
    sizeRows: validSnapshot.drawer2.sizeOrders.map((row) : BuildSnapshotParams['sizeRows'][number] => ({
      ...row,
      confirmQty: validSnapshot.drawer2.confirmed.rounds[0]?.qtyBySize[row.size] ?? 0,
    })),
    confirmedRounds: validSnapshot.drawer2.confirmed.rounds,
    ...overrides,
  }
}

describe('buildSecondaryOrderSnapshot', () : void => {
  it('emits only current snapshot fields from the secondary snapshot builder', () : void => {
    const snapshot: OrderSnapshotDocument = buildSecondaryOrderSnapshot(createBuildParams({
      primary: {
        ...validSnapshot.drawer1.summary,
        unknownPrimaryField: 'drop',
      } as BuildSnapshotParams['primary'],
      secondary: {
        ...secondaryDetailFixture,
        unknownSecondaryField: 'drop',
      } as BuildSnapshotParams['secondary'],
      stockOrderRequest: {
        ...validSnapshot.drawer2.stockOrderRequest,
        unknownStockOrderRequestField: 'drop',
      } as BuildSnapshotParams['stockOrderRequest'],
    }))

    expect(sortedKeys(snapshot.drawer1.summary)).toEqual(currentPrimarySummaryKeys)
    expect(snapshot.drawer1.monthlySalesTrend).toEqual(validSnapshot.drawer1.monthlySalesTrend)
    expect(sortedKeys(snapshot.drawer2)).toEqual(currentDrawer2Keys)
    expect(sortedKeys(snapshot.drawer2.stockOrderRequest)).toEqual(currentStockOrderRequestKeys)
    expect(snapshot.drawer2.stockOrderResult).toEqual(validSnapshot.drawer2.stockOrderResult)
  })

  it('stores comparison subjects without top-level companyUuid', () : void => {
    const snapshot: OrderSnapshotDocument = buildSecondaryOrderSnapshot(createBuildParams())

    expect(snapshot).not.toHaveProperty('companyUuid')
    expect(snapshot.drawer2.baseSubject).toEqual(validSnapshot.drawer2.baseSubject)
    expect(snapshot.drawer2.comparisonSubject).toEqual(validSnapshot.drawer2.comparisonSubject)
  })

  it('throws when competitor comparison subject has no sourceId', () : void => {
    expect(() : OrderSnapshotDocument => buildSecondaryOrderSnapshot(createBuildParams({
      comparisonSubject: {
        role: 'comparison',
        kind: 'competitor-channel',
        id: 'comparison:competitor-channel:missing',
        label: 'Missing',
      } as unknown as BuildSnapshotParams['comparisonSubject'],
    }))).toThrow(/comparisonSubject.sourceId/)
  })

  it('stores confirmed quantities in confirmed rounds, not sizeOrders', () : void => {
    const snapshot: OrderSnapshotDocument = buildSecondaryOrderSnapshot(createBuildParams({
      sizeRows: validSnapshot.drawer2.sizeOrders.map((row) : BuildSnapshotParams['sizeRows'][number] => ({ ...row, confirmQty: 1.5 })),
      confirmedRounds: [],
    }))

    expect(snapshot.drawer2.confirmed.rounds[0]?.qtyBySize['250']).toBe(1.5)
    expect(snapshot.drawer2.sizeOrders[0]).not.toHaveProperty('confirmQty')
  })
})

describe('buildMockOrderSnapshotForCandidate', () : void => {
  it('emits only current snapshot fields from the candidate mock snapshot builder', () : void => {
    const secondaryLookup: Record<string, unknown> = productSecondaryBySkuGroupKey as Record<string, unknown>
    const skuGroupKey: string | undefined = Object.keys(productPrimaryBySkuGroupKey).find(
      (key: string) : boolean => secondaryLookup[key] != null,
    )
    if (!skuGroupKey) throw new Error('No shared mock product key found')

    const snapshot: OrderSnapshotDocument = buildMockOrderSnapshotForCandidate(skuGroupKey)

    expect(sortedKeys(snapshot.drawer1.summary)).toEqual(currentPrimarySummaryKeys)
    expect(sortedKeys(snapshot.drawer2)).toEqual(currentCandidateMockDrawer2Keys)
    expect(sortedKeys(snapshot.drawer2.stockOrderRequest)).toEqual(
      currentStockOrderRequestKeys.filter((key: string) : boolean => key !== 'dailyMeanOverride'),
    )
  })

  it('stores company scope as baseSubject sourceId from the candidate mock snapshot builder when provided', () : void => {
    const secondaryLookup: Record<string, unknown> = productSecondaryBySkuGroupKey as Record<string, unknown>
    const skuGroupKey: string | undefined = Object.keys(productPrimaryBySkuGroupKey).find(
      (key: string) : boolean => secondaryLookup[key] != null,
    )
    if (!skuGroupKey) throw new Error('No shared mock product key found')

    const snapshot: OrderSnapshotDocument = buildMockOrderSnapshotForCandidate(skuGroupKey, {
      companyUuid: 'company-uuid-001',
    })

    expect(snapshot).not.toHaveProperty('companyUuid')
    expect(snapshot.drawer2.baseSubject.sourceId).toBe('company-uuid-001')
  })
})
