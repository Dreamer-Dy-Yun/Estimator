import { describe, expect, it } from 'vitest'
import { parseOrderSnapshot } from './parseOrderSnapshot'
import { validSnapshot } from './orderSnapshotTestFixtures'

describe('parseOrderSnapshot validation', () => {
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

  it('throws when context and stockOrderRequest leadTimeDays do not match', () => {
    const broken = {
      ...validSnapshot,
      drawer2: {
        ...validSnapshot.drawer2,
        stockOrderRequest: {
          ...validSnapshot.drawer2.stockOrderRequest,
          leadTimeDays: 45,
        },
      },
    }

    expect(() => parseOrderSnapshot(broken)).toThrow(/leadTimeDays/)
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

  it('throws when competitorRatioBySize values are outside 0 to 1', () => {
    const invalidBasisList = [
      { ...validSnapshot.drawer2.competitorBasis, competitorRatioBySize: { '250': -0.01 } },
      { ...validSnapshot.drawer2.competitorBasis, competitorRatioBySize: { '250': 1.01 } },
    ]
    for (const competitorBasis of invalidBasisList) {
      const broken = {
        ...validSnapshot,
        drawer2: {
          ...validSnapshot.drawer2,
          competitorBasis,
        },
      }
      expect(() => parseOrderSnapshot(broken)).toThrow(/competitorRatioBySize/)
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

  it('throws when sizeOrders share percentages are outside 0 to 100', () => {
    const [row] = validSnapshot.drawer2.sizeOrders
    const invalidRows = [
      { ...row, selfSharePct: -0.01 },
      { ...row, selfSharePct: 100.01 },
      { ...row, competitorSharePct: -0.01 },
      { ...row, competitorSharePct: 100.01 },
      { ...row, blendedSharePct: -0.01 },
      { ...row, blendedSharePct: 100.01 },
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

  it('throws when drawer2 percentage fields are outside their contract ranges', () => {
    const invalidDrawer2List = [
      { ...validSnapshot.drawer2, selfWeightPct: -0.01 },
      { ...validSnapshot.drawer2, selfWeightPct: 100.01 },
      {
        ...validSnapshot.drawer2,
        unitEconomics: { ...validSnapshot.drawer2.unitEconomics, expectedFeeRatePct: -0.01 },
      },
      {
        ...validSnapshot.drawer2,
        unitEconomics: { ...validSnapshot.drawer2.unitEconomics, expectedFeeRatePct: 100.01 },
      },
    ]
    for (const drawer2 of invalidDrawer2List) {
      const broken = {
        ...validSnapshot,
        drawer2,
      }
      expect(() => parseOrderSnapshot(broken)).toThrow(/Pct/)
    }
  })

  it('throws when confirmedTotals orderQty does not match sizeOrders confirmQty sum', () => {
    const broken = {
      ...validSnapshot,
      drawer2: {
        ...validSnapshot.drawer2,
        confirmedTotals: {
          ...validSnapshot.drawer2.confirmedTotals,
          orderQty: 11,
        },
      },
    }

    expect(() => parseOrderSnapshot(broken)).toThrow(/confirmedTotals/)
  })

  it('throws when confirmedTotals is missing from a current v2 snapshot', () => {
    const broken = {
      ...validSnapshot,
      drawer2: {
        ...validSnapshot.drawer2,
        confirmedTotals: undefined,
      },
    }

    expect(() => parseOrderSnapshot(broken)).toThrow(/confirmedTotals/)
  })

  it('allows expectedOpProfitRatePct outside 0 to 100 because profit rate may be negative or high', () => {
    for (const expectedOpProfitRatePct of [-5, 125]) {
      const withProfitRate = {
        ...validSnapshot,
        drawer2: {
          ...validSnapshot.drawer2,
          confirmedTotals: {
            ...validSnapshot.drawer2.confirmedTotals,
            expectedOpProfitRatePct,
          },
        },
      }

      expect(parseOrderSnapshot(withProfitRate).drawer2.confirmedTotals.expectedOpProfitRatePct).toBe(expectedOpProfitRatePct)
    }
  })

  it('throws when duplicate snapshot skuGroupKey fields do not match', () => {
    const drawer1Mismatch = {
      ...validSnapshot,
      drawer1: {
        ...validSnapshot.drawer1,
        summary: {
          ...validSnapshot.drawer1.summary,
          skuGroupKey: 'OTHER',
        },
      },
    }
    const competitorBasisMismatch = {
      ...validSnapshot,
      drawer2: {
        ...validSnapshot.drawer2,
        competitorBasis: {
          ...validSnapshot.drawer2.competitorBasis,
          skuGroupKey: 'OTHER',
        },
      },
    }

    expect(() => parseOrderSnapshot(drawer1Mismatch)).toThrow(/skuGroupKey/)
    expect(() => parseOrderSnapshot(competitorBasisMismatch)).toThrow(/skuGroupKey/)
  })

  it('throws when stockOrderResult display by-size arrays do not match sizeOrders length', () => {
    const display = validSnapshot.drawer2.stockOrderResult.display
    const invalidDisplays = [
      { ...display, currentStockQtyBySize: [] },
      { ...display, totalOrderBalanceBySize: [4, 5] },
      { ...display, expectedInboundOrderBalanceBySize: [] },
    ]
    for (const invalidDisplay of invalidDisplays) {
      const broken = {
        ...validSnapshot,
        drawer2: {
          ...validSnapshot.drawer2,
          stockOrderResult: {
            ...validSnapshot.drawer2.stockOrderResult,
            display: invalidDisplay,
          },
        },
      }
      expect(() => parseOrderSnapshot(broken)).toThrow(/stockOrderResult\.display/)
    }
  })

  it('preserves internally odd business values for the screen to surface', () => {
    const internallyOdd = {
      ...validSnapshot,
      drawer2: {
        ...validSnapshot.drawer2,
        stockOrderRequest: { ...validSnapshot.drawer2.stockOrderRequest, dailyMeanOverride: -1 },
        confirmedTotals: { ...validSnapshot.drawer2.confirmedTotals, orderQty: -1 },
        sizeOrders: [{ ...validSnapshot.drawer2.sizeOrders[0], confirmQty: -1 }],
      },
    }
    const parsed = parseOrderSnapshot(internallyOdd)
    expect(parsed.drawer2.stockOrderRequest).toEqual(internallyOdd.drawer2.stockOrderRequest)
    expect(parsed.drawer2.sizeOrders).toEqual(internallyOdd.drawer2.sizeOrders)
  })
})
