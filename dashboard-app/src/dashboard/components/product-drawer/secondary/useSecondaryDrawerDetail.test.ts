import { describe, expect, it } from 'vitest'
import type { ProductComparisonBaseSubjectRef, ProductComparisonTarget } from '../../../../api/types'
import type { OrderSnapshotDocument } from '../../../../snapshot/orderSnapshotTypes'
import { ORDER_SNAPSHOT_SCHEMA_VERSION } from '../../../../snapshot/orderSnapshotTypes'
import { getBaseScopeSafeHydrateSnapshot, getScopeSafeHydrateSnapshot } from './useSecondaryDrawerDetail'

const BASE_SUBJECT: ProductComparisonBaseSubjectRef = {
  role: 'base',
  kind: 'self-company',
  sourceId: 'company-1',
}

const COMPARISON_TARGET: ProductComparisonTarget = {
  role: 'comparison',
  kind: 'competitor-channel',
  id: 'comparison:competitor-channel:cream',
  sourceId: 'cream',
  label: 'Cream',
}

const snapshot: OrderSnapshotDocument = {
  schemaVersion: ORDER_SNAPSHOT_SCHEMA_VERSION,
  skuGroupKey: 'SKU-001',
  savedAt: '2026-05-26T00:00:00.000Z',
  context: {
    periodStart: '2026-05-01',
    periodEnd: '2026-05-31',
    forecastMonths: 8,
    dailyTrendStartMonth: '2026-05',
    dailyTrendForecastDays: 30,
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
    monthlySalesTrend: [{ idx: 0, date: '2026-05', actual: 10, comparisonActual: 8, forecastLink: null, isForecast: false, sales: 10, comparisonSales: 8 }],
  },
  drawer2: {
    baseSubject: BASE_SUBJECT,
    comparisonSubject: COMPARISON_TARGET,
    comparisonBasis: {
      skuGroupKey: 'SKU-001',
      comparisonPrice: 1200,
      comparisonQty: 8,
      comparisonRatioBySize: {},
    },
    stockOrderRequest: {
      currentOrderInboundDueDate: '2026-06-01',
      nextOrderInboundDueDate: '2026-06-30',
      orderCoverageDays: 30,
      dailyMeanOverride: 1,
    },
    stockOrderResult: {
      productIdentity: {
        productUuid: null,
        skuGroupKey: 'SKU-001',
        brand: 'Brand',
        code: 'CODE',
        colorCode: 'BLK',
      },
      inboundSplitSource: {
        productId: 'SKU-001',
        productIdentity: {
          productUuid: null,
          skuGroupKey: 'SKU-001',
          brand: 'Brand',
          code: 'CODE',
          colorCode: 'BLK',
        },
        calculationBaseDate: '2026-06-01',
        coverageStartDate: '2026-06-01',
        coverageEndDate: '2026-06-30',
        supplyBySize: {},
        salesForecastByDate: {},
      },
      existingOrderInboundSupplyBySize: {},
      trendDailyMean: 1,
      dailyMean: 1,
      sigma: 0,
      display: {
        currentStockQtyTotal: 0,
        totalOrderBalanceTotal: 0,
        expectedInboundOrderBalanceTotal: 0,
        sizeRows: [],
      },
    },
    unitEconomics: {
      unitPrice: 1000,
      unitCost: 700,
      expectedFeeRatePct: 13,
    },
    selfWeightPct: 50,
    bufferStock: 0,
    aiComment: {
      prompt: '',
      answer: '',
      generatedAt: null,
    },
    sizeOrders: [],
    confirmed: {
      rounds: [],
    },
  },
}

describe('getScopeSafeHydrateSnapshot', () : void => {
  it('allows a snapshot only when skuGroupKey, base subject, and comparison subject match', () : void => {
    expect(getScopeSafeHydrateSnapshot(snapshot, 'SKU-001', BASE_SUBJECT, COMPARISON_TARGET)).toBe(snapshot)
    expect(getScopeSafeHydrateSnapshot(snapshot, 'SKU-002', BASE_SUBJECT, COMPARISON_TARGET)).toBeNull()
    expect(getScopeSafeHydrateSnapshot(snapshot, 'SKU-001', { ...BASE_SUBJECT, sourceId: 'company-2' }, COMPARISON_TARGET)).toBeNull()
  })

  it('rejects snapshots when comparison target is absent or different', () : void => {
    const otherComparison: ProductComparisonTarget = {
      ...COMPARISON_TARGET,
      sourceId: 'musinsa',
      id: 'comparison:competitor-channel:musinsa',
      label: 'Musinsa',
    }

    expect(getScopeSafeHydrateSnapshot(snapshot, 'SKU-001', BASE_SUBJECT, null)).toBeNull()
    expect(getScopeSafeHydrateSnapshot(snapshot, 'SKU-001', BASE_SUBJECT, otherComparison)).toBeNull()
  })

  it('keeps a base-safe snapshot available before the saved comparison subject is restored', () : void => {
    const otherComparison: ProductComparisonTarget = {
      ...COMPARISON_TARGET,
      sourceId: 'musinsa',
      id: 'comparison:competitor-channel:musinsa',
      label: 'Musinsa',
    }

    expect(getBaseScopeSafeHydrateSnapshot(snapshot, 'SKU-001', BASE_SUBJECT)).toBe(snapshot)
    expect(getScopeSafeHydrateSnapshot(snapshot, 'SKU-001', BASE_SUBJECT, otherComparison)).toBeNull()
  })

  it('keeps unscoped base snapshots only in unscoped base scope', () : void => {
    const unscopedBaseSubject: ProductComparisonBaseSubjectRef = { role: 'base', kind: 'self-company' }
    const unscopedSnapshot: OrderSnapshotDocument = {
      ...snapshot,
      drawer2: {
        ...snapshot.drawer2,
        baseSubject: unscopedBaseSubject,
      },
    }

    expect(getScopeSafeHydrateSnapshot(unscopedSnapshot, 'SKU-001', unscopedBaseSubject, COMPARISON_TARGET)).toBe(unscopedSnapshot)
    expect(getScopeSafeHydrateSnapshot(unscopedSnapshot, 'SKU-001', BASE_SUBJECT, COMPARISON_TARGET)).toBeNull()
  })
})
