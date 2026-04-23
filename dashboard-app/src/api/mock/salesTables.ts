import type { CompetitorSalesRow, SelfSalesRow } from '../../types'
import type { SecondaryCompetitorChannel } from '../types'

export const secondaryCompetitorChannels: SecondaryCompetitorChannel[] = [
  { id: 'kream', label: '크림', priceSkew: 1, qtySkew: 1 },
  { id: 'musinsa', label: '무신사', priceSkew: 1.02, qtySkew: 0.88 },
]

export const selfSalesRows: SelfSalesRow[] = [
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

export const competitorSalesRows: CompetitorSalesRow[] = [
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

export const selfById = Object.fromEntries(selfSalesRows.map((row) => [row.id, row]))
export const competitorById = Object.fromEntries(competitorSalesRows.map((row) => [row.id, row]))
export const allKnownProductIds = Array.from(new Set([...selfSalesRows, ...competitorSalesRows].map((row) => row.id)))
export const brands = Array.from(new Set([...selfSalesRows, ...competitorSalesRows].map((row) => row.brand)))
export const categories = Array.from(new Set([...selfSalesRows, ...competitorSalesRows].map((row) => row.category)))
