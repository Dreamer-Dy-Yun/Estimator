import type { CompetitorRow, OrderRow, ProductDetail, SalesRow } from '../types'

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

const selfRows: SalesRow[] = [
  { id: 'B', rank: 1, percentile: 99.8, brand: '나이키', category: '신발', type: 'B', name: 'BBBBB', avgPrice: 119000, qty: 11000, amount: 1309000000, avgCost: 97000, marginRate: 18.5, feeRate: 13, opMarginRate: 5.5, opMarginAmount: 71830000 },
  { id: 'D', rank: 2, percentile: 99.6, brand: '나이키', category: '신발', type: 'D', name: 'DDDDD', avgPrice: 119000, qty: 7500, amount: 892500000, avgCost: 87000, marginRate: 26.9, feeRate: 13, opMarginRate: 13.9, opMarginAmount: 123975000 },
  { id: 'H', rank: 3, percentile: 99.4, brand: '나이키', category: '신발', type: 'H', name: 'HHHHH', avgPrice: 149000, qty: 2500, amount: 372500000, avgCost: 115000, marginRate: 22.8, feeRate: 13, opMarginRate: 9.8, opMarginAmount: 36575000 },
  { id: 'J', rank: 4, percentile: 99.2, brand: '나이키', category: '신발', type: 'J', name: 'JJJJJ', avgPrice: 159000, qty: 1500, amount: 238500000, avgCost: 126000, marginRate: 20.8, feeRate: 13, opMarginRate: 7.8, opMarginAmount: 18495000 },
  { id: 'F', rank: 5, percentile: 99.0, brand: '나이키', category: '신발', type: 'F', name: 'FFFFF', avgPrice: 99000, qty: 5000, amount: 495000000, avgCost: 82000, marginRate: 17.2, feeRate: 13, opMarginRate: 4.2, opMarginAmount: 20650000 },
]

const competitorRows: CompetitorRow[] = [
  { id: 'A', rank: 1, percentile: 99.8, brand: '나이키', category: '신발', type: 'A', name: 'AAAAA', competitorAvgPrice: 119000, competitorQty: 10000, competitorAmount: 1190000000, selfAvgPrice: null, selfQty: null, selfAmount: null },
  { id: 'B', rank: 2, percentile: 99.6, brand: '나이키', category: '신발', type: 'B', name: 'BBBBB', competitorAvgPrice: 123000, competitorQty: 9000, competitorAmount: 1107000000, selfAvgPrice: 119000, selfQty: 11000, selfAmount: 1309000000 },
  { id: 'C', rank: 3, percentile: 99.4, brand: '나이키', category: '신발', type: 'C', name: 'CCCCC', competitorAvgPrice: 142000, competitorQty: 7500, competitorAmount: 1065000000, selfAvgPrice: null, selfQty: null, selfAmount: null },
  { id: 'D', rank: 4, percentile: 99.2, brand: '나이키', category: '신발', type: 'D', name: 'DDDDD', competitorAvgPrice: 122000, competitorQty: 7000, competitorAmount: 854000000, selfAvgPrice: 119000, selfQty: 7500, selfAmount: 892500000 },
  { id: 'H', rank: 5, percentile: 99.0, brand: '나이키', category: '신발', type: 'H', name: 'HHHHH', competitorAvgPrice: 149000, competitorQty: 3700, competitorAmount: 551300000, selfAvgPrice: 149000, selfQty: 2500, selfAmount: 372500000 },
]

const orderRows: OrderRow[] = selfRows.map((r) => ({
  id: r.id,
  rank: r.rank,
  percentile: r.percentile,
  brand: r.brand,
  category: r.category,
  type: r.type,
  name: r.name,
  dailyQty: Number((r.qty / 352).toFixed(1)),
  predictedDailyQtyUntilInbound: Number((r.qty / 333).toFixed(1)),
  predictedDailyQtyAfterInbound: Number((r.qty / 321).toFixed(1)),
  availableStock: Math.round(r.qty / 2),
  currentStock: Math.round(r.qty / 2.8),
  inboundQty: Math.round(r.qty / 7),
  safetyStock: 250,
  stockCoverDays: 170,
  safetyReachDays: 162,
  recommendedOrderQty: Math.round(r.qty / 1.7),
  confirmedOrderQty: Math.round(r.qty / 1.8),
  orderCost: r.avgCost,
  targetPrice: r.avgPrice,
  orderAmount: Math.round((r.qty / 1.8) * r.avgCost),
  expectedSales: Math.round((r.qty / 1.8) * r.avgPrice),
  expectedOpMargin: Math.round((r.qty / 1.8) * (r.avgPrice - r.avgCost) * 0.75),
}))

const details: Record<string, ProductDetail> = {
  B: {
    id: 'B',
    name: 'BBBBB',
    brand: '나이키',
    category: '신발',
    type: 'B',
    selfPrice: 119000,
    competitorPrice: 123000,
    selfQty: 11000,
    competitorQty: 9000,
    recommendedOrderQty: 6474,
    stockTrend: [
      { date: '2025-09', stock: 4300 }, { date: '2025-10', stock: 4000 }, { date: '2025-11', stock: 3500 },
      { date: '2025-12', stock: 2800 }, { date: '2026-01', stock: 2100 }, { date: '2026-02', stock: 950 }, { date: '2026-03', stock: 180 },
    ],
    sizeMix: [
      { size: '235', selfRatio: 9, competitorRatio: 9, confirmedQty: 540 },
      { size: '240', selfRatio: 11, competitorRatio: 11, confirmedQty: 660 },
      { size: '245', selfRatio: 10, competitorRatio: 10, confirmedQty: 600 },
      { size: '250', selfRatio: 7, competitorRatio: 7, confirmedQty: 420 },
      { size: '255', selfRatio: 3, competitorRatio: 3, confirmedQty: 180 },
      { size: '260', selfRatio: 13, competitorRatio: 13, confirmedQty: 780 },
      { size: '265', selfRatio: 15, competitorRatio: 15, confirmedQty: 900 },
      { size: '270', selfRatio: 14, competitorRatio: 14, confirmedQty: 840 },
      { size: '275', selfRatio: 11, competitorRatio: 11, confirmedQty: 660 },
      { size: '280', selfRatio: 7, competitorRatio: 7, confirmedQty: 420 },
    ],
  },
}

export const api = {
  getSelfSales: async () => { await sleep(80); return selfRows },
  getCompetitorSales: async () => { await sleep(80); return competitorRows },
  getOrderSimulation: async () => { await sleep(80); return orderRows },
  getProductDetail: async (id: string) => {
    await sleep(80)
    return details[id] ?? details.B
  },
}
