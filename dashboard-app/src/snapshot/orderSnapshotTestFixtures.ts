import { ORDER_SNAPSHOT_SCHEMA_VERSION } from './orderSnapshotTypes'

export const validSnapshot = {
  schemaVersion: ORDER_SNAPSHOT_SCHEMA_VERSION,
  skuGroupKey: 'B',
  savedAt: '2026-04-23T00:00:00.000Z',
  context: {
    periodStart: '2026-01-01',
    periodEnd: '2026-01-31',
    forecastMonths: 8,
    dailyTrendStartMonth: '2026-01',
    dailyTrendLeadTimeDays: 30,
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
  },
  drawer2: {
    competitorBasis: {
      skuGroupKey: 'B',
      competitorPrice: 120000,
      competitorQty: 32,
      competitorRatioBySize: {
        '250': 0.6,
      },
    },
    competitorChannelId: 'cream',
    competitorChannelLabel: 'Cream',
    bufferStock: 0,
    selfWeightPct: 50,
    aiComment: {
      prompt: 'prompt',
      answer: 'comment',
    },
    stockOrderRequest: {
      currentOrderInboundDueDate: '2026-02-01',
      nextOrderInboundDueDate: '2026-02-28',
      leadTimeDays: 30,
      dailyMeanOverride: 10,
    },
    stockOrderResult: {
      trendDailyMean: 10,
      dailyMean: 10,
      sigma: 1,
      display: {
        currentStockQtyTotal: 20,
        totalOrderBalanceTotal: 4,
        expectedInboundOrderBalanceTotal: 2,
        currentStockQtyBySize: [20],
        totalOrderBalanceBySize: [4],
        expectedInboundOrderBalanceBySize: [2],
      },
      safetyStockCalc: {
        safetyStock: 12,
        recommendedOrderQty: 12,
        expectedOrderAmount: 720000,
        expectedSalesAmount: 1200000,
        expectedOpProfit: 336000,
      },
      forecastQtyCalc: {
        safetyStock: null,
        recommendedOrderQty: 12,
        expectedOrderAmount: 720000,
        expectedSalesAmount: 1200000,
        expectedOpProfit: 336000,
      },
    },
    unitEconomics: {
      unitPrice: 100000,
      unitCost: 60000,
      expectedFeeRatePct: 12,
    },
    confirmedTotals: {
      orderQty: 12,
      expectedSalesAmount: 1200000,
      expectedOpProfit: 336000,
      expectedOpProfitRatePct: 28,
    },
    sizeOrders: [
      {
        size: '250',
        selfSharePct: 40,
        competitorSharePct: 60,
        blendedSharePct: 50,
        forecastQty: 10,
        recommendedQty: 12,
        confirmQty: 12,
      },
    ],
  },
} as const

export const secondaryDetailFixture = {
  ...validSnapshot.drawer2.competitorBasis,
  sizeRows: [{
    size: '250',
    selfRatio: 40,
    confirmedQty: 12,
    avgPrice: 100000,
    qty: 80,
    availableStock: 20,
  }],
}

export const currentPrimarySummaryKeys = [
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

export const currentStockOrderRequestKeys = [
  'currentOrderInboundDueDate',
  'dailyMeanOverride',
  'leadTimeDays',
  'nextOrderInboundDueDate',
]

export const currentDrawer2Keys = [
  'aiComment',
  'bufferStock',
  'competitorBasis',
  'competitorChannelId',
  'competitorChannelLabel',
  'confirmedTotals',
  'selfWeightPct',
  'sizeOrders',
  'stockOrderRequest',
  'stockOrderResult',
  'unitEconomics',
]

export const currentCandidateMockDrawer2Keys = [...currentDrawer2Keys].sort()

export function sortedKeys(value: object) {
  return Object.keys(value).sort()
}
