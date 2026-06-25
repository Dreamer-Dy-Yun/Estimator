import type { CandidateBadge } from '../api'
import type { CandidateItemOrderExport, CandidateItemOrderExportInboundRound, CandidateItemSummary } from '../api/types'

export type CandidateOrderExportInput = {
  stashName: string
  userName: string
  items: CandidateItemSummary[]
}

export type ExcelCellValue = string | number

export type CandidateOrderWorkbookData = {
  mainHeader: string[]
  mainRows: ExcelCellValue[][]
  metaRows: ExcelCellValue[][]
  mainColumnWidths: number[]
}

export const SIZE_NOT_APPLICABLE = 'N/A' as const

function getOrderExport(item: CandidateItemSummary): CandidateItemOrderExport {
  if (!item.orderExport) throw new Error('오더 지표 계산이 완료되지 않은 후보가 있습니다.')
  return item.orderExport
}

function normalizeSize(size: string): string {
  return size.trim()
}

function collectSizeColumns(items: CandidateItemSummary[]): string[] {
  const seen: Set<string> = new Set<string>()
  const sizes: string[] = []

  for (const item of items) {
    for (const sizeRow of getOrderExport(item).sizeOrderQty) {
      const size: string = normalizeSize(sizeRow.size)
      if (!size || seen.has(size)) continue
      seen.add(size)
      sizes.push(size)
    }
  }

  return sizes
}

function getCompetitorQtyHeader(items: CandidateItemSummary[]): string {
  const labels: string[] = [
    ...new Set(
      items
        .map((item: CandidateItemSummary) : string => getOrderExport(item).comparisonSubjectLabel.trim())
        .filter(Boolean),
    ),
  ]
  return labels.length === 1 ? `${labels[0]} 기간 총 판매량` : '경쟁사 기간 총 판매량'
}

function getInboundExpectedDate(items: CandidateItemSummary[]): string {
  const dates: string[] = [
    ...new Set(
      items
        .flatMap((item: CandidateItemSummary) : string[] => {
          const orderExport: CandidateItemOrderExport = getOrderExport(item)
          const inboundDates: string[] = orderExport.inboundRounds
            .map((round: CandidateItemOrderExportInboundRound): string => round.inboundDate.trim())
            .filter(Boolean)
          const fallbackDate: string | undefined = orderExport.inboundExpectedDate?.trim()
          return inboundDates.length ? inboundDates : (fallbackDate ? [fallbackDate] : [])
        })
        .filter((date: string | undefined): date is string => Boolean(date)),
    ),
  ]
  return dates.join(' / ')
}

function collectInboundRoundColumns(items: CandidateItemSummary[]): number[] {
  const maxRound: number = items.reduce((max: number, item: CandidateItemSummary): number => {
    const itemMaxRound: number = getOrderExport(item).inboundRounds.reduce((roundMax: number, round: CandidateItemOrderExportInboundRound): number => (
      Math.max(roundMax, Math.max(0, Math.round(round.round)))
    ), 0)
    return Math.max(max, itemMaxRound)
  }, 0)
  return Array.from({ length: maxRound }, (_: unknown, index: number): number => index + 1)
}

function numberOrDash(value: number | null | undefined): number | '-' {
  return value == null ? '-' : value
}

function roundedNonNegative(value: number): number {
  return Math.max(0, Math.round(value))
}

function rateOrDash(value: number | null | undefined): string {
  return value == null ? '-' : `${value.toFixed(1)}%`
}

function sizeOrderMap(item: CandidateItemSummary): Map<string, number> {
  const map: Map<string, number> = new Map<string, number>()
  for (const sizeRow of getOrderExport(item).sizeOrderQty) {
    const size: string = normalizeSize(sizeRow.size)
    if (!size) continue
    map.set(size, (map.get(size) ?? 0) + roundedNonNegative(sizeRow.orderQty))
  }
  return map
}

function badgeCell(summary: CandidateItemSummary): string {
  const badgeLabels: string[] = [
    ...new Set(summary.insight.badges.map((badge: CandidateBadge) : string => badge.name.trim()).filter(Boolean)),
  ]
  return badgeLabels.length ? badgeLabels.join('\n') : '-'
}

