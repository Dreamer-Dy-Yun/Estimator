import { describe, expect, it } from 'vitest'
import type { ProductPrimarySummary, ProductSecondaryDetail } from '../../../../../types'
import { buildSalesKpiColumn } from '../../../../../utils/salesKpiColumn'
import { mergePrimarySecondarySizeMix } from './secondaryDrawerCalc'

const primary: ProductPrimarySummary = {
  skuGroupKey: 'B__010',
  productName: 'BBBBB',
  brand: '나이키',
  category: '신발',
  code: 'B',
  colorCode: '010',
  price: 100,
  qty: 200,
  availableStock: 80,
  recommendedOrderQty: 120,
  monthlySalesTrend: [{ date: '2026-01', sales: 1000, isForecast: false }],
  seasonality: [{ month: 1, ratio: 1 }],
  sizeMix: [
    { size: '250', ratio: 0.5, confirmedQty: 60, avgPrice: 100, qty: 100, availableStock: 40 },
    { size: '260', ratio: 0.5, confirmedQty: 60, avgPrice: 100, qty: 100, availableStock: 40 },
  ],
}

const secondary: ProductSecondaryDetail = {
  skuGroupKey: 'B__010',
  competitorPrice: 110,
  competitorQty: 150,
  competitorRatioBySize: { '250': 0.7 },
}
const completeSecondary: ProductSecondaryDetail = {
  ...secondary,
  competitorRatioBySize: { '250': 0.7, '260': 0.3 },
}

const channel = {
  id: 'kream',
  label: '크림',
  priceSkew: 1.1,
  qtySkew: 0.5,
}

describe('mergePrimarySecondarySizeMix', () => {
  it('merges competitor ratio by size without fallback defaults', () => {
    const rows = mergePrimarySecondarySizeMix(primary, completeSecondary)
    expect(rows).toHaveLength(2)
    expect(rows[0]?.size).toBe('250')
    expect(rows[0]?.competitorRatio).toBe(0.7)
    expect(rows[1]?.size).toBe('260')
    expect(rows[1]?.competitorRatio).toBe(0.3)
  })

  it('throws instead of dropping rows when competitor ratio is missing', () => {
    expect(() => mergePrimarySecondarySizeMix(primary, secondary)).toThrow(
      'Missing competitorRatioBySize for size "260".',
    )
  })
})

describe('buildSalesKpiColumn', () => {
  it('builds self KPI from primary values', () => {
    const kpi = buildSalesKpiColumn('self', primary, secondary, channel)
    expect(kpi.avgPrice).toBe(100)
    expect(kpi.qty).toBe(200)
    expect(kpi.amount).toBe(20000)
    expect(kpi.avgCost).toBe(78)
    expect(kpi.grossMarginPerUnit).toBe(22)
    expect(kpi.feePerUnit).toBe(13)
    expect(kpi.opMarginPerUnit).toBe(9)
    expect(kpi.feeRatePct).toBe(13)
    expect(kpi.opMarginRatePct).toBeCloseTo(9, 6)
    expect(kpi.costRatioPct).toBeCloseTo(78, 6)
  })

  it('builds competitor KPI with channel skew without forcing a minimum quantity', () => {
    const tinyQtySecondary: ProductSecondaryDetail = {
      ...secondary,
      competitorQty: 0,
    }
    const tinyChannel = {
      ...channel,
      qtySkew: 0,
      priceSkew: 1.25,
    }
    const kpi = buildSalesKpiColumn('competitor', primary, tinyQtySecondary, tinyChannel)
    expect(kpi.avgPrice).toBe(138)
    expect(kpi.qty).toBe(0)
    expect(kpi.amount).toBe(0)
    expect(kpi.avgCost).toBeNull()
    expect(kpi.grossMarginPerUnit).toBeNull()
    expect(kpi.feePerUnit).toBeNull()
    expect(kpi.opMarginPerUnit).toBeNull()
    expect(kpi.costRatioPct).toBeNull()
  })

  it('produces stable rank range for same seed', () => {
    const a = buildSalesKpiColumn('self', primary, secondary, channel)
    const b = buildSalesKpiColumn('self', primary, secondary, channel)
    expect(a.qtyRank).toBe(b.qtyRank)
    expect(a.amountRank).toBe(b.amountRank)
    expect(a.qtyRank).toBeGreaterThanOrEqual(1)
    expect(a.qtyRank).toBeLessThanOrEqual(28)
    expect(a.amountRank).toBeGreaterThanOrEqual(1)
    expect(a.amountRank).toBeLessThanOrEqual(28)
  })
})
