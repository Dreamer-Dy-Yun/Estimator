import { ORDER_SNAPSHOT_SCHEMA_VERSION } from './orderSnapshotTypes'

export const validSnapshot: { readonly schemaVersion: 2; readonly skuGroupKey: 'B'; readonly savedAt: '2026-04-23T00:00:00.000Z'; readonly context: { readonly periodStart: '2026-01-01'; readonly periodEnd: '2026-01-31'; readonly forecastMonths: 8; readonly dailyTrendStartMonth: '2026-01'; readonly dailyTrendLeadTimeDays: 30; }; readonly drawer1: { readonly summary: { readonly skuGroupKey: 'B'; readonly productName: 'Runner'; readonly brand: 'Brand'; readonly category: 'Shoes'; readonly code: 'RUN'; readonly colorCode: 'BLK'; readonly price: 100000; readonly qty: 80; readonly availableStock: 20; }; }; readonly drawer2: { readonly competitorBasis: { readonly skuGroupKey: 'B'; readonly competitorPrice: 120000; readonly competitorQty: 32; readonly competitorRatioBySize: { readonly '250': 0.6; }; }; readonly competitorChannelId: 'cream'; readonly competitorChannelLabel: 'Cream'; readonly bufferStock: 0; readonly selfWeightPct: 50; readonly aiComment: { readonly prompt: 'prompt'; readonly answer: 'comment'; readonly generatedAt: '2026-04-23T00:00:00.000Z'; }; readonly stockOrderRequest: { readonly currentOrderInboundDueDate: '2026-02-01'; readonly nextOrderInboundDueDate: '2026-02-28'; readonly leadTimeDays: 30; readonly dailyMeanOverride: 10; }; readonly stockOrderResult: { readonly trendDailyMean: 10; readonly dailyMean: 10; readonly sigma: 1; readonly display: { readonly currentStockQtyTotal: 20; readonly totalOrderBalanceTotal: 4; readonly expectedInboundOrderBalanceTotal: 2; readonly sizeRows: readonly [{ readonly size: '250'; readonly currentStockQty: 20; readonly totalOrderBalance: 4; readonly expectedInboundOrderBalance: 2; }]; }; readonly safetyStockCalc: { readonly safetyStock: 12; readonly recommendedOrderQty: 12; readonly expectedOrderAmount: 720000; readonly expectedSalesAmount: 1200000; readonly expectedOpProfit: 336000; }; readonly forecastQtyCalc: { readonly safetyStock: null; readonly recommendedOrderQty: 12; readonly expectedOrderAmount: 720000; readonly expectedSalesAmount: 1200000; readonly expectedOpProfit: 336000; }; }; readonly unitEconomics: { readonly unitPrice: 100000; readonly unitCost: 60000; readonly expectedFeeRatePct: 12; }; readonly confirmedTotals: { readonly orderQty: 12; readonly expectedSalesAmount: 1200000; readonly expectedOpProfit: 336000; readonly expectedOpProfitRatePct: 28; }; readonly sizeOrders: readonly [{ readonly size: '250'; readonly selfSharePct: 40; readonly competitorSharePct: 60; readonly blendedSharePct: 50; readonly forecastQty: 10; readonly recommendedQty: 12; readonly confirmQty: 12; }]; }; } = {
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
      generatedAt: '2026-04-23T00:00:00.000Z',
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
        sizeRows: [{
          size: '250',
          currentStockQty: 20,
          totalOrderBalance: 4,
          expectedInboundOrderBalance: 2,
        }],
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

export const secondaryDetailFixture: { sizeRows: { size: string; selfRatio: number; confirmedQty: number; avgPrice: number; qty: number; availableStock: number; }[]; skuGroupKey: 'B'; competitorPrice: 120000; competitorQty: 32; competitorRatioBySize: { readonly '250': 0.6; }; } = {
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
  'leadTimeDays',
  'nextOrderInboundDueDate',
]

export const currentDrawer2Keys: string[] = [
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

export const currentCandidateMockDrawer2Keys: string[] = [...currentDrawer2Keys].sort()

export function sortedKeys(value: object) : string[] {
  return Object.keys(value).sort()
}
