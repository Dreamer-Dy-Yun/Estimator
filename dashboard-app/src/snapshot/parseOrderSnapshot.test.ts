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
    competitorSalesBasis: {
      skuGroupKey: 'B',
      competitorPrice: 120000,
      competitorQty: 32,
      competitorRatioBySize: {
        '250': 60,
      },
    },
    competitorChannelId: 'cream',
    competitorChannelLabel: '크림',
    bufferStock: 0,
    selfWeightPct: 50,
    llmPrompt: 'prompt',
    llmAnswer: 'comment',
    stockInputs: {
      trendDailyMean: 10,
      leadTimeStartDate: '2026-02-01',
      leadTimeEndDate: '2026-02-28',
      leadTimeDays: 30,
      dailyMean: 10,
      safetyStockMode: 'formula',
      manualSafetyStock: 0,
      sigma: 1,
      serviceLevelPct: 95,
    },
    orderUnitInputs: {
      unitPrice: 100000,
      unitCost: 60000,
      expectedFeeRatePct: 12,
    },
    stockDisplay: {
      currentStockQtyTotal: 20,
      totalOrderBalanceTotal: 4,
      expectedInboundOrderBalanceTotal: 2,
      currentStockQtyBySize: [20],
      totalOrderBalanceBySize: [4],
      expectedInboundOrderBalanceBySize: [2],
    },
    confirmedTotals: {
      orderQty: 12,
      expectedSalesAmount: 1200000,
      expectedOpProfit: 336000,
      expectedOpProfitRatePct: 28,
    },
    sizeRows: [
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

const currentStockInputKeys = [
  'dailyMean',
  'leadTimeDays',
  'leadTimeEndDate',
  'leadTimeStartDate',
  'manualSafetyStock',
  'safetyStockMode',
  'serviceLevelPct',
  'sigma',
  'trendDailyMean',
]

const currentDrawer2Keys = [
  'bufferStock',
  'competitorChannelId',
  'competitorChannelLabel',
  'competitorSalesBasis',
  'confirmedTotals',
  'llmAnswer',
  'llmPrompt',
  'orderUnitInputs',
  'selfWeightPct',
  'sizeRows',
  'stockInputs',
]

function sortedKeys(value: object) {
  return Object.keys(value).sort()
}

describe('parseOrderSnapshot', () => {
  it('returns current snapshot when required fields are valid', () => {
    const parsed = parseOrderSnapshot(validSnapshot)
    expect(parsed).toEqual(validSnapshot)
    expect(parsed).not.toBe(validSnapshot)
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
        stockInputs: {
          ...validSnapshot.drawer2.stockInputs,
          unknownStockInputField: true,
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
    expect(parsed.drawer2.stockInputs).toEqual(validSnapshot.drawer2.stockInputs)
    expect(parsed.drawer2.stockInputs).not.toHaveProperty('unknownStockInputField')
  })

  it('strips legacy removed fields and normalizes drawer2.secondary into competitorSalesBasis', () => {
    const { competitorSalesBasis, ...drawer2WithoutBasis } = validSnapshot.drawer2
    void competitorSalesBasis
    const legacy = {
      ...validSnapshot,
      drawer1: {
        summary: {
          ...validSnapshot.drawer1.summary,
          monthlySalesTrend: [],
          sizeMix: [{ size: '250', confirmedQty: 1 }],
          seasonality: { peak: 'winter' },
          recommendedOrderQty: 100,
        },
      },
      drawer2: {
        ...drawer2WithoutBasis,
        secondary: {
          skuGroupKey: 'B',
          competitorPrice: 99000,
          competitorQty: 15,
          competitorRatioBySize: {
            '250': 45,
          },
          productName: 'legacy detail should not be stored',
        },
        salesSelf: { legacy: true },
        salesCompetitor: { legacy: true },
        stockDerived: { recommendedOrderQty: 100 },
        sizeForecastSource: 'forecastQty',
        minOpMarginPct: null,
      },
    }

    const parsed = parseOrderSnapshot(legacy)

    expect(parsed.drawer1.summary).toEqual(validSnapshot.drawer1.summary)
    expect(parsed.drawer2.competitorSalesBasis).toEqual({
      skuGroupKey: 'B',
      competitorPrice: 99000,
      competitorQty: 15,
      competitorRatioBySize: {
        '250': 45,
      },
    })
    expect(parsed.drawer2).not.toHaveProperty('secondary')
    expect(parsed.drawer2).not.toHaveProperty('salesSelf')
    expect(parsed.drawer2).not.toHaveProperty('salesCompetitor')
    expect(parsed.drawer2).not.toHaveProperty('stockDerived')
    expect(parsed.drawer2).not.toHaveProperty('sizeForecastSource')
    expect(parsed.drawer2).not.toHaveProperty('minOpMarginPct')
  })

  it('emits only current snapshot fields from the secondary snapshot builder', () => {
    const snapshot = buildSecondaryOrderSnapshot({
      primary: {
        ...validSnapshot.drawer1.summary,
        monthlySalesTrend: [],
        sizeMix: [],
        seasonality: [],
        recommendedOrderQty: 100,
        unknownPrimaryField: 'drop',
      } as Parameters<typeof buildSecondaryOrderSnapshot>[0]['primary'],
      secondary: {
        ...validSnapshot.drawer2.competitorSalesBasis,
        unknownSecondaryField: 'drop',
      } as Parameters<typeof buildSecondaryOrderSnapshot>[0]['secondary'],
      periodStart: validSnapshot.context.periodStart,
      periodEnd: validSnapshot.context.periodEnd,
      forecastMonths: validSnapshot.context.forecastMonths,
      selectedStart: validSnapshot.context.dailyTrendStartMonth,
      leadTimeDays: validSnapshot.context.dailyTrendLeadTimeDays,
      competitorChannelId: validSnapshot.drawer2.competitorChannelId,
      competitorChannelLabel: validSnapshot.drawer2.competitorChannelLabel,
      forecastInputs: {
        ...validSnapshot.drawer2.stockInputs,
        unknownStockInputField: 'drop',
      } as Parameters<typeof buildSecondaryOrderSnapshot>[0]['forecastInputs'],
      stockDisplay: null,
      selfWeightPct: validSnapshot.drawer2.selfWeightPct,
      bufferStock: validSnapshot.drawer2.bufferStock,
      aiPrompt: validSnapshot.drawer2.llmPrompt,
      aiComment: validSnapshot.drawer2.llmAnswer,
      unitPrice: validSnapshot.drawer2.orderUnitInputs.unitPrice,
      unitCost: validSnapshot.drawer2.orderUnitInputs.unitCost,
      expectedFeeRatePct: validSnapshot.drawer2.orderUnitInputs.expectedFeeRatePct,
      sizeRows: validSnapshot.drawer2.sizeRows.map((row) => ({ ...row })),
    })

    expect(sortedKeys(snapshot.drawer1.summary)).toEqual(currentPrimarySummaryKeys)
    expect(sortedKeys(snapshot.drawer2)).toEqual(currentDrawer2Keys)
    expect(sortedKeys(snapshot.drawer2.stockInputs)).toEqual(currentStockInputKeys)
    expect(snapshot.drawer2).not.toHaveProperty('stockDisplay')
  })

  it('emits only current snapshot fields from the candidate mock snapshot builder', () => {
    const secondaryLookup = productSecondaryBySkuGroupKey as Record<string, unknown>
    const skuGroupKey = Object.keys(productPrimaryBySkuGroupKey).find(
      (key) => secondaryLookup[key] != null,
    )
    if (!skuGroupKey) throw new Error('No shared mock product key found')

    const snapshot = buildMockOrderSnapshotForCandidate(skuGroupKey)

    expect(sortedKeys(snapshot.drawer1.summary)).toEqual(currentPrimarySummaryKeys)
    expect(sortedKeys(snapshot.drawer2.stockInputs)).toEqual(currentStockInputKeys)
    expect(snapshot.drawer1.summary).not.toHaveProperty('monthlySalesTrend')
    expect(snapshot.drawer1.summary).not.toHaveProperty('sizeMix')
    expect(snapshot.drawer1.summary).not.toHaveProperty('seasonality')
    expect(snapshot.drawer1.summary).not.toHaveProperty('recommendedOrderQty')
    expect(snapshot.drawer2).not.toHaveProperty('secondary')
    expect(snapshot.drawer2).not.toHaveProperty('salesSelf')
    expect(snapshot.drawer2).not.toHaveProperty('salesCompetitor')
    expect(snapshot.drawer2).not.toHaveProperty('stockDerived')
    expect(snapshot.drawer2).not.toHaveProperty('sizeForecastSource')
    expect(snapshot.drawer2).not.toHaveProperty('minOpMarginPct')
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

  it('throws when snapshot structure blocks are missing', () => {
    const broken = {
      ...validSnapshot,
      drawer2: {
        ...validSnapshot.drawer2,
        stockInputs: null,
      },
    }
    expect(() => parseOrderSnapshot(broken)).toThrow(/stockInputs/)
  })

  it('throws when stockInputs fields have invalid types', () => {
    const invalidStockInputsList = [
      { ...validSnapshot.drawer2.stockInputs, trendDailyMean: '10' },
      { ...validSnapshot.drawer2.stockInputs, dailyMean: null },
      { ...validSnapshot.drawer2.stockInputs, leadTimeStartDate: 20260201 },
      { ...validSnapshot.drawer2.stockInputs, leadTimeEndDate: undefined },
      { ...validSnapshot.drawer2.stockInputs, leadTimeDays: '30' },
      { ...validSnapshot.drawer2.stockInputs, safetyStockMode: 'auto' },
      { ...validSnapshot.drawer2.stockInputs, manualSafetyStock: null },
      { ...validSnapshot.drawer2.stockInputs, sigma: Number.NaN },
      { ...validSnapshot.drawer2.stockInputs, serviceLevelPct: '95' },
    ]
    for (const stockInputs of invalidStockInputsList) {
      const broken = {
        ...validSnapshot,
        drawer2: {
          ...validSnapshot.drawer2,
          stockInputs,
        },
      }
      expect(() => parseOrderSnapshot(broken)).toThrow(/stockInputs/)
    }
  })

  it('throws when competitorSalesBasis fields have invalid types', () => {
    const invalidBasisList = [
      { ...validSnapshot.drawer2.competitorSalesBasis, competitorPrice: '120000' },
      { ...validSnapshot.drawer2.competitorSalesBasis, competitorQty: null },
      { ...validSnapshot.drawer2.competitorSalesBasis, competitorRatioBySize: [{ size: '250', ratioPct: 60 }] },
      { ...validSnapshot.drawer2.competitorSalesBasis, competitorRatioBySize: { '250': '60' } },
    ]
    for (const competitorSalesBasis of invalidBasisList) {
      const broken = {
        ...validSnapshot,
        drawer2: {
          ...validSnapshot.drawer2,
          competitorSalesBasis,
        },
      }
      expect(() => parseOrderSnapshot(broken)).toThrow(/competitorSalesBasis/)
    }
  })

  it('throws when sizeRows row fields have invalid types', () => {
    const [row] = validSnapshot.drawer2.sizeRows
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
          sizeRows: [invalidRow],
        },
      }
      expect(() => parseOrderSnapshot(broken)).toThrow(/sizeRows/)
    }
  })

  it('preserves internally odd business values for the screen to surface', () => {
    const internallyOdd = {
      ...validSnapshot,
      drawer2: {
        ...validSnapshot.drawer2,
        stockInputs: { ...validSnapshot.drawer2.stockInputs, dailyMean: -1 },
        sizeRows: [{ ...validSnapshot.drawer2.sizeRows[0], confirmQty: -1 }],
      },
    }
    const parsed = parseOrderSnapshot(internallyOdd)
    expect(parsed.drawer2.stockInputs).toEqual(internallyOdd.drawer2.stockInputs)
    expect(parsed.drawer2.sizeRows).toEqual(internallyOdd.drawer2.sizeRows)
  })
})
