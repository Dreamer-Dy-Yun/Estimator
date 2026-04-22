import type {
  CompetitorSalesRow,
  MonthlySalesPoint,
  ProductPrimarySummary,
  ProductSecondaryDetail,
  SelfSalesRow,
} from '../types'
import type {
  AppendCandidateItemPayload,
  UpdateCandidateItemPayload,
  CandidateItemDetail,
  CandidateItemSummary,
  CandidateStashSummary,
  CreateCandidateStashPayload,
  UpdateCandidateStashPayload,
  CompetitorSalesParams,
  ProductDrawerBundleParams,
  ProductSecondaryDetailParams,
  SecondaryCompetitorChannel,
  SecondaryStockOrderCalcParams,
  SecondaryStockOrderCalcResult,
  SecondaryDailyTrendParams,
  SecondaryDailyTrendPoint,
  SecondaryLlmAnswerParams,
  SecondaryOrderSnapshotPayload,
} from './types'
import { DAILY_TREND_AS_OF_DATE } from './dailyTrendAsOf'
import { ORDER_SNAPSHOT_SCHEMA_VERSION } from '../snapshot/orderSnapshotTypes'

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

const logApiCalled = (message: string) => {
  if (typeof console === 'undefined') return
  console.info(`[API CALLED] ${message}`)
}
const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v))
const SNAPSHOT_STORAGE_KEY = 'dashboard.orderSnapshots.v1'
const CANDIDATE_STASH_STORAGE_KEY = 'dashboard.candidateStashes.v1'
const CANDIDATE_ITEM_STORAGE_KEY = 'dashboard.candidateItems.v2'

function hashRank(seed: string, mod: number): number {
  let h = 0
  for (let i = 0; i < seed.length; i += 1) h = (h * 31 + seed.charCodeAt(i)) >>> 0
  return (h % mod) + 1
}

function buildMockSalesKpiColumn(
  kind: 'self' | 'competitor',
  primary: ProductPrimarySummary,
  secondary: ProductSecondaryDetail,
  channel: SecondaryCompetitorChannel,
) {
  const price =
    kind === 'self'
      ? primary.price
      : Math.round(secondary.competitorPrice * channel.priceSkew)
  const qty =
    kind === 'self'
      ? primary.qty
      : Math.max(1, Math.round(secondary.competitorQty * channel.qtySkew))
  const amount = Math.round(price * qty)
  const avgCost = kind === 'self'
    ? Math.round(price * 0.78)
    : Math.round(price * 0.8)
  const grossMarginPerUnit = price - avgCost
  const feeRatePct = 13
  const feePerUnit = Math.round(price * (feeRatePct / 100))
  const opMarginPerUnit = grossMarginPerUnit - feePerUnit
  const opMarginRatePct = price > 0 ? (opMarginPerUnit / price) * 100 : 0
  const costRatioPct = price > 0 ? (avgCost / price) * 100 : 0
  const qtyRank = hashRank(`${primary.id}-${kind}-qty`, 28)
  const amountRank = hashRank(`${primary.id}-${kind}-amt`, 28)
  return {
    avgPrice: price,
    qty,
    amount,
    avgCost,
    grossMarginPerUnit,
    feePerUnit,
    feeRatePct,
    opMarginPerUnit,
    opMarginRatePct,
    costRatioPct,
    qtyRank,
    amountRank,
  }
}

type CandidateStashRecord = {
  uuid: string
  name: string
  note: string | null
  productId: string
  dbCreatedAt: string
  dbUpdatedAt: string
}

type CandidateItemRecord = {
  uuid: string
  stashUuid: string
  skuUuid: string
  details: SecondaryOrderSnapshotPayload
  dbCreatedAt: string
  dbUpdatedAt: string
}

const seededCandidateStashes: CandidateStashRecord[] = [
  {
    uuid: 'candidatestash00000000000000000001',
    name: '기본 후보군 A',
    note: '초기 목업 데이터',
    productId: 'B',
    dbCreatedAt: '2026-04-20T09:00:00.000Z',
    dbUpdatedAt: '2026-04-20T09:00:00.000Z',
  },
  {
    uuid: 'candidatestash00000000000000000002',
    name: '봄 시즌 후보군',
    note: '가격 민감도 높은 구성',
    productId: 'B',
    dbCreatedAt: '2026-04-20T10:30:00.000Z',
    dbUpdatedAt: '2026-04-20T10:30:00.000Z',
  },
  {
    uuid: 'candidatestash00000000000000000003',
    name: '기본 후보군 D',
    note: '의류 카테고리 기본안',
    productId: 'D',
    dbCreatedAt: '2026-04-20T11:00:00.000Z',
    dbUpdatedAt: '2026-04-20T11:00:00.000Z',
  },
  {
    uuid: 'candidatestash00000000000000000004',
    name: '기본 후보군 H',
    note: '신발 프리미엄 라인',
    productId: 'H',
    dbCreatedAt: '2026-04-20T11:20:00.000Z',
    dbUpdatedAt: '2026-04-20T11:20:00.000Z',
  },
  ...Array.from({ length: 30 }, (_, i) => {
    const idx = i + 1
    const minute = String((i * 3) % 60).padStart(2, '0')
    const hour = String(12 + Math.floor((i * 3) / 60)).padStart(2, '0')
    const createdAt = `2026-04-21T${hour}:${minute}:00.000Z`
    const updatedMinute = String((i * 3 + 2) % 60).padStart(2, '0')
    const updatedHour = String(12 + Math.floor((i * 3 + 2) / 60)).padStart(2, '0')
    const updatedAt = `2026-04-21T${updatedHour}:${updatedMinute}:00.000Z`
    const products = ['B', 'D', 'H', 'J', 'F', 'K', 'L', 'M']
    return {
      uuid: `candidate-stash-seed-${String(idx).padStart(2, '0')}`,
      name: `스크롤 테스트 후보군 ${String(idx).padStart(2, '0')}`,
      note: idx % 3 === 0 ? '스크롤/정렬/검색 검증용 샘플' : '대량 후보군 UI 검증',
      productId: products[i % products.length]!,
      dbCreatedAt: createdAt,
      dbUpdatedAt: updatedAt,
    }
  }),
]

function makeUuid32(): string {
  const chars = 'abcdef0123456789'
  let out = ''
  for (let i = 0; i < 32; i += 1) out += chars[Math.floor(Math.random() * chars.length)]!
  return out
}

function ensureCandidateSeed() {
  const stashRaw = localStorage.getItem(CANDIDATE_STASH_STORAGE_KEY)
  const itemRaw = localStorage.getItem(CANDIDATE_ITEM_STORAGE_KEY)
  if (stashRaw == null) localStorage.setItem(CANDIDATE_STASH_STORAGE_KEY, JSON.stringify(seededCandidateStashes))
  if (itemRaw == null) localStorage.setItem(CANDIDATE_ITEM_STORAGE_KEY, JSON.stringify(seededCandidateItems))
}

const secondaryCompetitorChannels: SecondaryCompetitorChannel[] = [
  { id: 'kream', label: '크림', priceSkew: 1, qtySkew: 1 },
  { id: 'naver', label: '네이버 스토어', priceSkew: 0.97, qtySkew: 1.12 },
  { id: 'musinsa', label: '무신사', priceSkew: 1.02, qtySkew: 0.88 },
]

