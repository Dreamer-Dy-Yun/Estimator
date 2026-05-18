import type { CandidateItemOrderExport, CandidateItemSummary } from '../api/types'

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

export const SIZE_NOT_APPLICABLE = 'N/A'

function getOrderExport(item: CandidateItemSummary): CandidateItemOrderExport {
  if (!item.orderExport) throw new Error('오더 지표 계산이 완료되지 않은 후보가 있습니다.')
  return item.orderExport
}

function normalizeSize(size: string): string {
  return size.trim()
}

function collectSizeColumns(items: CandidateItemSummary[]): string[] {
  const seen = new Set<string>()
  const sizes: string[] = []

  for (const item of items) {
    for (const sizeRow of getOrderExport(item).sizeOrderQty) {
      const size = normalizeSize(sizeRow.size)
      if (!size || seen.has(size)) continue
      seen.add(size)
      sizes.push(size)
    }
  }

  return sizes
}

function getCompetitorQtyHeader(items: CandidateItemSummary[]): string {
  const labels = [
    ...new Set(
      items
        .map((item) => (
          getOrderExport(item).competitorChannelLabel || item.insight.competitorChannelLabel
        ).trim())
        .filter(Boolean),
    ),
  ]
  return labels.length === 1 ? `${labels[0]} 기간 총 판매량` : '경쟁사 기간 총 판매량'
}

function getInboundExpectedDate(items: CandidateItemSummary[]): string {
  const dates = [
    ...new Set(
      items
        .map((item) => getOrderExport(item).inboundExpectedDate?.trim())
        .filter((date): date is string => Boolean(date)),
    ),
  ]
  return dates.join(' / ')
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
  const map = new Map<string, number>()
  for (const sizeRow of getOrderExport(item).sizeOrderQty) {
    const size = normalizeSize(sizeRow.size)
    if (!size) continue
    map.set(size, (map.get(size) ?? 0) + roundedNonNegative(sizeRow.orderQty))
  }
  return map
}

function badgeCell(summary: CandidateItemSummary): string {
  const badgeLabels = [
    ...new Set(summary.insight.badges.map((badge) => badge.name.trim()).filter(Boolean)),
  ]
  return badgeLabels.length ? badgeLabels.join('\n') : '-'
}

function createMainHeader(items: CandidateItemSummary[], sizeColumns: string[]): string[] {
  return [
    '브랜드',
    '품번',
    '상품명',
    '색상',
    '배지',
    '자사 기간 총 판매량',
    getCompetitorQtyHeader(items),
    '총 오더량',
    '총 오더 금액',
    '평균 원가',
    '평균 판매가',
    '평균 수수료율',
    '평균 영업이익율',
    ...sizeColumns,
  ]
}

function createMainColumnWidths(sizeColumns: string[]): number[] {
  return [
    18,
    18,
    34,
    12,
    18,
    18,
    18,
    18,
    18,
    14,
    14,
    14,
    16,
    ...sizeColumns.map(() => 10),
  ]
}

function createMetaRows(userName: string, items: CandidateItemSummary[]): ExcelCellValue[][] {
  return [
    ['항목', '값'],
    ['오더 입고 예정일', getInboundExpectedDate(items)],
    ['이름', userName.trim() || '사용자'],
  ]
}

function createMainRow(item: CandidateItemSummary, sizeColumns: string[]): ExcelCellValue[] {
  const sizeQtyByName = sizeOrderMap(item)
  const orderExport = getOrderExport(item)

  return [
    item.brand,
    item.code,
    item.productName,
    item.colorCode,
    badgeCell(item),
    numberOrDash(orderExport.selfQty),
    numberOrDash(orderExport.competitorQty),
    numberOrDash(orderExport.expectedSalesQty),
    numberOrDash(orderExport.expectedOrderAmount),
    numberOrDash(orderExport.avgCost),
    numberOrDash(orderExport.avgPrice),
    rateOrDash(orderExport.feeRatePct),
    rateOrDash(orderExport.opMarginRatePct),
    ...sizeColumns.map((size) => (
      sizeQtyByName.has(size) ? (sizeQtyByName.get(size) ?? 0) : SIZE_NOT_APPLICABLE
    )),
  ]
}

export function createCandidateOrderWorkbookData({
  items,
  userName,
}: CandidateOrderExportInput): CandidateOrderWorkbookData {
  const sizeColumns = collectSizeColumns(items)
  const mainHeader = createMainHeader(items, sizeColumns)

  return {
    mainHeader,
    mainRows: [
      mainHeader,
      ...items.map((item) => createMainRow(item, sizeColumns)),
    ],
    metaRows: createMetaRows(userName, items),
    mainColumnWidths: createMainColumnWidths(sizeColumns),
  }
}
