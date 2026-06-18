import type { OrderSnapshotDocument } from './orderSnapshotTypes'
import { ORDER_SNAPSHOT_SCHEMA_VERSION } from './orderSnapshotTypes'

export const validSnapshot: OrderSnapshotDocument = {
  schemaVersion: ORDER_SNAPSHOT_SCHEMA_VERSION,
  skuGroupKey: 'B',
  savedAt: '2026-04-23T00:00:00.000Z',
  context: {
    periodStart: '2026-01-01',
    periodEnd: '2026-01-31',
    forecastMonths: 8,
    dailyTrendStartMonth: '2026-01',
    dailyTrendForecastDays: 30,
  },
  drawer1: {
    summary: {
      skuGroupKey: 'B',
      productName: 'Runner',
      brand: 'Brand',
      category: 'Shoes',
      code: 'RUN',
      colorCode: 'BLK',
      price: 100000,
      qty: 80,
      availableStock: 20,
    },
    monthlySalesTrend: [
      {
        idx: 0,
        date: '2026-01',
        actual: 80,
        comparisonActual: 32,
        forecastLink: null,
        isForecast: false,
        sales: 80,
        comparisonSales: 32,
      },
      {
        idx: 1,
        date: '2026-02',
        actual: null,
        comparisonActual: null,
        forecastLink: 90,
        isForecast: true,
        sales: 90,
        comparisonSales: null,
      },
    ],
  },
  drawer2: {
    baseSubject: {
      role: 'base',
      kind: 'self-company',
      sourceId: 'company-uuid-001',
    },
    comparisonSubject: {
      role: 'comparison',
      kind: 'competitor-channel',
      id: 'comparison:competitor-channel:cream',
      sourceId: 'cream',
      label: 'Cream',
    },
    comparisonBasis: {
      skuGroupKey: 'B',
      comparisonPrice: 120000,
      comparisonQty: 32,
      comparisonRatioBySize: {
        '250': 0.6,
      },
    },
    bufferStock: 0,
    selfWeightPct: 50,
    aiComment: {
      prompt: 'prompt',
      answer: 'comment',
      generatedAt: '2026-04-23T00:00:00.000Z',
    },
    stockOrderRequest: {
      currentOrderInboundDueDate: '2026-02-01',
      nextOrderInboundDueDate: '2026-02-28',
      orderCoverageDays: 30,
      dailyMeanOverride: 10,
    },
    stockOrderResult: {
      productIdentity: {
        skuGroupKey: 'B',
        brand: 'Brand',
        code: 'RUN',
        colorCode: 'BLK',
      },
      inboundSplitSource: {
        productId: 'B',
        productIdentity: {
          skuGroupKey: 'B',
          brand: 'Brand',
          code: 'RUN',
          colorCode: 'BLK',
        },
        calculationBaseDate: '2026-02-01',
        coverageStartDate: '2026-02-01',
        coverageEndDate: '2026-02-28',
        supplyBySize: {
          '250': [{ date: '2026-02-01', qty: 20 }],
        },
        salesForecastByDate: {
          '2026-02-01': { '250': 10 },
        },
      },
      existingOrderInboundSupplyBySize: {
        '250': [
          { date: '2026-01-31', qty: 2 },
          { date: '2026-02-01', qty: 2 },
        ],
      },
      trendDailyMean: 10,
      dailyMean: 10,
      sigma: 1,
      display: {
        currentStockQtyTotal: 20,
        totalOrderBalanceTotal: 4,
        expectedInboundOrderBalanceTotal: 2,
        sizeRows: [{
          size: '250',
          currentStockQty: 20,
          totalOrderBalance: 4,
          expectedInboundOrderBalance: 2,
        }],
      },
    },
    unitEconomics: {
      unitPrice: 100000,
      unitCost: 60000,
      expectedFeeRatePct: 12,
    },
    confirmed: {
      rounds: [{
        date: '2026-02-01',
        ignoreExistingOrderInbound: false,
        qtyBySize: {
          '250': 12,
        },
      }],
    },
    sizeOrders: [
      {
        size: '250',
        baseSharePct: 40,
        comparisonSharePct: 60,
        blendedSharePct: 50,
        forecastQty: 10,
        recommendedQty: 12,
      },
    ],
  },
}

export const secondaryDetailFixture = {
  ...validSnapshot.drawer2.comparisonBasis,
  sizeRows: [{
    size: '250',
    selfRatio: 40,
    confirmedQty: 12,
    avgPrice: 100000,
    qty: 80,
    availableStock: 20,
  }],
}

export const currentPrimarySummaryKeys: string[] = [
  'availableStock',
  'brand',
  'category',
  'code',
  'colorCode',
  'price',
  'productName',
  'qty',
  'skuGroupKey',
]

export const currentStockOrderRequestKeys: string[] = [
  'currentOrderInboundDueDate',
  'dailyMeanOverride',
  'nextOrderInboundDueDate',
  'orderCoverageDays',
]

export const currentDrawer2Keys: string[] = [
  'aiComment',
  'baseSubject',
  'bufferStock',
  'comparisonBasis',
  'comparisonSubject',
  'confirmed',
  'selfWeightPct',
  'sizeOrders',
  'stockOrderRequest',
  'stockOrderResult',
  'unitEconomics',
]

export const currentCandidateMockDrawer2Keys: string[] = [...currentDrawer2Keys].sort()

export function sortedKeys(value: object) : string[] {
  return Object.keys(value).sort()
}