const selfSalesRows: SelfSalesRow[] = [
  { id: 'B', rank: 1, rankPercentile: 99.8, brand: '나이키', category: '신발', productCode: 'B', name: 'BBBBB', avgPrice: 119000, qty: 11000, amount: 1309000000, avgCost: 97000, marginRate: 18.5, feeRate: 13, opMarginRate: 5.5, opMarginAmount: 71830000 },
  { id: 'D', rank: 2, rankPercentile: 99.6, brand: '아디다스', category: '의류', productCode: 'D', name: 'DDDDD', avgPrice: 119000, qty: 7500, amount: 892500000, avgCost: 87000, marginRate: 26.9, feeRate: 13, opMarginRate: 13.9, opMarginAmount: 123975000 },
  { id: 'H', rank: 3, rankPercentile: 99.4, brand: '뉴발란스', category: '신발', productCode: 'H', name: 'HHHHH', avgPrice: 149000, qty: 2500, amount: 372500000, avgCost: 115000, marginRate: 22.8, feeRate: 13, opMarginRate: 9.8, opMarginAmount: 36575000 },
  { id: 'J', rank: 4, rankPercentile: 99.2, brand: '푸마', category: '가방', productCode: 'J', name: 'JJJJJ', avgPrice: 159000, qty: 1500, amount: 238500000, avgCost: 126000, marginRate: 20.8, feeRate: 13, opMarginRate: 7.8, opMarginAmount: 18495000 },
  { id: 'F', rank: 5, rankPercentile: 99.0, brand: '나이키', category: '의류', productCode: 'F', name: 'FFFFF', avgPrice: 99000, qty: 5000, amount: 495000000, avgCost: 82000, marginRate: 17.2, feeRate: 13, opMarginRate: 4.2, opMarginAmount: 20650000 },
  { id: 'K', rank: 6, rankPercentile: 98.8, brand: '아식스', category: '신발', productCode: 'K', name: 'KKKKK', avgPrice: 129000, qty: 6200, amount: 799800000, avgCost: 101000, marginRate: 21.7, feeRate: 13, opMarginRate: 8.7, opMarginAmount: 69582600 },
  { id: 'L', rank: 7, rankPercentile: 98.6, brand: '푸마', category: '의류', productCode: 'L', name: 'LLLLL', avgPrice: 89000, qty: 8400, amount: 747600000, avgCost: 69000, marginRate: 22.5, feeRate: 13, opMarginRate: 9.5, opMarginAmount: 71022000 },
  { id: 'M', rank: 8, rankPercentile: 98.4, brand: '나이키', category: '가방', productCode: 'M', name: 'MMMMM', avgPrice: 139000, qty: 3300, amount: 458700000, avgCost: 109000, marginRate: 21.6, feeRate: 13, opMarginRate: 8.6, opMarginAmount: 39448200 },
  { id: 'N', rank: 9, rankPercentile: 98.2, brand: '아디다스', category: '신발', productCode: 'N', name: 'NNNNN', avgPrice: 125000, qty: 5900, amount: 737500000, avgCost: 98000, marginRate: 21.6, feeRate: 13, opMarginRate: 8.6, opMarginAmount: 63425000 },
  { id: 'P', rank: 10, rankPercentile: 98.0, brand: '뉴발란스', category: '의류', productCode: 'P', name: 'PPPPP', avgPrice: 105000, qty: 6800, amount: 714000000, avgCost: 82000, marginRate: 21.9, feeRate: 13, opMarginRate: 8.9, opMarginAmount: 63546000 },
  { id: 'Q', rank: 11, rankPercentile: 97.8, brand: '나이키', category: '신발', productCode: 'Q', name: 'QQQQQ', avgPrice: 132000, qty: 5200, amount: 686400000, avgCost: 103000, marginRate: 22.0, feeRate: 13, opMarginRate: 9.0, opMarginAmount: 61776000 },
  { id: 'R', rank: 12, rankPercentile: 97.6, brand: '아식스', category: '가방', productCode: 'R', name: 'RRRRR', avgPrice: 98000, qty: 4300, amount: 421400000, avgCost: 76000, marginRate: 22.4, feeRate: 13, opMarginRate: 9.4, opMarginAmount: 39611600 },
  { id: 'S', rank: 13, rankPercentile: 97.4, brand: '푸마', category: '신발', productCode: 'S', name: 'SSSSS', avgPrice: 119000, qty: 4700, amount: 559300000, avgCost: 93000, marginRate: 21.8, feeRate: 13, opMarginRate: 8.8, opMarginAmount: 49218400 },
  { id: 'T', rank: 14, rankPercentile: 97.2, brand: '아디다스', category: '가방', productCode: 'T', name: 'TTTTT', avgPrice: 112000, qty: 3600, amount: 403200000, avgCost: 87000, marginRate: 22.3, feeRate: 13, opMarginRate: 9.3, opMarginAmount: 37497600 },
  { id: 'U', rank: 15, rankPercentile: 97.0, brand: '뉴발란스', category: '의류', productCode: 'U', name: 'UUUUU', avgPrice: 94000, qty: 7900, amount: 742600000, avgCost: 73000, marginRate: 22.3, feeRate: 13, opMarginRate: 9.3, opMarginAmount: 69061800 },
  { id: 'V', rank: 16, rankPercentile: 96.8, brand: '나이키', category: '가방', productCode: 'V', name: 'VVVVV', avgPrice: 146000, qty: 2800, amount: 408800000, avgCost: 114000, marginRate: 21.9, feeRate: 13, opMarginRate: 8.9, opMarginAmount: 36383200 },
  { id: 'W', rank: 17, rankPercentile: 96.6, brand: '아식스', category: '의류', productCode: 'W', name: 'WWWWW', avgPrice: 91000, qty: 6100, amount: 555100000, avgCost: 71000, marginRate: 22.0, feeRate: 13, opMarginRate: 9.0, opMarginAmount: 49959000 },
  { id: 'X', rank: 18, rankPercentile: 96.4, brand: '푸마', category: '가방', productCode: 'X', name: 'XXXXX', avgPrice: 121000, qty: 4100, amount: 496100000, avgCost: 95000, marginRate: 21.5, feeRate: 13, opMarginRate: 8.5, opMarginAmount: 42168500 },
  { id: 'Y', rank: 19, rankPercentile: 96.2, brand: '아디다스', category: '신발', productCode: 'Y', name: 'YYYYY', avgPrice: 136000, qty: 5400, amount: 734400000, avgCost: 106000, marginRate: 22.1, feeRate: 13, opMarginRate: 9.1, opMarginAmount: 66830400 },
  { id: 'Z', rank: 20, rankPercentile: 96.0, brand: '뉴발란스', category: '가방', productCode: 'Z', name: 'ZZZZZ', avgPrice: 108000, qty: 3900, amount: 421200000, avgCost: 84000, marginRate: 22.2, feeRate: 13, opMarginRate: 9.2, opMarginAmount: 38750400 },
  { id: 'AA', rank: 21, rankPercentile: 95.8, brand: '나이키', category: '의류', productCode: 'AA', name: 'AAAAA-2', avgPrice: 101000, qty: 7300, amount: 737300000, avgCost: 79000, marginRate: 21.8, feeRate: 13, opMarginRate: 8.8, opMarginAmount: 64882400 },
  { id: 'AB', rank: 22, rankPercentile: 95.6, brand: '아식스', category: '신발', productCode: 'AB', name: 'ABBBB', avgPrice: 124000, qty: 4900, amount: 607600000, avgCost: 97000, marginRate: 21.8, feeRate: 13, opMarginRate: 8.8, opMarginAmount: 53468800 },
  { id: 'AC', rank: 23, rankPercentile: 95.4, brand: '푸마', category: '의류', productCode: 'AC', name: 'ACCCC', avgPrice: 93000, qty: 5600, amount: 520800000, avgCost: 72000, marginRate: 22.6, feeRate: 13, opMarginRate: 9.6, opMarginAmount: 49996800 },
  { id: 'AD', rank: 24, rankPercentile: 95.2, brand: '아디다스', category: '가방', productCode: 'AD', name: 'ADDDD', avgPrice: 116000, qty: 4400, amount: 510400000, avgCost: 90000, marginRate: 22.4, feeRate: 13, opMarginRate: 9.4, opMarginAmount: 47977600 },
  { id: 'AE', rank: 25, rankPercentile: 95.0, brand: '뉴발란스', category: '신발', productCode: 'AE', name: 'AEEEE', avgPrice: 141000, qty: 3000, amount: 423000000, avgCost: 110000, marginRate: 22.0, feeRate: 13, opMarginRate: 9.0, opMarginAmount: 38070000 },
]

const competitorSalesRows: CompetitorSalesRow[] = [
  { id: 'A', rank: 1, rankPercentile: 99.8, brand: '아식스', category: '신발', productCode: 'A', name: 'AAAAA', competitorAvgPrice: 119000, competitorQty: 10000, competitorAmount: 1190000000, selfAvgPrice: null, selfQty: null, selfAmount: null },
  { id: 'B', rank: 2, rankPercentile: 99.6, brand: '나이키', category: '신발', productCode: 'B', name: 'BBBBB', competitorAvgPrice: 123000, competitorQty: 9000, competitorAmount: 1107000000, selfAvgPrice: 119000, selfQty: 11000, selfAmount: 1309000000 },
  { id: 'C', rank: 3, rankPercentile: 99.4, brand: '뉴발란스', category: '가방', productCode: 'C', name: 'CCCCC', competitorAvgPrice: 142000, competitorQty: 7500, competitorAmount: 1065000000, selfAvgPrice: null, selfQty: null, selfAmount: null },
  { id: 'D', rank: 4, rankPercentile: 99.2, brand: '아디다스', category: '의류', productCode: 'D', name: 'DDDDD', competitorAvgPrice: 122000, competitorQty: 7000, competitorAmount: 854000000, selfAvgPrice: 119000, selfQty: 7500, selfAmount: 892500000 },
  { id: 'H', rank: 5, rankPercentile: 99.0, brand: '뉴발란스', category: '신발', productCode: 'H', name: 'HHHHH', competitorAvgPrice: 149000, competitorQty: 3700, competitorAmount: 551300000, selfAvgPrice: 149000, selfQty: 2500, selfAmount: 372500000 },
  { id: 'K', rank: 6, rankPercentile: 98.8, brand: '아식스', category: '신발', productCode: 'K', name: 'KKKKK', competitorAvgPrice: 132000, competitorQty: 5900, competitorAmount: 778800000, selfAvgPrice: 129000, selfQty: 6200, selfAmount: 799800000 },
  { id: 'L', rank: 7, rankPercentile: 98.6, brand: '푸마', category: '의류', productCode: 'L', name: 'LLLLL', competitorAvgPrice: 92000, competitorQty: 7900, competitorAmount: 726800000, selfAvgPrice: 89000, selfQty: 8400, selfAmount: 747600000 },
  { id: 'M', rank: 8, rankPercentile: 98.4, brand: '나이키', category: '가방', productCode: 'M', name: 'MMMMM', competitorAvgPrice: 143000, competitorQty: 3100, competitorAmount: 443300000, selfAvgPrice: 139000, selfQty: 3300, selfAmount: 458700000 },
  { id: 'N', rank: 9, rankPercentile: 98.2, brand: '아디다스', category: '신발', productCode: 'N', name: 'NNNNN', competitorAvgPrice: 128000, competitorQty: 5600, competitorAmount: 716800000, selfAvgPrice: 125000, selfQty: 5900, selfAmount: 737500000 },
  { id: 'P', rank: 10, rankPercentile: 98.0, brand: '뉴발란스', category: '의류', productCode: 'P', name: 'PPPPP', competitorAvgPrice: 109000, competitorQty: 6400, competitorAmount: 697600000, selfAvgPrice: 105000, selfQty: 6800, selfAmount: 714000000 },
  { id: 'Q', rank: 11, rankPercentile: 97.8, brand: '나이키', category: '신발', productCode: 'Q', name: 'QQQQQ', competitorAvgPrice: 136000, competitorQty: 5000, competitorAmount: 680000000, selfAvgPrice: 132000, selfQty: 5200, selfAmount: 686400000 },
  { id: 'R', rank: 12, rankPercentile: 97.6, brand: '아식스', category: '가방', productCode: 'R', name: 'RRRRR', competitorAvgPrice: 101000, competitorQty: 4000, competitorAmount: 404000000, selfAvgPrice: 98000, selfQty: 4300, selfAmount: 421400000 },
  { id: 'S', rank: 13, rankPercentile: 97.4, brand: '푸마', category: '신발', productCode: 'S', name: 'SSSSS', competitorAvgPrice: 123000, competitorQty: 4500, competitorAmount: 553500000, selfAvgPrice: 119000, selfQty: 4700, selfAmount: 559300000 },
  { id: 'T', rank: 14, rankPercentile: 97.2, brand: '아디다스', category: '가방', productCode: 'T', name: 'TTTTT', competitorAvgPrice: 115000, competitorQty: 3500, competitorAmount: 402500000, selfAvgPrice: 112000, selfQty: 3600, selfAmount: 403200000 },
  { id: 'U', rank: 15, rankPercentile: 97.0, brand: '뉴발란스', category: '의류', productCode: 'U', name: 'UUUUU', competitorAvgPrice: 97000, competitorQty: 7600, competitorAmount: 737200000, selfAvgPrice: 94000, selfQty: 7900, selfAmount: 742600000 },
  { id: 'V', rank: 16, rankPercentile: 96.8, brand: '나이키', category: '가방', productCode: 'V', name: 'VVVVV', competitorAvgPrice: 150000, competitorQty: 2700, competitorAmount: 405000000, selfAvgPrice: 146000, selfQty: 2800, selfAmount: 408800000 },
  { id: 'W', rank: 17, rankPercentile: 96.6, brand: '아식스', category: '의류', productCode: 'W', name: 'WWWWW', competitorAvgPrice: 95000, competitorQty: 5900, competitorAmount: 560500000, selfAvgPrice: 91000, selfQty: 6100, selfAmount: 555100000 },
  { id: 'X', rank: 18, rankPercentile: 96.4, brand: '푸마', category: '가방', productCode: 'X', name: 'XXXXX', competitorAvgPrice: 124000, competitorQty: 3900, competitorAmount: 483600000, selfAvgPrice: 121000, selfQty: 4100, selfAmount: 496100000 },
  { id: 'Y', rank: 19, rankPercentile: 96.2, brand: '아디다스', category: '신발', productCode: 'Y', name: 'YYYYY', competitorAvgPrice: 139000, competitorQty: 5200, competitorAmount: 722800000, selfAvgPrice: 136000, selfQty: 5400, selfAmount: 734400000 },
  { id: 'Z', rank: 20, rankPercentile: 96.0, brand: '뉴발란스', category: '가방', productCode: 'Z', name: 'ZZZZZ', competitorAvgPrice: 111000, competitorQty: 3700, competitorAmount: 410700000, selfAvgPrice: 108000, selfQty: 3900, selfAmount: 421200000 },
  { id: 'AA', rank: 21, rankPercentile: 95.8, brand: '나이키', category: '의류', productCode: 'AA', name: 'AAAAA-2', competitorAvgPrice: 104000, competitorQty: 7000, competitorAmount: 728000000, selfAvgPrice: 101000, selfQty: 7300, selfAmount: 737300000 },
  { id: 'AB', rank: 22, rankPercentile: 95.6, brand: '아식스', category: '신발', productCode: 'AB', name: 'ABBBB', competitorAvgPrice: 128000, competitorQty: 4700, competitorAmount: 601600000, selfAvgPrice: 124000, selfQty: 4900, selfAmount: 607600000 },
  { id: 'AC', rank: 23, rankPercentile: 95.4, brand: '푸마', category: '의류', productCode: 'AC', name: 'ACCCC', competitorAvgPrice: 96000, competitorQty: 5400, competitorAmount: 518400000, selfAvgPrice: 93000, selfQty: 5600, selfAmount: 520800000 },
  { id: 'AD', rank: 24, rankPercentile: 95.2, brand: '아디다스', category: '가방', productCode: 'AD', name: 'ADDDD', competitorAvgPrice: 119000, competitorQty: 4200, competitorAmount: 499800000, selfAvgPrice: 116000, selfQty: 4400, selfAmount: 510400000 },
  { id: 'AE', rank: 25, rankPercentile: 95.0, brand: '뉴발란스', category: '신발', productCode: 'AE', name: 'AEEEE', competitorAvgPrice: 145000, competitorQty: 2800, competitorAmount: 406000000, selfAvgPrice: 141000, selfQty: 3000, selfAmount: 423000000 },
]

