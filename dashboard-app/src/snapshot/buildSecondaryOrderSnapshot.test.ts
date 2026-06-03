import type { OrderSnapshotDocumentV2 } from '../api/types'
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
    secondary: secondaryDetailFixture as BuildSnapshotParams['secondary'],
    periodStart: validSnapshot.context.periodStart,
    periodEnd: validSnapshot.context.periodEnd,
    forecastMonths: validSnapshot.context.forecastMonths,
    selectedStart: validSnapshot.context.dailyTrendStartMonth,
    leadTimeDays: validSnapshot.context.dailyTrendLeadTimeDays,
    competitorChannelId: validSnapshot.drawer2.competitorChannelId,
    competitorChannelLabel: validSnapshot.drawer2.competitorChannelLabel,
    stockOrderRequest: validSnapshot.drawer2.stockOrderRequest,
    stockOrderResult: null,
    selfWeightPct: validSnapshot.drawer2.selfWeightPct,
    bufferStock: validSnapshot.drawer2.bufferStock,
    aiComment: validSnapshot.drawer2.aiComment,
    unitPrice: validSnapshot.drawer2.unitEconomics.unitPrice,
    unitCost: validSnapshot.drawer2.unitEconomics.unitCost,
    expectedFeeRatePct: validSnapshot.drawer2.unitEconomics.expectedFeeRatePct,
    sizeRows: validSnapshot.drawer2.sizeOrders.map((row: { readonly size: '250'; readonly selfSharePct: 40; readonly competitorSharePct: 60; readonly blendedSharePct: 50; readonly forecastQty: 10; readonly recommendedQty: 12; readonly confirmQty: 12; }) : { size: '250'; selfSharePct: 40; competitorSharePct: 60; blendedSharePct: 50; forecastQty: 10; recommendedQty: 12; confirmQty: 12; } => ({ ...row })),
    ...overrides,
  }
}

describe('buildSecondaryOrderSnapshot', () : void => {
  it('emits only current snapshot fields from the secondary snapshot builder', () : void => {
    const snapshot: OrderSnapshotDocumentV2 = buildSecondaryOrderSnapshot(createBuildParams({
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
    expect(sortedKeys(snapshot.drawer2)).toEqual(currentDrawer2Keys.filter((key: string) : boolean => key !== 'stockOrderResult'))
    expect(sortedKeys(snapshot.drawer2.stockOrderRequest)).toEqual(currentStockOrderRequestKeys)
    expect(snapshot.drawer2).not.toHaveProperty('stockOrderResult')
  })

  it('emits top-level companyUuid from the secondary snapshot builder when provided', () : void => {
    const snapshot: OrderSnapshotDocumentV2 = buildSecondaryOrderSnapshot(createBuildParams({
      companyUuid: 'company-uuid-001',
    }))

    expect(snapshot.companyUuid).toBe('company-uuid-001')
  })

  it('throws instead of converting empty companyUuid to an unscoped snapshot', () : void => {
    expect(() : OrderSnapshotDocumentV2 => buildSecondaryOrderSnapshot(createBuildParams({
      companyUuid: '',
    }))).toThrow(/companyUuid/)
  })

  it('builds confirmedTotals from current sizeOrders confirmQty', () : void => {
    const snapshot: OrderSnapshotDocumentV2 = buildSecondaryOrderSnapshot(createBuildParams({
      sizeRows: validSnapshot.drawer2.sizeOrders.map((row: { readonly size: '250'; readonly selfSharePct: 40; readonly competitorSharePct: 60; readonly blendedSharePct: 50; readonly forecastQty: 10; readonly recommendedQty: 12; readonly confirmQty: 12; }) : { confirmQty: number; size: '250'; selfSharePct: 40; competitorSharePct: 60; blendedSharePct: 50; forecastQty: 10; recommendedQty: 12; } => ({ ...row, confirmQty: 1.5 })),
    }))

    expect(snapshot.drawer2.confirmedTotals?.orderQty).toBe(1.5)
    expect(snapshot.drawer2.sizeOrders[0].confirmQty).toBe(1.5)
  })
})

describe('buildMockOrderSnapshotForCandidate', () : void => {
  it('emits only current snapshot fields from the candidate mock snapshot builder', () : void => {
    const secondaryLookup: Record<string, unknown> = productSecondaryBySkuGroupKey as Record<string, unknown>
    const skuGroupKey: string | undefined = Object.keys(productPrimaryBySkuGroupKey).find(
      (key: string) : boolean => secondaryLookup[key] != null,
    )
    if (!skuGroupKey) throw new Error('No shared mock product key found')

    const snapshot: OrderSnapshotDocumentV2 = buildMockOrderSnapshotForCandidate(skuGroupKey)

    expect(sortedKeys(snapshot.drawer1.summary)).toEqual(currentPrimarySummaryKeys)
    expect(sortedKeys(snapshot.drawer2)).toEqual(currentCandidateMockDrawer2Keys)
    expect(sortedKeys(snapshot.drawer2.stockOrderRequest)).toEqual(
      currentStockOrderRequestKeys.filter((key: string) : boolean => key !== 'dailyMeanOverride'),
    )
  })

  it('emits top-level companyUuid from the candidate mock snapshot builder when provided', () : void => {
    const secondaryLookup: Record<string, unknown> = productSecondaryBySkuGroupKey as Record<string, unknown>
    const skuGroupKey: string | undefined = Object.keys(productPrimaryBySkuGroupKey).find(
      (key: string) : boolean => secondaryLookup[key] != null,
    )
    if (!skuGroupKey) throw new Error('No shared mock product key found')

    const snapshot: OrderSnapshotDocumentV2 = buildMockOrderSnapshotForCandidate(skuGroupKey, {
      companyUuid: 'company-uuid-001',
    })

    expect(snapshot.companyUuid).toBe('company-uuid-001')
  })
})
