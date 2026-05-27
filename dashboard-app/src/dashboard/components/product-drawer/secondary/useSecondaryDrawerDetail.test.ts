import { describe, expect, it } from 'vitest'
import type { OrderSnapshotDocumentV2 } from '../../../../snapshot/orderSnapshotTypes'
import { ORDER_SNAPSHOT_SCHEMA_VERSION } from '../../../../snapshot/orderSnapshotTypes'
import { getScopeSafeHydrateSnapshot } from './useSecondaryDrawerDetail'

const snapshot: OrderSnapshotDocumentV2 = {
  schemaVersion: ORDER_SNAPSHOT_SCHEMA_VERSION,
  skuGroupKey: 'SKU-001',
  companyUuid: 'company-1',
  savedAt: '2026-05-26T00:00:00.000Z',
  context: {
    periodStart: '2026-05-01',
    periodEnd: '2026-05-31',
    forecastMonths: 8,
    dailyTrendStartMonth: '2026-05',
    dailyTrendLeadTimeDays: 30,
  },
  drawer1: {
    summary: {
      skuGroupKey: 'SKU-001',
      productName: 'Product',
      brand: 'Brand',
      category: 'Category',
      code: 'CODE',
      colorCode: 'BLACK',
      price: 1000,
      qty: 10,
      availableStock: 5,
    },
  },
  drawer2: {
    competitorBasis: {
      skuGroupKey: 'SKU-001',
      competitorPrice: 1200,
      competitorQty: 8,
      competitorRatioBySize: {},
    },
    competitorChannelId: 'cream',
    competitorChannelLabel: 'Cream',
    stockOrderRequest: {
      currentOrderInboundDueDate: '2026-06-01',
      nextOrderInboundDueDate: '2026-06-30',
      leadTimeDays: 30,
      dailyMeanOverride: 1,
    },
    selfWeightPct: 50,
    bufferStock: 0,
    aiComment: {
      prompt: '',
      answer: '',
    },
    sizeOrders: [],
    confirmedTotals: {
      orderQty: 0,
      expectedSalesAmount: 0,
      expectedOpProfit: 0,
      expectedOpProfitRatePct: null,
    },
  },
}

describe('getScopeSafeHydrateSnapshot', () => {
  it('allows a snapshot only when skuGroupKey and companyUuid match', () => {
    expect(getScopeSafeHydrateSnapshot(snapshot, 'SKU-001', 'company-1')).toBe(snapshot)
    expect(getScopeSafeHydrateSnapshot(snapshot, 'SKU-002', 'company-1')).toBeNull()
    expect(getScopeSafeHydrateSnapshot(snapshot, 'SKU-001', 'company-2')).toBeNull()
  })

  it('does not hydrate scoped snapshots in all-company scope', () => {
    expect(getScopeSafeHydrateSnapshot(snapshot, 'SKU-001', undefined)).toBeNull()
  })

  it('keeps unscoped snapshots only in all-company scope', () => {
    const unscopedSnapshot: OrderSnapshotDocumentV2 = { ...snapshot }
    delete unscopedSnapshot.companyUuid

    expect(getScopeSafeHydrateSnapshot(unscopedSnapshot, 'SKU-001', undefined)).toBe(unscopedSnapshot)
    expect(getScopeSafeHydrateSnapshot(unscopedSnapshot, 'SKU-001', 'company-1')).toBeNull()
  })
})