const selfById = Object.fromEntries(selfSalesRows.map((row) => [row.id, row]))
const competitorById = Object.fromEntries(competitorSalesRows.map((row) => [row.id, row]))

const SALES_MONTHS: string[] = (() => {
  const months: string[] = []
  for (let y = 2024; y <= 2026; y += 1) {
    for (let m = 1; m <= 12; m += 1) {
      if (y === 2024 && m < 7) continue
      if (y === 2026 && m > 6) continue
      months.push(`${y}-${String(m).padStart(2, '0')}`)
    }
  }
  return months
})()

const FORECAST_START_MONTH = '2026-01'

/** `2026-01`부터 연속 `count`개의 YYYY-MM 키 (예측 구간). */
const monthKeysFrom = (year: number, month: number, count: number): string[] => {
  const out: string[] = []
  let y = year
  let m = month
  for (let i = 0; i < count; i += 1) {
    out.push(`${y}-${String(m).padStart(2, '0')}`)
    m += 1
    if (m > 12) {
      m = 1
      y += 1
    }
  }
  return out
}

/**
 * 월간 판매추이: `SALES_MONTHS` 중 예측 시작 이전은 실적, 이후는 `forecastMonths`만큼만 예측 월 생성.
 * `forecastMonths`: 1~24 (호출부에서 클램프 권장).
 */
const makeSalesTrend = (base: number, seed: number, forecastMonths: number) => {
  const fc = Math.max(1, Math.min(24, Math.round(forecastMonths)))
  const historical = SALES_MONTHS.filter((d) => d < FORECAST_START_MONTH)
  const forecastKeys = monthKeysFrom(2026, 1, fc)
  const allDates = [...historical, ...forecastKeys]
  return allDates.map((date, idx) => {
    const trend = 0.84 + idx * 0.018
    const seasonality = 1 + Math.sin((idx + (seed % 11)) * 0.45) * 0.1
    const noise = ((seed + idx * 17) % 9) * 0.01
    return {
      date,
      sales: Math.max(80, Math.round(base * trend * seasonality * (1 + noise))),
      isForecast: date >= FORECAST_START_MONTH,
    }
  })
}

/**
 * Estimator 출력과 유사: 1~12월 비율, 합 1, 일부 월 0 가능.
 * 제품 id마다 서로 다른 베이스 프로파일 + 월별 지터 후 정규화 (예시 한 벌을 모든 SKU에 고정하지 않음).
 */
const SEASONALITY_TEMPLATES: ReadonlyArray<readonly number[]> = [
  // 겨울·연말 집중 (예시에 가까운 형태)
  [0.63, 0.13, 0.025, 0, 0.007, 0.0035, 0.0035, 0.011, 0.007, 0.025, 0.21, 0.47],
  // 여름 피크
  [0.02, 0.02, 0.04, 0.06, 0.08, 0.14, 0.22, 0.2, 0.12, 0.06, 0.03, 0.02],
  // 봄 (3~5월)
  [0.05, 0.06, 0.14, 0.22, 0.18, 0.1, 0.06, 0.05, 0.04, 0.04, 0.05, 0.06],
  // 가을 (9~11월)
  [0.07, 0.06, 0.05, 0.04, 0.04, 0.05, 0.06, 0.08, 0.14, 0.18, 0.16, 0.12],
  // 상반·하반 두 번
  [0.12, 0.1, 0.11, 0.09, 0.06, 0.04, 0.03, 0.04, 0.08, 0.1, 0.12, 0.14],
  // 초봄 + 연말
  [0.18, 0.08, 0.12, 0.1, 0.05, 0.03, 0.02, 0.02, 0.05, 0.07, 0.14, 0.19],
  // 비교적 평탄 + 약한 여름
  [0.075, 0.075, 0.08, 0.085, 0.09, 0.095, 0.11, 0.1, 0.085, 0.08, 0.075, 0.075],
  // 1·2월 + 8월 방학 류
  [0.22, 0.15, 0.04, 0.02, 0.03, 0.05, 0.08, 0.18, 0.12, 0.06, 0.03, 0.05],
]

const hashProductId = (id: string) => [...id].reduce((acc, ch) => acc + ch.charCodeAt(0), 0)

const makeSeasonality = (id: string) => {
  const h = hashProductId(id)
  const templateIndex = h % SEASONALITY_TEMPLATES.length
  const base = SEASONALITY_TEMPLATES[templateIndex]
  const raw = base.map((v, i) => {
    const jitter = 1 + (((h + i * 13) % 19) * 0.035 - 0.28)
    return Math.max(0, v * jitter)
  })
  const sum = raw.reduce((a, b) => a + b, 0)
  if (sum <= 0) {
    return Array.from({ length: 12 }, (_, i) => ({ month: i + 1, ratio: 1 / 12 }))
  }
  return raw.map((r, i) => ({ month: i + 1, ratio: r / sum }))
}

/** 합계 `total`을 가중치 배열에 맞게 정수로 쪼갬(합이 정확히 `total`) */
const allocateByWeights = (total: number, weights: number[]): number[] => {
  if (weights.length === 0) return []
  const wsum = weights.reduce((a, b) => a + b, 0)
  if (wsum <= 0) return weights.map(() => 0)
  const exact = weights.map((w) => (total * w) / wsum)
  const floors = exact.map((x) => Math.floor(x))
  const rem = total - floors.reduce((a, b) => a + b, 0)
  const order = exact.map((x, i) => ({ i, r: x - Math.floor(x) })).sort((a, b) => b.r - a.r)
  const out = [...floors]
  for (let k = 0; k < rem; k += 1) {
    out[order[k % order.length].i] += 1
  }
  return out
}

