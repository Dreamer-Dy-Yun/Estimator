import { describe, expect, it } from 'vitest'
import { buildMockOrderSnapshotForCandidate } from '../api/mock/orderSnapshotForCandidate'
import { productPrimaryBySkuGroupKey, productSecondaryBySkuGroupKey } from '../api/mock/productCatalog'
import { buildSecondaryOrderSnapshot } from '../dashboard/components/product-drawer/secondary/secondarySnapshot'
import { ORDER_SNAPSHOT_SCHEMA_VERSION } from './orderSnapshotTypes'
import { parseOrderSnapshot } from './parseOrderSnapshot'

const validSnapshot = {
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
        '250': 60,
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

const secondaryDetailFixture = {
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

const currentPrimarySummaryKeys = [
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

const currentStockOrderRequestKeys = [
  'currentOrderInboundDueDate',
  'dailyMeanOverride',
  'leadTimeDays',
  'nextOrderInboundDueDate',
]

const currentDrawer2Keys = [
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

const currentCandidateMockDrawer2Keys = [...currentDrawer2Keys].sort()

function sortedKeys(value: object) {
  return Object.keys(value).sort()
}

describe('parseOrderSnapshot', () => {
  it('returns current snapshot when required fields are valid', () => {
    const parsed = parseOrderSnapshot(validSnapshot)
    expect(parsed).toEqual(validSnapshot)
    expect(parsed).not.toBe(validSnapshot)
  })

  it('preserves top-level companyUuid when it is a valid non-empty string', () => {
    const withCompanyUuid = {
      ...validSnapshot,
      companyUuid: 'company-uuid-001',
    }

    const parsed = parseOrderSnapshot(withCompanyUuid)

    expect(parsed.companyUuid).toBe('company-uuid-001')
    expect(parsed).toEqual(withCompanyUuid)
  })

  it('does not add top-level companyUuid when it is omitted', () => {
    const parsed = parseOrderSnapshot(validSnapshot)

    expect(parsed).not.toHaveProperty('companyUuid')
  })

  it('strips fields that are not part of the current v2 snapshot contract', () => {
    const withExtra = {
      ...validSnapshot,
      extraMeta: { source: 'test' },
      context: {
        ...validSnapshot.context,
        unknownContextField: true,
      },
      drawer1: {
        ...validSnapshot.drawer1,
        unknownDrawer1Field: true,
        summary: {
          ...validSnapshot.drawer1.summary,
          unknownSummaryField: true,
        },
      },
      drawer2: {
        ...validSnapshot.drawer2,
        unknownDrawer2Field: true,
        stockOrderRequest: {
          ...validSnapshot.drawer2.stockOrderRequest,
          unknownStockOrderRequestField: true,
        },
      },
    }
    const parsed = parseOrderSnapshot(withExtra)
    expect(parsed).toEqual(validSnapshot)
    expect(parsed).not.toHaveProperty('extraMeta')
    expect(parsed.context).not.toHaveProperty('unknownContextField')
    expect(parsed.drawer1).not.toHaveProperty('unknownDrawer1Field')
    expect(parsed.drawer1.summary).not.toHaveProperty('unknownSummaryField')
    expect(parsed.drawer2).not.toHaveProperty('unknownDrawer2Field')
    expect(parsed.drawer2.stockOrderRequest).toEqual(validSnapshot.drawer2.stockOrderRequest)
    expect(parsed.drawer2.stockOrderRequest).not.toHaveProperty('unknownStockOrderRequestField')
  })

  it('strips fields that are explicitly excluded from the current snapshot contract', () => {
    const withExcludedFields = {
      ...validSnapshot,
      drawer1: {
        summary: {
          ...validSnapshot.drawer1.summary,
          monthlySalesTrend: [],
        },
      },
      drawer2: {
        ...validSnapshot.drawer2,
        salesSelf: { legacy: true },
        salesCompetitor: { legacy: true },
        sizeForecastSource: 'forecastQty',
        minOpMarginPct: null,
      },
    }

    const parsed = parseOrderSnapshot(withExcludedFields)

    expect(parsed.drawer1.summary).toEqual(validSnapshot.drawer1.summary)
    expect(parsed.drawer2.competitorBasis).toEqual(validSnapshot.drawer2.competitorBasis)
    expect(parsed.drawer2).not.toHaveProperty('salesSelf')
    expect(parsed.drawer2).not.toHaveProperty('salesCompetitor')
    expect(parsed.drawer2).not.toHaveProperty('sizeForecastSource')
    expect(parsed.drawer2).not.toHaveProperty('minOpMarginPct')
  })

  it('emits only current snapshot fields from the secondary snapshot builder', () => {
    const snapshot = buildSecondaryOrderSnapshot({
      primary: {
        ...validSnapshot.drawer1.summary,
        monthlySalesTrend: [],
        unknownPrimaryField: 'drop',
      } as Parameters<typeof buildSecondaryOrderSnapshot>[0]['primary'],
      secondary: {
        ...secondaryDetailFixture,
        unknownSecondaryField: 'drop',
      } as Parameters<typeof buildSecondaryOrderSnapshot>[0]['secondary'],
      periodStart: validSnapshot.context.periodStart,
      periodEnd: validSnapshot.context.periodEnd,
      forecastMonths: validSnapshot.context.forecastMonths,
      selectedStart: validSnapshot.context.dailyTrendStartMonth,
      leadTimeDays: validSnapshot.context.dailyTrendLeadTimeDays,
      competitorChannelId: validSnapshot.drawer2.competitorChannelId,
      competitorChannelLabel: validSnapshot.drawer2.competitorChannelLabel,
      stockOrderRequest: {
        ...validSnapshot.drawer2.stockOrderRequest,
        unknownStockOrderRequestField: 'drop',
      } as Parameters<typeof buildSecondaryOrderSnapshot>[0]['stockOrderRequest'],
      stockOrderResult: null,
      selfWeightPct: validSnapshot.drawer2.selfWeightPct,
      bufferStock: validSnapshot.drawer2.bufferStock,
      aiPrompt: validSnapshot.drawer2.aiComment.prompt,
      aiComment: validSnapshot.drawer2.aiComment.answer,
      unitPrice: validSnapshot.drawer2.unitEconomics.unitPrice,
      unitCost: validSnapshot.drawer2.unitEconomics.unitCost,
      expectedFeeRatePct: validSnapshot.drawer2.unitEconomics.expectedFeeRatePct,
      sizeRows: validSnapshot.drawer2.sizeOrders.map((row) => ({ ...row })),
    })

    expect(sortedKeys(snapshot.drawer1.summary)).toEqual(currentPrimarySummaryKeys)
    expect(sortedKeys(snapshot.drawer2)).toEqual(currentDrawer2Keys.filter((key) => key !== 'stockOrderResult'))
    expect(sortedKeys(snapshot.drawer2.stockOrderRequest)).toEqual(currentStockOrderRequestKeys)
    expect(snapshot.drawer2).not.toHaveProperty('stockOrderResult')
  })

  it('emits top-level companyUuid from the secondary snapshot builder when provided', () => {
    const snapshot = buildSecondaryOrderSnapshot({
      primary: {
        ...validSnapshot.drawer1.summary,
        monthlySalesTrend: [],
      } as Parameters<typeof buildSecondaryOrderSnapshot>[0]['primary'],
      secondary: secondaryDetailFixture,
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
      aiPrompt: validSnapshot.drawer2.aiComment.prompt,
      aiComment: validSnapshot.drawer2.aiComment.answer,
      unitPrice: validSnapshot.drawer2.unitEconomics.unitPrice,
      unitCost: validSnapshot.drawer2.unitEconomics.unitCost,
      expectedFeeRatePct: validSnapshot.drawer2.unitEconomics.expectedFeeRatePct,
      sizeRows: validSnapshot.drawer2.sizeOrders.map((row) => ({ ...row })),
      companyUuid: 'company-uuid-001',
    })

    expect(snapshot.companyUuid).toBe('company-uuid-001')
  })

  it('emits only current snapshot fields from the candidate mock snapshot builder', () => {
    const secondaryLookup = productSecondaryBySkuGroupKey as Record<string, unknown>
    const skuGroupKey = Object.keys(productPrimaryBySkuGroupKey).find(
      (key) => secondaryLookup[key] != null,
    )
    if (!skuGroupKey) throw new Error('No shared mock product key found')

    const snapshot = buildMockOrderSnapshotForCandidate(skuGroupKey)

    expect(sortedKeys(snapshot.drawer1.summary)).toEqual(currentPrimarySummaryKeys)
    expect(sortedKeys(snapshot.drawer2)).toEqual(currentCandidateMockDrawer2Keys)
    expect(sortedKeys(snapshot.drawer2.stockOrderRequest)).toEqual(
      currentStockOrderRequestKeys.filter((key) => key !== 'dailyMeanOverride'),
    )
    expect(snapshot.drawer2).not.toHaveProperty('secondary')
    expect(snapshot.drawer2).not.toHaveProperty('salesSelf')
    expect(snapshot.drawer2).not.toHaveProperty('salesCompetitor')
    expect(snapshot.drawer2).not.toHaveProperty('sizeForecastSource')
    expect(snapshot.drawer2).not.toHaveProperty('minOpMarginPct')
  })

  it('emits top-level companyUuid from the candidate mock snapshot builder when provided', () => {
    const secondaryLookup = productSecondaryBySkuGroupKey as Record<string, unknown>
    const skuGroupKey = Object.keys(productPrimaryBySkuGroupKey).find(
      (key) => secondaryLookup[key] != null,
    )
    if (!skuGroupKey) throw new Error('No shared mock product key found')

    const snapshot = buildMockOrderSnapshotForCandidate(skuGroupKey, {
      companyUuid: 'company-uuid-001',
    })

    expect(snapshot.companyUuid).toBe('company-uuid-001')
  })

  it('throws when snapshot body is missing', () => {
    expect(() => parseOrderSnapshot(null)).toThrow()
    expect(() => parseOrderSnapshot(undefined)).toThrow()
  })

  it('throws when snapshot body is non-object primitive', () => {
    expect(() => parseOrderSnapshot('text')).toThrow()
    expect(() => parseOrderSnapshot(123)).toThrow()
    expect(() => parseOrderSnapshot(true)).toThrow()
  })

  it('throws when snapshot body is empty object', () => {
    expect(() => parseOrderSnapshot({})).toThrow()
  })

  it('throws when schemaVersion does not match current version', () => {
    const wrongVersion = { ...validSnapshot, schemaVersion: 1 }
    expect(() => parseOrderSnapshot(wrongVersion)).toThrow()
  })

  it('throws when schemaVersion type is invalid', () => {
    const wrongTypeVersion = { ...validSnapshot, schemaVersion: '2' }
    expect(() => parseOrderSnapshot(wrongTypeVersion)).toThrow()
  })

  it('throws when drawer block is missing', () => {
    const withoutDrawer1 = { ...validSnapshot, drawer1: null }
    const withoutDrawer2 = { ...validSnapshot, drawer2: null }
    expect(() => parseOrderSnapshot(withoutDrawer1)).toThrow(/drawer/)
    expect(() => parseOrderSnapshot(withoutDrawer2)).toThrow(/drawer/)
  })

  it('throws when drawer block is undefined', () => {
    const withoutDrawer1 = { ...validSnapshot, drawer1: undefined }
    const withoutDrawer2 = { ...validSnapshot, drawer2: undefined }
    expect(() => parseOrderSnapshot(withoutDrawer1)).toThrow(/drawer/)
    expect(() => parseOrderSnapshot(withoutDrawer2)).toThrow(/drawer/)
  })

  it('throws when skuGroupKey is missing or empty', () => {
    const missingSkuGroupKey = { ...validSnapshot, skuGroupKey: null }
    const emptySkuGroupKey = { ...validSnapshot, skuGroupKey: '' }
    expect(() => parseOrderSnapshot(missingSkuGroupKey)).toThrow(/skuGroupKey/)
    expect(() => parseOrderSnapshot(emptySkuGroupKey)).toThrow(/skuGroupKey/)
  })

  it('throws when skuGroupKey is not a string', () => {
    const numericSkuGroupKey = { ...validSnapshot, skuGroupKey: 1234 }
    expect(() => parseOrderSnapshot(numericSkuGroupKey)).toThrow(/skuGroupKey/)
  })

  it('throws when top-level companyUuid is empty or not a string', () => {
    const emptyCompanyUuid = { ...validSnapshot, companyUuid: '' }
    const nullCompanyUuid = { ...validSnapshot, companyUuid: null }
    const numericCompanyUuid = { ...validSnapshot, companyUuid: 1234 }

    expect(() => parseOrderSnapshot(emptyCompanyUuid)).toThrow(/companyUuid/)
    expect(() => parseOrderSnapshot(nullCompanyUuid)).toThrow(/companyUuid/)
    expect(() => parseOrderSnapshot(numericCompanyUuid)).toThrow(/companyUuid/)
  })

  it('throws when snapshot structure blocks are missing', () => {
    const broken = {
      ...validSnapshot,
      drawer2: {
        ...validSnapshot.drawer2,
        stockOrderRequest: null,
      },
    }
    expect(() => parseOrderSnapshot(broken)).toThrow(/stockOrderRequest/)
  })

  it('throws when stockOrderRequest fields have invalid types', () => {
    const invalidStockOrderRequestsList = [
      { ...validSnapshot.drawer2.stockOrderRequest, currentOrderInboundDueDate: 20260201 },
      { ...validSnapshot.drawer2.stockOrderRequest, nextOrderInboundDueDate: undefined },
      { ...validSnapshot.drawer2.stockOrderRequest, leadTimeDays: '30' },
      { ...validSnapshot.drawer2.stockOrderRequest, dailyMeanOverride: '10' },
    ]
    for (const stockOrderRequest of invalidStockOrderRequestsList) {
      const broken = {
        ...validSnapshot,
        drawer2: {
          ...validSnapshot.drawer2,
          stockOrderRequest,
        },
      }
      expect(() => parseOrderSnapshot(broken)).toThrow(/stockOrderRequest/)
    }
  })

  it('throws when competitorBasis fields have invalid types', () => {
    const invalidBasisList = [
      { ...validSnapshot.drawer2.competitorBasis, competitorPrice: '120000' },
      { ...validSnapshot.drawer2.competitorBasis, competitorQty: null },
      { ...validSnapshot.drawer2.competitorBasis, competitorRatioBySize: [{ size: '250', ratioPct: 60 }] },
      { ...validSnapshot.drawer2.competitorBasis, competitorRatioBySize: { '250': '60' } },
    ]
    for (const competitorBasis of invalidBasisList) {
      const broken = {
        ...validSnapshot,
        drawer2: {
          ...validSnapshot.drawer2,
          competitorBasis,
        },
      }
      expect(() => parseOrderSnapshot(broken)).toThrow(/competitorBasis/)
    }
  })

  it('throws when sizeOrders row fields have invalid types', () => {
    const [row] = validSnapshot.drawer2.sizeOrders
    const invalidRows = [
      { ...row, size: 250 },
      { ...row, selfSharePct: '40' },
      { ...row, competitorSharePct: null },
      { ...row, blendedSharePct: Number.NaN },
      { ...row, forecastQty: '10' },
      { ...row, recommendedQty: undefined },
      { ...row, confirmQty: '12' },
    ]
    for (const invalidRow of invalidRows) {
      const broken = {
        ...validSnapshot,
        drawer2: {
          ...validSnapshot.drawer2,
          sizeOrders: [invalidRow],
        },
      }
      expect(() => parseOrderSnapshot(broken)).toThrow(/sizeOrders/)
    }
  })

  it('preserves internally odd business values for the screen to surface', () => {
    const internallyOdd = {
      ...validSnapshot,
      drawer2: {
        ...validSnapshot.drawer2,
        stockOrderRequest: { ...validSnapshot.drawer2.stockOrderRequest, dailyMeanOverride: -1 },
        sizeOrders: [{ ...validSnapshot.drawer2.sizeOrders[0], confirmQty: -1 }],
      },
    }
    const parsed = parseOrderSnapshot(internallyOdd)
    expect(parsed.drawer2.stockOrderRequest).toEqual(internallyOdd.drawer2.stockOrderRequest)
    expect(parsed.drawer2.sizeOrders).toEqual(internallyOdd.drawer2.sizeOrders)
  })
})
