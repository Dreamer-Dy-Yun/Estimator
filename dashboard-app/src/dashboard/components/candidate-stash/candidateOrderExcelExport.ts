import type { CandidateItemSummary } from '../../../api'
import type { OrderSnapshotDocumentV1 } from '../../../snapshot/orderSnapshotTypes'
import { createXlsxWorkbookBlob, type XlsxCellValue } from '../../../utils/xlsxWorkbook'

type CandidateOrderExportItem = {
  summary: CandidateItemSummary
  snapshot: OrderSnapshotDocumentV1
}

type CandidateOrderExportInput = {
  stashName: string
  userName: string
  items: CandidateOrderExportItem[]
}

const invalidFilenameChars = /[\\/:*?"<>|]+/g

function safeFilenamePart(value: string): string {
  return value.trim().replace(invalidFilenameChars, '_').replace(/\s+/g, '_') || 'candidate-stash'
}

function todayCompact(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}${m}${d}`
}

function getInboundExpectedDate(items: CandidateOrderExportItem[]): string {
  const dates = [
    ...new Set(
      items
        .map(({ snapshot }) => snapshot.drawer2.stockInputs.leadTimeEndDate?.trim())
        .filter((date): date is string => Boolean(date)),
    ),
  ]
  return dates.join(' / ')
}

function validNumber(value: number | null | undefined): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function numberOrDash(value: number | null | undefined): number | '-' {
  const num = validNumber(value)
  return num == null ? '-' : num
}

function roundedNonNegative(value: number | null | undefined): number {
  const num = validNumber(value)
  return num == null ? 0 : Math.max(0, Math.round(num))
}

function rateOrDash(value: number | null | undefined): string {
  const num = validNumber(value)
  return num == null ? '-' : `${num.toFixed(1)}%`
}

function normalizeSize(size: string): string {
  return size.trim()
}

function collectSizeColumns(items: CandidateOrderExportItem[]): string[] {
  const seen = new Set<string>()
  const sizes: string[] = []

  for (const { snapshot } of items) {
    for (const sizeRow of snapshot.drawer2.sizeRows) {
      const size = normalizeSize(sizeRow.size)
      if (!size || seen.has(size)) continue
      seen.add(size)
      sizes.push(size)
    }
  }

  return sizes
}

function getCompetitorQtyHeader(items: CandidateOrderExportItem[]): string {
  const labels = [
    ...new Set(
      items
        .map(({ summary, snapshot }) => (
          summary.insight.competitorChannelLabel || snapshot.drawer2.competitorChannelLabel
        ).trim())
        .filter(Boolean),
    ),
  ]
  return labels.length === 1 ? `${labels[0]} 기간 총 판매량` : '경쟁사 기간 총 판매량'
}

function sizeOrderMap(snapshot: OrderSnapshotDocumentV1): Map<string, number> {
  const map = new Map<string, number>()
  for (const sizeRow of snapshot.drawer2.sizeRows) {
    const size = normalizeSize(sizeRow.size)
    if (!size) continue
    map.set(size, (map.get(size) ?? 0) + roundedNonNegative(sizeRow.confirmQty))
  }
  return map
}

function totalOrderQty(snapshot: OrderSnapshotDocumentV1): number {
  const confirmedTotal = validNumber(snapshot.drawer2.confirmedTotals?.orderQty)
  if (confirmedTotal != null) return roundedNonNegative(confirmedTotal)
  return snapshot.drawer2.sizeRows.reduce((sum, sizeRow) => sum + roundedNonNegative(sizeRow.confirmQty), 0)
}

function badgeCell(summary: CandidateItemSummary): string {
  const badgeNames = [
    ...new Set(summary.insight.badgeNames.map((name) => name.trim()).filter(Boolean)),
  ]
  return badgeNames.length ? badgeNames.join('\n') : '-'
}

function exportRow(
  item: CandidateOrderExportItem,
  sizeColumns: string[],
): XlsxCellValue[] {
  const { summary, snapshot } = item
  const sizeQtyByName = sizeOrderMap(snapshot)
  const salesSelf = snapshot.drawer2.salesSelf

  return [
    summary.brand,
    summary.productCode,
    summary.productName,
    badgeCell(summary),
    totalOrderQty(snapshot),
    numberOrDash(summary.insight.selfQty ?? salesSelf.qty),
    numberOrDash(summary.insight.competitorQty ?? snapshot.drawer2.salesCompetitor.qty),
    numberOrDash(summary.insight.expectedSalesQty),
    numberOrDash(summary.expectedOrderAmount ?? snapshot.drawer2.stockDerived.expectedOrderAmount),
    numberOrDash(salesSelf.avgCost),
    numberOrDash(salesSelf.avgPrice),
    rateOrDash(salesSelf.feeRatePct),
    rateOrDash(salesSelf.opMarginRatePct),
    ...sizeColumns.map((size) => (sizeQtyByName.has(size) ? (sizeQtyByName.get(size) ?? 0) : '-')),
  ]
}

export function createCandidateOrderExcelExport({ stashName, userName, items }: CandidateOrderExportInput) {
  const sizeColumns = collectSizeColumns(items)
  const mainHeader = [
    '브랜드',
    '상품코드',
    '상품명',
    '배지',
    '오더량',
    '자사 기간 총 판매량',
    getCompetitorQtyHeader(items),
    '총 예상 판매수량',
    '총 예상 오더 금액',
    '평균 원가',
    '평균 판매가',
    '평균 수수료율',
    '평균 영업이익율',
    ...sizeColumns,
  ]
  const mainRows = [
    mainHeader,
    ...items.map((item) => exportRow(item, sizeColumns)),
  ]
  const metaRows = [
    ['항목', '값'],
    ['오더 입고 예정일', getInboundExpectedDate(items)],
    ['이름', userName.trim() || '사용자'],
  ]
  const blob = createXlsxWorkbookBlob([
    {
      name: '주 데이터',
      rows: mainRows,
      columnWidths: [
        18,
        18,
        34,
        18,
        12,
        18,
        18,
        18,
        18,
        14,
        14,
        14,
        16,
        ...sizeColumns.map(() => 10),
      ],
    },
    {
      name: '메타',
      rows: metaRows,
      columnWidths: [20, 28],
    },
  ])
  return {
    blob,
    filename: `${safeFilenamePart(stashName)}_발주_${todayCompact()}.xlsx`,
  }
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => window.URL.revokeObjectURL(url), 0)
}