const makeSizeMix = (
  recommendedOrderQty: number,
  productQty: number,
  productPrice: number,
  productAvailableStock: number,
  seed: number,
  category: string,
) => {
  const sizes = ['235', '240', '245', '250', '255', '260', '265', '270', '275', '280']
  // 유니섹스: 중앙(260~270) 집중 + 양끝 완만 하락(정규분포 유사)
  const ratioWeightsUnisex = [5, 7, 9, 11, 13, 14, 13, 11, 9, 7]
  // 남성 치우침: 큰 사이즈로 갈수록 비중 상승
  const ratioWeightsMale = [3, 4, 6, 8, 10, 12, 14, 15, 15, 13]
  // 여성 치우침: 작은 사이즈로 갈수록 비중 상승
  const ratioWeightsFemale = [14, 15, 15, 13, 11, 9, 7, 6, 5, 4]
  const profile = (() => {
    // 신발은 유니섹스 비율을 높이고, 그 외는 성별 치우침을 더 자주 보이게
    if (category === '신발') return seed % 5 < 3 ? 'unisex' : (seed % 2 === 0 ? 'male' : 'female')
    return seed % 3 === 0 ? 'unisex' : (seed % 2 === 0 ? 'male' : 'female')
  })()
  const ratioWeights =
    profile === 'male'
      ? ratioWeightsMale
      : profile === 'female'
        ? ratioWeightsFemale
        : ratioWeightsUnisex
  // 경쟁사 비중은 자사와 유사하지 않도록 별도 프로파일을 선택
  const competitorProfile = (() => {
    if (profile === 'unisex') return seed % 2 === 0 ? 'male' : 'female'
    if (profile === 'male') return seed % 3 === 0 ? 'unisex' : 'female'
    return seed % 3 === 0 ? 'unisex' : 'male'
  })()
  const competitorRatioWeightsBase =
    competitorProfile === 'male'
      ? ratioWeightsMale
      : competitorProfile === 'female'
        ? ratioWeightsFemale
        : ratioWeightsUnisex
  const competitorTilt = (seed % 4) - 1.5
  const mid = (sizes.length - 1) / 2
  const qtyAlloc = allocateByWeights(productQty, ratioWeights)
  const stockAlloc = allocateByWeights(productAvailableStock, ratioWeights)
  const orderAlloc = allocateByWeights(recommendedOrderQty, ratioWeights)
  return sizes.map((size, idx) => ({
    size,
    ratio: ratioWeights[idx],
    competitorRatio: Math.max(
      1,
      Math.round(
        competitorRatioWeightsBase[idx]! * (1 + (idx - mid) * competitorTilt * 0.08),
      ),
    ),
    confirmedQty: orderAlloc[idx]!,
    avgPrice: Math.round(productPrice * (1 + (idx - mid) * 0.004)),
    qty: qtyAlloc[idx]!,
    availableStock: stockAlloc[idx]!,
  }))
}

function splitPrimarySecondaryFromSizeMix(
  rows: ReturnType<typeof makeSizeMix>,
): { sizeMix: ProductPrimarySummary['sizeMix']; competitorRatioBySize: Record<string, number> } {
  const competitorRatioBySize: Record<string, number> = {}
  const sizeMix = rows.map((r) => {
    competitorRatioBySize[r.size] = r.competitorRatio
    const { competitorRatio: _, ...primaryRow } = r
    return primaryRow
  })
  return { sizeMix, competitorRatioBySize }
}

const allKnownProductIds = Array.from(new Set([...selfSalesRows, ...competitorSalesRows].map((row) => row.id)))
const brands = Array.from(new Set([...selfSalesRows, ...competitorSalesRows].map((row) => row.brand)))
const categories = Array.from(new Set([...selfSalesRows, ...competitorSalesRows].map((row) => row.category)))
const historicalMonths = SALES_MONTHS.filter((month) => month < '2026-01')

const estimatePeriodWeight = (startDate?: string, endDate?: string) => {
  if (!startDate || !endDate) return 1
  const toMonthIndex = (date: string) => {
    const [y, m] = date.split('-').map(Number)
    return y * 12 + m
  }
  const from = toMonthIndex(startDate)
  const to = toMonthIndex(endDate)
  const span = clamp(Math.abs(to - from) + 1, 1, 24)
  // 12개월 기준으로 환산 (너무 작아지지 않게 하한 적용)
  return clamp(span / 12, 0.2, 1.8)
}
const { primary: productPrimaryById, secondary: productSecondaryById } = (() => {
  const primary: Record<string, ProductPrimarySummary> = {}
  const secondary: Record<string, ProductSecondaryDetail> = {}
  for (const id of allKnownProductIds) {
    const s = selfById[id]
    const c = competitorById[id]
    const seed = id.charCodeAt(0)

    const name = s?.name ?? c?.name ?? `상품-${id}`
    const brand = s?.brand ?? c?.brand ?? '나이키'
    const category = s?.category ?? c?.category ?? '신발'
    const productCode = s?.productCode ?? c?.productCode ?? id

    const price = s?.avgPrice ?? c?.selfAvgPrice ?? Math.round((c?.competitorAvgPrice ?? 120000) * 0.96)
    const competitorPrice = c?.competitorAvgPrice ?? Math.round(price * 1.03)
    const productQty = s?.qty ?? c?.selfQty ?? Math.round((c?.competitorQty ?? 5000) * 0.85)
    const competitorQty = c?.competitorQty ?? Math.round(productQty * 0.9)
    const recommendedOrderQty = Math.round(productQty / 1.7)
    const availableStock = Math.round(productQty * 0.45)

    const fullMix = makeSizeMix(recommendedOrderQty, productQty, price, availableStock, seed, category)
    const { sizeMix, competitorRatioBySize } = splitPrimarySecondaryFromSizeMix(fullMix)

    primary[id] = {
      id,
      name,
      brand,
      category,
      productCode,
      price,
      qty: productQty,
      availableStock,
      recommendedOrderQty,
      monthlySalesTrend: makeSalesTrend(Math.max(800, Math.round(productQty * 0.42)), seed, 8),
      seasonality: makeSeasonality(id),
      sizeMix,
    }
    secondary[id] = {
      id,
      competitorPrice,
      competitorQty,
      competitorRatioBySize,
    }
  }
  return { primary, secondary }
})()

/** 후보군 목업: 품번별 요약·2차 스냅샷을 채워 브랜드 등이 리스트/드로어에 표시되도록 함 */
function buildMockOrderSnapshotForCandidate(productId: string): SecondaryOrderSnapshotPayload {
  const primary = productPrimaryById[productId] ?? productPrimaryById[allKnownProductIds[0]]!
  const secondary = productSecondaryById[productId] ?? productSecondaryById[allKnownProductIds[0]]!
  const channel = secondaryCompetitorChannels[0]!
  const selfCol = buildMockSalesKpiColumn('self', primary, secondary, channel)
  const compCol = buildMockSalesKpiColumn('competitor', primary, secondary, channel)
  const { monthlySalesTrend: _m, ...summarySansTrend } = primary
  const leadTimeDays = 30
  const stockInputs = {
    trendDailyMean: Math.max(0.1, Math.round((primary.qty / 365) * 10) / 10),
    dailyMean: Math.max(0.1, Math.round((primary.qty / 365) * 10) / 10),
    leadTimeStartDate: '2026-04-01',
    leadTimeEndDate: '2026-05-01',
    leadTimeDays,
    safetyStockMode: 'formula' as const,
    manualSafetyStock: 0,
    sigma: 12,
    serviceLevelPct: 95,
  }
  const unitPrice = Math.max(0, Math.round(summarySansTrend.price ?? primary.price))
  const unitCost = Math.max(0, Math.round(selfCol.avgCost))
  const feePerUnit = Math.max(0, Math.round(selfCol.feePerUnit))
  const opMarginPerUnit = unitPrice - unitCost - feePerUnit
  const stockDerived = {
    safetyStock: Math.max(0, Math.round(primary.availableStock * 0.2)),
    recommendedOrderQty: primary.recommendedOrderQty,
    expectedOrderAmount: Math.round(primary.recommendedOrderQty * unitCost),
    expectedSalesAmount: Math.round(primary.recommendedOrderQty * unitPrice),
    expectedOpProfit: Math.round(primary.recommendedOrderQty * opMarginPerUnit),
  }
  const sizeRows = primary.sizeMix.map((row) => {
    const rec = Math.max(1, row.confirmedQty)
    const fq = Math.max(1, Math.round(row.qty * 0.12))
    return {
      size: row.size,
      selfSharePct: 25,
      competitorSharePct: 25,
      blendedSharePct: 25,
      forecastQty: fq,
      recommendedQty: rec,
      confirmQty: rec,
    }
  })
  const savedAt = new Date().toISOString()
  const confirmedOrderQty = sizeRows.reduce((acc, row) => acc + Math.max(0, Math.round(row.confirmQty ?? 0)), 0)
  const confirmedExpectedSalesAmount = confirmedOrderQty * unitPrice
  const confirmedExpectedOpProfit = confirmedOrderQty * opMarginPerUnit
  return {
    schemaVersion: ORDER_SNAPSHOT_SCHEMA_VERSION,
    productId,
    savedAt,
    context: {
      periodStart: '2025-01-01',
      periodEnd: '2025-12-31',
      forecastMonths: 8,
      dailyTrendStartMonth: '2025-01',
      dailyTrendLeadTimeDays: leadTimeDays,
    },
    drawer1: { summary: summarySansTrend },
    drawer2: {
      secondary,
      competitorChannelId: channel.id,
      competitorChannelLabel: channel.label,
      minOpMarginPct: null,
      salesSelf: selfCol,
      salesCompetitor: compCol,
      stockInputs,
      stockDerived,
      selfWeightPct: 50,
      sizeForecastSource: 'forecastQty',
      bufferStock: 0,
      llmPrompt: '',
      llmAnswer: '',
      confirmedTotals: {
        orderQty: confirmedOrderQty,
        expectedSalesAmount: confirmedExpectedSalesAmount,
        expectedOpProfit: confirmedExpectedOpProfit,
        expectedOpProfitRatePct: confirmedExpectedSalesAmount > 0
          ? (confirmedExpectedOpProfit / confirmedExpectedSalesAmount) * 100
          : null,
      },
      sizeRows,
    },
  }
}

