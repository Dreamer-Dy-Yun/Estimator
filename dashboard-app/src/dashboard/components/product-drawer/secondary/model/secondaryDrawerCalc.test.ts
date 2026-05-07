import { describe, expect, it } from 'vitest'
import type { ProductPrimarySummary, ProductSecondaryDetail } from '../../../../../types'
import type { CompetitorChannel } from '../secondaryDrawerTypes'
import { buildSalesKpiColumn } from '../../../../../utils/salesKpiColumn'
import { mergePrimarySecondarySizeMix } from './secondaryDrawerCalc'

const primary: ProductPrimarySummary = {
  id: 'B',
  name: 'BBBBB',
  brand: '나이키',
  category: '신발',
  productCode: 'B',
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
  id: 'B',
  competitorPrice: 110,
  competitorQty: 150,
  competitorRatioBySize: { '250': 0.7 },
}

const channel: CompetitorChannel = {
  id: 'kream',
  label: '크림',
  priceSkew: 1.1,
  qtySkew: 0.5,
}

describe('mergePrimarySecondarySizeMix', () => {
  it('merges competitor ratio by size and defaults to 1', () => {
    const rows = mergePrimarySecondarySizeMix(primary, secondary)
    expect(rows).toHaveLength(2)
    expect(rows[0]?.size).toBe('250')
    expect(rows[0]?.competitorRatio).toBe(0.7)
    expect(rows[1]?.size).toBe('260')
    expect(rows[1]?.competitorRatio).toBe(1)
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

  it('builds competitor KPI with channel skew and min qty 1 (no cost/margin/fee mock)', () => {
    const tinyQtySecondary: ProductSecondaryDetail = {
      ...secondary,
      competitorQty: 0,
    }
    const tinyChannel: CompetitorChannel = {
      ...channel,
      qtySkew: 0,
      priceSkew: 1.25,
    }
    const kpi = buildSalesKpiColumn('competitor', primary, tinyQtySecondary, tinyChannel)
    expect(kpi.avgPrice).toBe(138)
    expect(kpi.qty).toBe(1)
    expect(kpi.amount).toBe(138)
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