function createMainHeader(items: CandidateItemSummary[], inboundRoundColumns: readonly number[], sizeColumns: string[]): string[] {
  return [
    '브랜드',
    '품번',
    '상품명',
    '색상',
    '배지',
    '자사 기간 총 판매량',
    getCompetitorQtyHeader(items),
    '총 오더량',
    '입고 차수',
    ...inboundRoundColumns.map((round: number): string => `${round}차 입고 예정일`),
    '총 오더 금액',
    '평균 원가',
    '평균 판매가',
    '평균 수수료율',
    '평균 영업이익율',
    ...sizeColumns,
  ]
}

function createMainColumnWidths(inboundRoundColumns: readonly number[], sizeColumns: string[]): number[] {
  return [
    18,
    18,
    34,
    12,
    18,
    18,
    18,
    18,
    10,
    ...inboundRoundColumns.map((): number => 16),
    18,
    14,
    14,
    14,
    16,
    ...sizeColumns.map(() : number => 10),
  ]
}

function createMetaRows(userName: string, items: CandidateItemSummary[]): ExcelCellValue[][] {
  return [
    ['항목', '값'],
    ['오더 입고 예정일', getInboundExpectedDate(items)],
    ['이름', userName.trim() || '사용자'],
  ]
}

function inboundRoundDateByRound(item: CandidateItemSummary): Map<number, string> {
  const map: Map<number, string> = new Map<number, string>()
  getOrderExport(item).inboundRounds.forEach((round: CandidateItemOrderExportInboundRound): void => {
    const roundNumber: number = Math.max(0, Math.round(round.round))
    const inboundDate: string = round.inboundDate.trim()
    if (roundNumber > 0 && inboundDate) map.set(roundNumber, inboundDate)
  })
  return map
}

function createMainRow(item: CandidateItemSummary, inboundRoundColumns: readonly number[], sizeColumns: string[]): ExcelCellValue[] {
  const sizeQtyByName: Map<string, number> = sizeOrderMap(item)
  const orderExport: CandidateItemOrderExport = getOrderExport(item)
  const inboundDateByRound: Map<number, string> = inboundRoundDateByRound(item)

  return [
    item.brand,
    item.code,
    item.productName,
    item.colorCode,
    badgeCell(item),
    numberOrDash(orderExport.selfQty),
    numberOrDash(orderExport.competitorQty),
    numberOrDash(orderExport.expectedSalesQty),
    inboundDateByRound.size ? `${Math.max(...inboundDateByRound.keys())}차` : '-',
    ...inboundRoundColumns.map((round: number): string => inboundDateByRound.get(round) ?? '-'),
    numberOrDash(orderExport.expectedOrderAmount),
    numberOrDash(orderExport.avgCost),
    numberOrDash(orderExport.avgPrice),
    rateOrDash(orderExport.feeRatePct),
    rateOrDash(orderExport.opMarginRatePct),
    ...sizeColumns.map((size: string) : number | 'N/A' => (
      sizeQtyByName.has(size) ? (sizeQtyByName.get(size) ?? 0) : SIZE_NOT_APPLICABLE
    )),
  ]
}

export function createCandidateOrderWorkbookData({
  items,
  userName,
}: CandidateOrderExportInput): CandidateOrderWorkbookData {
  const inboundRoundColumns: number[] = collectInboundRoundColumns(items)
  const sizeColumns: string[] = collectSizeColumns(items)
  const mainHeader: string[] = createMainHeader(items, inboundRoundColumns, sizeColumns)

  return {
    mainHeader,
    mainRows: [
      mainHeader,
      ...items.map((item: CandidateItemSummary) : ExcelCellValue[] => createMainRow(item, inboundRoundColumns, sizeColumns)),
    ],
    metaRows: createMetaRows(userName, items),
    mainColumnWidths: createMainColumnWidths(inboundRoundColumns, sizeColumns),
  }
}