const seededCandidateItems: CandidateItemRecord[] = [
  {
    uuid: 'candidateitem000000000000000000001',
    stashUuid: 'candidatestash00000000000000000001',
    skuUuid: 'B',
    details: buildMockOrderSnapshotForCandidate('B'),
    dbCreatedAt: '2026-04-20T09:10:00.000Z',
    dbUpdatedAt: '2026-04-20T09:10:00.000Z',
  },
  /** 기본 후보군 A — 목록·스크롤·정렬 확인용 추가 행 */
  ...(
    [
      ['005', 'D', '09:12:00.000Z', '09:13:00.000Z'],
      ['006', 'H', '09:14:00.000Z', '09:15:30.000Z'],
      ['007', 'J', '09:16:00.000Z', '09:16:00.000Z'],
      ['008', 'F', '09:18:00.000Z', '09:19:00.000Z'],
      ['009', 'K', '09:20:00.000Z', '09:21:00.000Z'],
      ['010', 'L', '09:22:00.000Z', '09:22:00.000Z'],
      ['011', 'M', '09:24:00.000Z', '09:25:10.000Z'],
      ['012', 'B', '09:26:00.000Z', '09:27:00.000Z'],
    ] as const
  ).map(([suffix, pid, created, updated]) => ({
    uuid: `candidateitem000000000000000000${suffix}`,
    stashUuid: 'candidatestash00000000000000000001',
    skuUuid: pid,
    details: buildMockOrderSnapshotForCandidate(pid),
    dbCreatedAt: `2026-04-20T${created}`,
    dbUpdatedAt: `2026-04-20T${updated}`,
  })),
  {
    uuid: 'candidateitem000000000000000000002',
    stashUuid: 'candidatestash00000000000000000002',
    skuUuid: 'B',
    details: buildMockOrderSnapshotForCandidate('B'),
    dbCreatedAt: '2026-04-20T10:40:00.000Z',
    dbUpdatedAt: '2026-04-20T10:40:00.000Z',
  },
  {
    uuid: 'candidateitem000000000000000000003',
    stashUuid: 'candidatestash00000000000000000003',
    skuUuid: 'D',
    details: buildMockOrderSnapshotForCandidate('D'),
    dbCreatedAt: '2026-04-20T11:10:00.000Z',
    dbUpdatedAt: '2026-04-20T11:10:00.000Z',
  },
  {
    uuid: 'candidateitem000000000000000000004',
    stashUuid: 'candidatestash00000000000000000004',
    skuUuid: 'H',
    details: buildMockOrderSnapshotForCandidate('H'),
    dbCreatedAt: '2026-04-20T11:30:00.000Z',
    dbUpdatedAt: '2026-04-20T11:30:00.000Z',
  },
  ...Array.from({ length: 30 }, (_, i) => {
    const idx = i + 1
    const minute = String((i * 3 + 1) % 60).padStart(2, '0')
    const hour = String(12 + Math.floor((i * 3 + 1) / 60)).padStart(2, '0')
    const createdAt = `2026-04-21T${hour}:${minute}:00.000Z`
    const products = ['B', 'D', 'H', 'J', 'F', 'K', 'L', 'M'] as const
    const pid = products[i % products.length]!
    return {
      uuid: `candidate-item-seed-${String(idx).padStart(2, '0')}`,
      stashUuid: `candidate-stash-seed-${String(idx).padStart(2, '0')}`,
      skuUuid: pid,
      details: buildMockOrderSnapshotForCandidate(pid),
      dbCreatedAt: createdAt,
      dbUpdatedAt: createdAt,
    }
  }),
]

const stockTrendById: Record<string, Array<{
  date: string
  stock: number
  inboundExpected: number
  inboundQty: number
}>> = Object.fromEntries(allKnownProductIds.map((id) => {
  const d = productPrimaryById[id]
  const seed = id.charCodeAt(0)
  /** 이 SKU 기준 입고 주기(월): 3 또는 4 */
  const inboundCycleMonths = 3 + (seed % 2)
  const warm = d.monthlySalesTrend.slice(0, Math.min(24, d.monthlySalesTrend.length))
  const avgMonthlySales = warm.reduce((a, p) => a + p.sales, 0) / Math.max(1, warm.length)
  /** 전기간 재고 계산용 입고 사이클(표시 노출은 미래 구간만) */
  let monthsUntilInbound = (seed * 5 + id.length) % inboundCycleMonths
  /** 월말 재고: 전월말 + 당월 입고(특정 시점 반영) − 당월 판매 소진 */
  let stock = Math.max(
    200,
    Math.round(avgMonthlySales * (0.9 + (seed % 6) * 0.12)),
  )

  const series = d.monthlySalesTrend.map((point) => {
    const sold = Math.max(1, Math.round(point.sales * (0.88 + (seed % 3) * 0.02)))
    let inbound = 0
    let inboundForDisplay = 0
    if (monthsUntilInbound <= 0) {
      /** 기존 재고를 반영해 부족분만 보충: 목표 월말 재고 - (입고 없을 때 월말 재고) */
      const projectedEndStockWithoutInbound = Math.max(0, stock - sold)
      const targetCoverMonths = inboundCycleMonths * (0.88 + (seed % 3) * 0.05)
      const targetEndStock = Math.round(avgMonthlySales * targetCoverMonths)
      const shortage = Math.max(0, targetEndStock - projectedEndStockWithoutInbound)
      const minInbound = Math.round(avgMonthlySales * (0.35 + (seed % 4) * 0.04))
      inbound = shortage > 0 ? Math.max(shortage, minInbound) : 0
      monthsUntilInbound = inboundCycleMonths

      /** 1차 드로어: 미래 구간만 입고 예정 금액 노출 */
      if (point.isForecast && inbound > 0) {
        inboundForDisplay = inbound
      }
    }
    monthsUntilInbound -= 1
    stock = Math.max(0, stock + inbound - sold)
    return {
      date: point.date,
      stock,
      inboundExpected: inboundForDisplay,
      inboundQty: inbound,
    }
  })
  return [id, series]
}))

const DAILY_PATTERN_STEADY: readonly number[] = [
  58, 60, 57, 61, 63, 59, 56, 62, 64, 60,
  58, 57, 61, 63, 66, 64, 60, 59, 57, 62,
  65, 67, 63, 61, 60, 58, 59, 62, 64, 66,
]

const DAILY_PATTERN_UP: readonly number[] = [
  48, 50, 49, 51, 52, 50, 53, 54, 55, 56,
  54, 53, 55, 57, 58, 59, 57, 56, 58, 60,
  61, 62, 60, 59, 61, 63, 64, 65, 63, 62,
]

const DAILY_PATTERN_PEAK: readonly number[] = [
  66, 68, 70, 69, 71, 73, 72, 74, 75, 76,
  74, 73, 75, 77, 78, 79, 78, 76, 75, 77,
  79, 81, 80, 78, 77, 76, 75, 77, 79, 80,
]

const DAILY_PATTERN_FORECAST: readonly number[] = [
  62, 63, 61, 64, 65, 63, 62, 64, 66, 65,
  63, 62, 64, 65, 67, 66, 64, 63, 65, 66,
  68, 69, 67, 66, 65, 64, 65, 66, 67, 68,
]

const DAILY_PATTERN_BY_MONTH: Record<string, readonly number[]> = {
  '2024-07': DAILY_PATTERN_STEADY,
  '2024-08': DAILY_PATTERN_STEADY,
  '2024-09': DAILY_PATTERN_UP,
  '2024-10': DAILY_PATTERN_UP,
  '2024-11': DAILY_PATTERN_PEAK,
  '2024-12': DAILY_PATTERN_PEAK,
  '2025-01': DAILY_PATTERN_STEADY,
  '2025-02': DAILY_PATTERN_STEADY,
  '2025-03': DAILY_PATTERN_UP,
  '2025-04': DAILY_PATTERN_UP,
  '2025-05': DAILY_PATTERN_STEADY,
  '2025-06': DAILY_PATTERN_STEADY,
  '2025-07': DAILY_PATTERN_UP,
  '2025-08': DAILY_PATTERN_UP,
  '2025-09': DAILY_PATTERN_PEAK,
  '2025-10': DAILY_PATTERN_PEAK,
  '2025-11': DAILY_PATTERN_PEAK,
  '2025-12': DAILY_PATTERN_PEAK,
  '2026-01': DAILY_PATTERN_FORECAST,
  '2026-02': DAILY_PATTERN_FORECAST,
  '2026-03': DAILY_PATTERN_FORECAST,
  '2026-04': DAILY_PATTERN_FORECAST,
  '2026-05': DAILY_PATTERN_FORECAST,
  '2026-06': DAILY_PATTERN_FORECAST,
}

const DAILY_EXT_SALES_DELTA: readonly number[] = [0, -1, 1, 0, -1, 0, 1, -1, 0, 1]

const daysInMonth = (yyyymm: string) => {
  const [y, m] = yyyymm.split('-').map(Number)
  return new Date(y, m, 0).getDate()
}

const parseIsoDateUtc = (iso: string): Date => {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1))
}

const formatIsoDateUtc = (date: Date) => {
  const y = date.getUTCFullYear()
  const m = String(date.getUTCMonth() + 1).padStart(2, '0')
  const d = String(date.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

const zFromServiceLevelPct = (p: number): number => {
  if (p >= 99) return 2.33
  if (p >= 98) return 2.05
  if (p >= 95) return 1.65
  if (p >= 90) return 1.28
  if (p >= 85) return 1.04
  return 0.84
}

/** 조회 기간 내 월별 판매 단순 산술평균 → 일평균 판매량(EA/일). 기간 산술평균 컬럼의 μ. */
const dailyMeanSigma = (
  trend: MonthlySalesPoint[],
  periodStart: string,
  periodEnd: string,
) => {
  const a = periodStart.slice(0, 7)
  const b = periodEnd.slice(0, 7)
  const inRange = trend.filter((p) => p.date >= a && p.date <= b)
  const slice = inRange.length ? inRange : trend.slice(-6)
  if (slice.length === 0) return { dailyMean: 0, sigma: 0 }
  const dailyRates = slice.map((p) => p.sales / daysInMonth(p.date))
  const mean = dailyRates.reduce((x, y) => x + y, 0) / dailyRates.length
  const variance = dailyRates.reduce((acc, d) => acc + (d - mean) ** 2, 0) / dailyRates.length
  return { dailyMean: mean, sigma: Math.sqrt(variance) }
}

/**
 * 목업: 예측 수량연산 컬럼용 일평균(EA/일).
 * 같은 구간이라도 최근 월에 더 큰 가중을 두어 기간 단순 산술평균과 값이 갈리도록 함.
 */
const forecastDailyMeanFromModel = (
  trend: MonthlySalesPoint[],
  periodStart: string,
  periodEnd: string,
): number => {
  const a = periodStart.slice(0, 7)
  const b = periodEnd.slice(0, 7)
  const inRange = trend.filter((p) => p.date >= a && p.date <= b)
  const slice = inRange.length ? inRange : trend.slice(-6)
  if (slice.length === 0) return 0
  let wsum = 0
  let wtotal = 0
  slice.forEach((p, i) => {
    const w = (i + 1) ** 1.35
    const daily = p.sales / daysInMonth(p.date)
    wsum += daily * w
    wtotal += w
  })
  return wtotal > 0 ? wsum / wtotal : 0
}

/** 월 총 판매량에 맞춰 일별 판매 배분(합 = monthTotal). */
const dailySalesForMonth = (days: number, pattern: readonly number[], monthTotal: number): number[] => {
  if (days <= 0) return []
  const w = Array.from({ length: days }, (_, i) => pattern[i % pattern.length]!)
  const sumW = w.reduce((a, b) => a + b, 0)
  const out: number[] = []
  let acc = 0
  for (let i = 0; i < days - 1; i += 1) {
    const s = sumW > 0 ? Math.floor((monthTotal * w[i]!) / sumW) : 0
    out.push(s)
    acc += s
  }
  out.push(Math.max(0, monthTotal - acc))
  return out
}

/**
 * 일간 판매추이 목업
 * - 기준일(`DAILY_TREND_AS_OF_DATE`)까지: 실재고만(초기 재고 → 판매 차감 → 입고일에 충전). 예상 재고 막대는 0.
 * - 기준일 이후: 실재고는 판매로만 감소(입고로는 늘리지 않음). 입고분·재고 증가는 전부 예상 재고(파이프라인).
 *   판매는 실재고를 먼저 깐 뒤 예상 재고를 깜.
 */
const buildSecondaryDailyTrend = (
  monthlyTrend: MonthlySalesPoint[],
  monthlyStockTrend: Array<{
    date: string
    stock: number
    inboundExpected: number
    inboundQty?: number
  }>,
  startMonth: string,
  leadTimeDays: number,
): SecondaryDailyTrendPoint[] => {
  const full: SecondaryDailyTrendPoint[] = []
  let idx = 0
  const stockByMonth = new Map(monthlyStockTrend.map((row) => [row.date, row]))
  let physical = 0
  let pipeline = 0
  const asOf = DAILY_TREND_AS_OF_DATE

  monthlyTrend.forEach((m, monthIdx) => {
    const pattern = DAILY_PATTERN_BY_MONTH[m.date] ?? (m.isForecast ? DAILY_PATTERN_FORECAST : DAILY_PATTERN_STEADY)
    const days = daysInMonth(m.date)
    const stockRow = stockByMonth.get(m.date)
    const prevRow = monthIdx > 0 ? stockByMonth.get(monthlyTrend[monthIdx - 1]!.date) : undefined
    const inboundQ = Math.max(0, Math.round(stockRow?.inboundQty ?? stockRow?.inboundExpected ?? 0))
    const endStock = Math.max(0, Math.round(stockRow?.stock ?? 0))
    const monthTotalSales = prevRow
      ? Math.max(0, Math.round(prevRow.stock + inboundQ - endStock))
      : Math.max(0, Math.round(m.sales))

    /** 월간 stockTrend와 무관: 일간 시뮬만 월키·월 인덱스로 입고일 결정 */
    const inboundDay = (() => {
      if (inboundQ <= 0) return 0
      let h = monthIdx * 13
      for (let i = 0; i < m.date.length; i += 1) {
        h = (h + m.date.charCodeAt(i) * (i + 3)) | 0
      }
      const span = Math.max(1, days - 2)
      return Math.max(2, Math.min(days, 2 + (Math.abs(h) % span)))
    })()

    if (monthIdx === 0) {
      physical = Math.max(0, endStock - inboundQ + monthTotalSales)
    }

    const dailySales = dailySalesForMonth(days, pattern, monthTotalSales)
    const snapMonthEnd = m.date <= asOf.slice(0, 7)

    for (let i = 0; i < days; i += 1) {
      const dayNum = i + 1
      const dateStr = `${m.date}-${String(dayNum).padStart(2, '0')}`
      const isAfterAsOf = dateStr > asOf

      if (inboundQ > 0 && inboundDay > 0 && dayNum === inboundDay) {
        if (!isAfterAsOf) {
          physical += inboundQ
        } else {
          pipeline += inboundQ
        }
      }

      const sales = dailySales[i] ?? 0
      if (!isAfterAsOf) {
        physical = Math.max(0, physical - sales)
      } else {
        let need = sales
        const fromPhys = Math.min(need, physical)
        physical -= fromPhys
        need -= fromPhys
        const fromPipe = Math.min(need, pipeline)
        pipeline -= fromPipe
      }

      full.push({
        idx,
        date: dateStr,
        month: m.date,
        sales,
        stockBar: Math.max(0, Math.round(physical)),
        inboundAccumBar: isAfterAsOf ? Math.max(0, Math.round(pipeline)) : 0,
        selfSales: null,
        competitorSales: null,
        isForecast: m.isForecast,
      })
      idx += 1
    }

    if (snapMonthEnd) {
      physical = endStock
      pipeline = 0
    }
  })

  const startIdx = full.findIndex((p) => p.month >= startMonth)
  if (startIdx === -1) return []
  const out = full.slice(startIdx).map((row, i) => ({ ...row, idx: i }))
  const extendDays = Math.max(0, Math.round(leadTimeDays))
  if (extendDays <= 0 || out.length === 0) return out

  let last = out[out.length - 1]!
  let date = parseIsoDateUtc(last.date)
  let phys = last.stockBar
  let pipe = last.inboundAccumBar

  for (let i = 0; i < extendDays; i += 1) {
    date = new Date(date.getTime() + 24 * 60 * 60 * 1000)
    const nextDate = formatIsoDateUtc(date)
    const sales = Math.max(1, Math.round(last.sales + DAILY_EXT_SALES_DELTA[i % DAILY_EXT_SALES_DELTA.length]!))
    let need = sales
    const fromPhys = Math.min(need, phys)
    phys -= fromPhys
    need -= fromPhys
    const fromPipe = Math.min(need, pipe)
    pipe -= fromPipe
    need -= fromPipe

    const next = {
      idx: out.length,
      date: nextDate,
      month: nextDate.slice(0, 7),
      sales,
      stockBar: Math.max(0, Math.round(phys)),
      inboundAccumBar: Math.max(0, Math.round(pipe)),
      selfSales: null,
      competitorSales: null,
      isForecast: true,
    }
    out.push(next)
    last = next
  }

  let prevCompetitorSales = 0
  out.forEach((p, i) => {
    if (p.isForecast) {
      p.selfSales = null
      p.competitorSales = null
      return
    }
    const selfSales = Math.max(0, Math.round(p.sales))
    const lag3 = Math.max(0, Math.round(out[Math.max(0, i - 3)]?.sales ?? selfSales))
    const lag8 = Math.max(0, Math.round(out[Math.max(0, i - 8)]?.sales ?? selfSales))

    // 경쟁사(크림) 일간 트렌드: 규모는 크되(약 60배권), 자사와 다른 리듬으로 생성
    const weekly = Math.sin((i + 2) * ((2 * Math.PI) / 7)) // 7일 주기
    const biWeekly = Math.cos((i + 9) * ((2 * Math.PI) / 14)) // 14일 주기
    const monthly = Math.sin((i + 4) * ((2 * Math.PI) / 29))
    const daySeed = Number(p.date.slice(8, 10))
    // 특정 날짜대에 경쟁사 프로모션 스파이크
    const promoSpike = daySeed % 9 === 0 ? 0.32 : daySeed % 7 === 0 ? 0.18 : 0
    const noise = (((daySeed * 11 + i * 5) % 23) / 23 - 0.5) * 0.08

    const base = selfSales * 34 + lag3 * 17 + lag8 * 11
    const rhythm = 1 + weekly * 0.24 + biWeekly * 0.15 + monthly * 0.1 + promoSpike + noise
    const trendTarget = base * Math.max(0.55, rhythm)

    const competitorSales =
      prevCompetitorSales <= 0
        ? Math.max(0, Math.round(trendTarget))
        : Math.max(0, Math.round(prevCompetitorSales * 0.52 + trendTarget * 0.48))

    p.selfSales = selfSales
    p.competitorSales = competitorSales
    prevCompetitorSales = competitorSales
  })
  return out
}

export const mockDashboardApi = {
  getSelfSales: async (params?: { startDate?: string; endDate?: string; brand?: string; category?: string }) => {
    await sleep(80)
    const brand = params?.brand
    const category = params?.category
    const weighted = estimatePeriodWeight(params?.startDate, params?.endDate)

    return selfSalesRows
      .filter((row) => (brand ? row.brand === brand : true))
      .filter((row) => (category ? row.category === category : true))
      .map((row) => {
        const qty = Math.max(1, Math.round(row.qty * weighted))
        const amount = Math.max(1, Math.round(row.amount * weighted))
        const opMarginAmount = Math.max(1, Math.round(row.opMarginAmount * weighted))
        return {
          ...row,
          qty,
          amount,
          opMarginAmount,
        }
      })
  },
  getCompetitorSales: async (params?: CompetitorSalesParams) => {
    await sleep(80)
    const brand = params?.brand
    const category = params?.category
    const weighted = estimatePeriodWeight(params?.startDate, params?.endDate)
    const channel = params?.competitorChannelId
      ? secondaryCompetitorChannels.find((c) => c.id === params.competitorChannelId)
      : undefined
    const priceSkew = channel?.priceSkew ?? 1
    const qtySkew = channel?.qtySkew ?? 1

    return competitorSalesRows
      .filter((row) => (brand ? row.brand === brand : true))
      .filter((row) => (category ? row.category === category : true))
      .map((row) => {
        const compQty = Math.max(1, Math.round(row.competitorQty * weighted * qtySkew))
        const compAvg = Math.max(1, Math.round(row.competitorAvgPrice * priceSkew))
        const competitorAmount = Math.max(1, Math.round(compQty * compAvg))
        const selfQty = row.selfQty != null ? Math.max(1, Math.round(row.selfQty * weighted)) : null
        const selfAmount = row.selfAmount != null ? Math.max(1, Math.round(row.selfAmount * weighted)) : null
        return {
          ...row,
          competitorQty: compQty,
          competitorAvgPrice: compAvg,
          competitorAmount,
          selfQty,
          selfAmount,
        }
      })
  },
  getSelfSalesFilterMeta: async () => {
    await sleep(60)
    return {
      brands,
      categories,
      historicalMonths,
    }
  },
  getProductDrawerBundle: async (id: string, params?: ProductDrawerBundleParams) => {
    await sleep(80)
    const primary = productPrimaryById[id] ?? productPrimaryById[allKnownProductIds[0]]!
    const stockTrend = stockTrendById[id] ?? stockTrendById[allKnownProductIds[0]]!
    const fc = Math.max(1, Math.min(24, Math.round(params?.forecastMonths ?? 8)))
    const seed = id.charCodeAt(0)
    const base = Math.max(800, Math.round(primary.qty * 0.42))
    const summary: ProductPrimarySummary = {
      ...primary,
      monthlySalesTrend: makeSalesTrend(base, seed, fc),
    }
    return { summary, stockTrend }
  },
  getProductSecondaryDetail: async (id: string, _params?: ProductSecondaryDetailParams) => {
    await sleep(80)
    return productSecondaryById[id] ?? productSecondaryById[allKnownProductIds[0]]!
  },
  getSecondaryDailyTrend: async ({ productId, startMonth, leadTimeDays }: SecondaryDailyTrendParams) => {
    await sleep(80)
    const primary = productPrimaryById[productId] ?? productPrimaryById[allKnownProductIds[0]]!
    const stockTrend = stockTrendById[productId] ?? stockTrendById[allKnownProductIds[0]]!
    return buildSecondaryDailyTrend(primary.monthlySalesTrend, stockTrend, startMonth, leadTimeDays)
  },
  getSecondaryCompetitorChannels: async () => {
    await sleep(40)
    return secondaryCompetitorChannels
  },
  getSecondaryLlmAnswer: async (_params: SecondaryLlmAnswerParams) => {
    await sleep(180)
    return [
      '현재 설정 기준으로는 리드타임 동안 수요 변동을 감안한 안전재고 수준이 양호한 편입니다.',
      '다만 시즌 전환 구간이 겹치면 완충재고를 한 단계 낮추고, 입고 주기를 짧게 가져가는 편이 유리해 보입니다.',
      '경쟁 채널 가격이 자사 대비 높게 잡혀 있으니, 프로모션 없이도 단기 수요는 유지될 가능성이 큽니다.',
    ].join('\n')
  },
  saveSecondaryOrderSnapshot: async (snapshot: SecondaryOrderSnapshotPayload) => {
    await sleep(40)
    try {
      const raw = localStorage.getItem(SNAPSHOT_STORAGE_KEY)
      const all = (raw ? JSON.parse(raw) : {}) as Record<string, SecondaryOrderSnapshotPayload[]>
      const list = all[snapshot.productId] ?? []
      list.push(snapshot)
      all[snapshot.productId] = list
      localStorage.setItem(SNAPSHOT_STORAGE_KEY, JSON.stringify(all))
    } catch {
      /* ignore quota */
    }
  },
  getSecondaryOrderSnapshots: async (productId?: string) => {
    await sleep(40)
    try {
      const raw = localStorage.getItem(SNAPSHOT_STORAGE_KEY)
      const all = (raw ? JSON.parse(raw) : {}) as Record<string, SecondaryOrderSnapshotPayload[]>
      const list = productId
        ? (all[productId] ?? [])
        : Object.values(all).flat()
      return [...list].sort((a, b) => String(b.savedAt).localeCompare(String(a.savedAt)))
    } catch {
      return []
    }
  },
  deleteSecondaryOrderSnapshot: async (productId: string, savedAt: string) => {
    await sleep(40)
    try {
      const raw = localStorage.getItem(SNAPSHOT_STORAGE_KEY)
      const all = (raw ? JSON.parse(raw) : {}) as Record<string, SecondaryOrderSnapshotPayload[]>
      const list = all[productId] ?? []
      all[productId] = list.filter((snap) => String(snap.savedAt) !== String(savedAt))
      localStorage.setItem(SNAPSHOT_STORAGE_KEY, JSON.stringify(all))
    } catch {
      /* ignore quota */
    }
  },
  getCandidateStashes: async (productId?: string): Promise<CandidateStashSummary[]> => {
    await sleep(60)
    try {
      ensureCandidateSeed()
      const rawStashes = localStorage.getItem(CANDIDATE_STASH_STORAGE_KEY)
      const rawItems = localStorage.getItem(CANDIDATE_ITEM_STORAGE_KEY)
      const stashes = (rawStashes ? JSON.parse(rawStashes) : []) as CandidateStashRecord[]
      const items = (rawItems ? JSON.parse(rawItems) : []) as CandidateItemRecord[]
      const filtered = productId ? stashes.filter((row) => row.productId === productId) : stashes
      return filtered
        .map((row) => {
          const linkedItems = items.filter((it) => it.stashUuid === row.uuid)
          const latestItemTs = linkedItems.reduce<string>(
            (latest, it) => (String(it.dbCreatedAt) > latest ? String(it.dbCreatedAt) : latest),
            '',
          )
          const recordUpdatedAt = row.dbUpdatedAt ?? row.dbCreatedAt
          const dbUpdatedAt = latestItemTs && latestItemTs > recordUpdatedAt ? latestItemTs : recordUpdatedAt
          return {
            uuid: row.uuid,
            name: row.name,
            note: row.note ?? null,
            productId: row.productId,
            itemCount: linkedItems.length,
            dbCreatedAt: row.dbCreatedAt,
            dbUpdatedAt,
          }
        })
        .sort((a, b) => String(b.dbCreatedAt).localeCompare(String(a.dbCreatedAt)))
    } catch {
      return []
    }
  },
  getCandidateItemsByStash: async (stashUuid: string): Promise<CandidateItemSummary[]> => {
    await sleep(60)
    ensureCandidateSeed()
    const rawItems = localStorage.getItem(CANDIDATE_ITEM_STORAGE_KEY)
    const items = (rawItems ? JSON.parse(rawItems) : []) as CandidateItemRecord[]
    return items
      .filter((row) => row.stashUuid === stashUuid)
      .map((row) => {
        const productId = row.skuUuid
        const summary = row.details?.drawer1?.summary
        const drawer2 = row.details?.drawer2
        if (!summary || !drawer2) {
          throw new Error(`후보 스냅샷 누락: ${row.uuid}`)
        }
        const qty = drawer2.sizeRows.reduce((acc, r) => acc + Math.max(0, Math.round(r.confirmQty ?? 0)), 0)
        const orderAmount = drawer2.stockDerived?.expectedOrderAmount
        const expectedSalesAmount = drawer2.stockDerived?.expectedSalesAmount
        const expectedOpProfit = drawer2.stockDerived?.expectedOpProfit
        if (
          typeof orderAmount !== 'number'
          || typeof expectedSalesAmount !== 'number'
          || typeof expectedOpProfit !== 'number'
        ) {
          throw new Error(`후보 스냅샷 수치 누락: ${row.uuid}`)
        }
        return {
          uuid: row.uuid,
          stashUuid: row.stashUuid,
          productId,
          brand: summary.brand,
          productCode: summary.productCode,
          productName: summary.name,
          qty,
          orderAmount,
          expectedSalesAmount,
          expectedOpProfit,
          dbCreatedAt: row.dbCreatedAt,
          dbUpdatedAt: row.dbUpdatedAt ?? row.dbCreatedAt,
        }
      })
      .sort((a, b) => String(b.dbCreatedAt).localeCompare(String(a.dbCreatedAt)))
  },
  getCandidateItemByUuid: async (itemUuid: string): Promise<CandidateItemDetail | null> => {
    await sleep(50)
    ensureCandidateSeed()
    const rawItems = localStorage.getItem(CANDIDATE_ITEM_STORAGE_KEY)
    const items = (rawItems ? JSON.parse(rawItems) : []) as CandidateItemRecord[]
    const row = items.find((it) => it.uuid === itemUuid)
    if (!row) return null
    if (!row.details) {
      throw new Error(`후보 상세 스냅샷 누락: ${itemUuid}`)
    }
    return {
      uuid: row.uuid,
      stashUuid: row.stashUuid,
      productId: row.skuUuid,
      details: row.details,
      dbCreatedAt: row.dbCreatedAt,
      dbUpdatedAt: row.dbUpdatedAt ?? row.dbCreatedAt,
    }
  },
  deleteCandidateItem: async (itemUuid: string): Promise<void> => {
    await sleep(60)
    logApiCalled('이너 후보 삭제 API가 호출되었습니다.')
    try {
      ensureCandidateSeed()
      const rawItems = localStorage.getItem(CANDIDATE_ITEM_STORAGE_KEY)
      const rawStashes = localStorage.getItem(CANDIDATE_STASH_STORAGE_KEY)
      const items = (rawItems ? JSON.parse(rawItems) : []) as CandidateItemRecord[]
      const target = items.find((it) => it.uuid === itemUuid)
      if (!target) return
      const nextItems = items.filter((it) => it.uuid !== itemUuid)
      localStorage.setItem(CANDIDATE_ITEM_STORAGE_KEY, JSON.stringify(nextItems))
      const now = new Date().toISOString()
      const stashes = (rawStashes ? JSON.parse(rawStashes) : []) as CandidateStashRecord[]
      const nextStashes = stashes.map((s) =>
        s.uuid === target.stashUuid ? { ...s, dbUpdatedAt: now } : s,
      )
      localStorage.setItem(CANDIDATE_STASH_STORAGE_KEY, JSON.stringify(nextStashes))
    } catch {
      /* ignore */
    }
  },
  /**
   * 후보군 삭제 — 백엔드 연동 전 스텁. 네트워크 지연만 흉내 내며 저장/목록 변경 없음.
   * 실제 구현 시 HTTP 호출 + DB 삭제 반영으로 교체.
   */
  deleteCandidateStash: async (_stashUuid: string): Promise<void> => {
    await sleep(60)
    logApiCalled('후보군 삭제 API가 호출되었습니다.')
  },
  createCandidateStash: async (payload: CreateCandidateStashPayload): Promise<CandidateStashSummary> => {
    await sleep(90)
    const now = new Date().toISOString()
    const stash: CandidateStashRecord = {
      uuid: makeUuid32(),
      name: payload.name.trim() || `오더 후보군 ${now.slice(0, 10)}`,
      note: payload.note?.trim() || null,
      productId: payload.productId,
      dbCreatedAt: now,
      dbUpdatedAt: now,
    }
    try {
      ensureCandidateSeed()
      const rawStashes = localStorage.getItem(CANDIDATE_STASH_STORAGE_KEY)
      const stashes = (rawStashes ? JSON.parse(rawStashes) : []) as CandidateStashRecord[]
      stashes.push(stash)
      localStorage.setItem(CANDIDATE_STASH_STORAGE_KEY, JSON.stringify(stashes))
    } catch {
      /* ignore quota */
    }
    return {
      uuid: stash.uuid,
      name: stash.name,
      note: stash.note,
      productId: stash.productId,
      itemCount: 0,
      dbCreatedAt: stash.dbCreatedAt,
      dbUpdatedAt: stash.dbUpdatedAt,
    }
  },
  /**
   * 후보군 이름/비고 수정 — 백엔드 연동 전 스텁. 저장/목록 변경 없음.
   * 실제 구현 시 HTTP 호출 + DB 갱신 후 최신 후보군 요약을 반환.
   */
  updateCandidateStash: async (payload: UpdateCandidateStashPayload): Promise<CandidateStashSummary> => {
    await sleep(70)
    logApiCalled('후보군 이름·비고 수정 API가 호출되었습니다.')
    ensureCandidateSeed()
    const rawStashes = localStorage.getItem(CANDIDATE_STASH_STORAGE_KEY)
    const rawItems = localStorage.getItem(CANDIDATE_ITEM_STORAGE_KEY)
    const stashes = (rawStashes ? JSON.parse(rawStashes) : []) as CandidateStashRecord[]
    const items = (rawItems ? JSON.parse(rawItems) : []) as CandidateItemRecord[]
    const target = stashes.find((s) => s.uuid === payload.stashUuid)
    if (!target) {
      throw new Error('후보군을 찾을 수 없습니다.')
    }
    const linkedItems = items.filter((it) => it.stashUuid === target.uuid)
    return {
      uuid: target.uuid,
      name: target.name,
      note: target.note ?? null,
      productId: target.productId,
      itemCount: linkedItems.length,
      dbCreatedAt: target.dbCreatedAt,
      dbUpdatedAt: target.dbUpdatedAt,
    }
  },
  /**
   * 후보군 복제 — 백엔드 연동 전 스텁. 네트워크 지연만 흉내 내며 저장/목록 변경 없음.
   * 실제 구현 시 이 메서드만 HTTP 호출 + DB 반영으로 교체.
   */
  duplicateCandidateStash: async (_sourceStashUuid: string): Promise<void> => {
    await sleep(90)
    logApiCalled('후보군 복제 API가 호출되었습니다.')
  },
  appendCandidateItem: async (payload: AppendCandidateItemPayload): Promise<void> => {
    await sleep(70)
    const now = new Date().toISOString()
    const item: CandidateItemRecord = {
      uuid: makeUuid32(),
      stashUuid: payload.stashUuid,
      skuUuid: payload.productId,
      details: payload.details,
      dbCreatedAt: now,
      dbUpdatedAt: now,
    }
    try {
      ensureCandidateSeed()
      const rawStashes = localStorage.getItem(CANDIDATE_STASH_STORAGE_KEY)
      const rawItems = localStorage.getItem(CANDIDATE_ITEM_STORAGE_KEY)
      const stashes = (rawStashes ? JSON.parse(rawStashes) : []) as CandidateStashRecord[]
      const items = (rawItems ? JSON.parse(rawItems) : []) as CandidateItemRecord[]
      const dedup = items.filter((row) => !(row.stashUuid === payload.stashUuid && row.skuUuid === payload.productId))
      dedup.push(item)
      localStorage.setItem(CANDIDATE_ITEM_STORAGE_KEY, JSON.stringify(dedup))
      const nextStashes = stashes.map((row) => (
        row.uuid === payload.stashUuid ? { ...row, dbUpdatedAt: now } : row
      ))
      localStorage.setItem(CANDIDATE_STASH_STORAGE_KEY, JSON.stringify(nextStashes))
    } catch {
      /* ignore quota */
    }
  },
  updateCandidateItem: async (payload: UpdateCandidateItemPayload): Promise<void> => {
    await sleep(70)
    logApiCalled('이너 후보 변경 저장 API가 호출되었습니다.')
    const now = new Date().toISOString()
    try {
      ensureCandidateSeed()
      const rawStashes = localStorage.getItem(CANDIDATE_STASH_STORAGE_KEY)
      const rawItems = localStorage.getItem(CANDIDATE_ITEM_STORAGE_KEY)
      const stashes = (rawStashes ? JSON.parse(rawStashes) : []) as CandidateStashRecord[]
      const items = (rawItems ? JSON.parse(rawItems) : []) as CandidateItemRecord[]
      const idx = items.findIndex((row) => row.uuid === payload.itemUuid)
      if (idx === -1) return
      const prev = items[idx]!
      items[idx] = {
        ...prev,
        details: payload.details,
        dbUpdatedAt: now,
      }
      localStorage.setItem(CANDIDATE_ITEM_STORAGE_KEY, JSON.stringify(items))
      const stashUuid = prev.stashUuid
      const nextStashes = stashes.map((row) =>
        row.uuid === stashUuid ? { ...row, dbUpdatedAt: now } : row,
      )
      localStorage.setItem(CANDIDATE_STASH_STORAGE_KEY, JSON.stringify(nextStashes))
    } catch {
      /* ignore quota */
    }
  },
  getSecondaryStockOrderCalc: async ({
    productId,
    periodStart,
    periodEnd,
    serviceLevelPct,
    leadTimeDays,
    safetyStockMode,
    manualSafetyStock,
    dailyMean: dailyMeanParam,
  }: SecondaryStockOrderCalcParams): Promise<SecondaryStockOrderCalcResult> => {
    await sleep(70)
    const primary = productPrimaryById[productId] ?? productPrimaryById[allKnownProductIds[0]]!
    const fromTrend = dailyMeanSigma(primary.monthlySalesTrend, periodStart, periodEnd)
    /** 기간 산술평균: 월 판매 단순 평균의 일환산(일평균 판매량). */
    const trendMuRaw = fromTrend.dailyMean
    const trendDailyMean = Math.round(trendMuRaw * 10) / 10

    /** 예측 수량연산: 가중 일평균(또는 UI에서 넘긴 μ). */
    const forecastMuRaw =
      dailyMeanParam !== undefined && Number.isFinite(dailyMeanParam)
        ? Math.max(0, dailyMeanParam)
        : forecastDailyMeanFromModel(primary.monthlySalesTrend, periodStart, periodEnd)
    const dailyMeanRounded = Math.round(forecastMuRaw * 10) / 10

    const sigma = fromTrend.sigma
    const safeLead = Math.max(0, Math.round(leadTimeDays))
    const z = zFromServiceLevelPct(serviceLevelPct)
    const formulaSafetyStock = Math.max(0, Math.round(z * sigma * Math.sqrt(safeLead) + trendMuRaw * safeLead))
    const safetyStock =
      safetyStockMode === 'manual'
        ? Math.max(0, Math.round(manualSafetyStock))
        : formulaSafetyStock
    const safetyRecQty = Math.max(0, Math.round(safetyStock - primary.availableStock + trendMuRaw * safeLead))
    const forecastRecQty = Math.max(0, Math.round(forecastMuRaw * safeLead * 1.05))

    const avgCost = Math.round(primary.price * 0.78)
    const opMarginPerUnit = primary.price - avgCost - Math.round(primary.price * 0.13)
    const toAmounts = (qty: number) => ({
      expectedOrderAmount: qty * avgCost,
      expectedSalesAmount: qty * primary.price,
      expectedOpProfit: qty * opMarginPerUnit,
    })

    return {
      trendDailyMean,
      dailyMean: dailyMeanRounded,
      sigma,
      display: {
        currentStockQtyTotal: 1330,
        totalOrderBalanceTotal: 520,
        expectedInboundOrderBalanceTotal: 230,
        currentStockQtyBySize: [95, 110, 120, 130, 125, 140, 160, 155, 150, 145],
        totalOrderBalanceBySize: [28, 36, 42, 48, 52, 58, 66, 64, 63, 63],
        expectedInboundOrderBalanceBySize: [10, 14, 18, 21, 23, 26, 31, 29, 29, 29],
      },
      safetyStockCalc: {
        safetyStock,
        recommendedOrderQty: safetyRecQty,
        ...toAmounts(safetyRecQty),
      },
      forecastQtyCalc: {
        safetyStock: null,
        recommendedOrderQty: forecastRecQty,
        ...toAmounts(forecastRecQty),
      },
    }
  },
}
