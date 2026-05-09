import type { CandidateItemSummary } from '../api/types/candidate'
import type { Cell, Row, Worksheet } from 'exceljs'

type CandidateOrderExportInput = {
  stashName: string
  userName: string
  items: CandidateItemSummary[]
}

type ExcelCellValue = string | number
type ExcelJsModule = typeof import('exceljs')

const SIZE_NOT_APPLICABLE = 'N/A'
const excelMimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
const invalidFilenameChars = /[\\/:*?"<>|]+/g
const headerFillArgb = 'FF000000'
const headerFontArgb = 'FFFFFFFF'
const headerBorderArgb = 'FF111827'
const bodyBorderArgb = 'FFE5E7EB'
const notApplicableFillArgb = 'FFFFE4E6'
const notApplicableFontArgb = 'FFB91C1C'
let excelJsModulePromise: Promise<ExcelJsModule> | null = null

function loadExcelJs(): Promise<ExcelJsModule> {
  excelJsModulePromise ??= import('exceljs').catch((err) => {
    excelJsModulePromise = null
    throw err
  })
  return excelJsModulePromise
}

export function preloadCandidateOrderExcelExport(): Promise<ExcelJsModule> {
  return loadExcelJs()
}

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

function getInboundExpectedDate(items: CandidateItemSummary[]): string {
  const dates = [
    ...new Set(
      items
        .map((item) => item.orderExport.inboundExpectedDate?.trim())
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

function normalizeSize(size: string): string {
  return size.trim()
}

function collectSizeColumns(items: CandidateItemSummary[]): string[] {
  const seen = new Set<string>()
  const sizes: string[] = []

  for (const item of items) {
    for (const sizeRow of item.orderExport.sizeOrderQty) {
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
          item.orderExport.competitorChannelLabel || item.insight.competitorChannelLabel
        ).trim())
        .filter(Boolean),
    ),
  ]
  return labels.length === 1 ? `${labels[0]} 기간 총 판매량` : '경쟁사 기간 총 판매량'
}

function sizeOrderMap(item: CandidateItemSummary): Map<string, number> {
  const map = new Map<string, number>()
  for (const sizeRow of item.orderExport.sizeOrderQty) {
    const size = normalizeSize(sizeRow.size)
    if (!size) continue
    map.set(size, (map.get(size) ?? 0) + roundedNonNegative(sizeRow.orderQty))
  }
  return map
}

function badgeCell(summary: CandidateItemSummary): string {
  const badgeNames = [
    ...new Set(summary.insight.badgeNames.map((name) => name.trim()).filter(Boolean)),
  ]
  return badgeNames.length ? badgeNames.join('\n') : '-'
}

function exportRow(
  item: CandidateItemSummary,
  sizeColumns: string[],
): ExcelCellValue[] {
  const sizeQtyByName = sizeOrderMap(item)
  const orderExport = item.orderExport

  return [
    item.brand,
    item.productCode,
    item.productName,
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

function columnName(index: number): string {
  let n = index + 1
  let name = ''
  while (n > 0) {
    const rem = (n - 1) % 26
    name = String.fromCharCode(65 + rem) + name
    n = Math.floor((n - 1) / 26)
  }
  return name
}

function thinBorder(argb: string) {
  return {
    top: { style: 'thin' as const, color: { argb } },
    left: { style: 'thin' as const, color: { argb } },
    bottom: { style: 'thin' as const, color: { argb } },
    right: { style: 'thin' as const, color: { argb } },
  }
}

function applyHeaderCellStyle(cell: Cell) {
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: headerFillArgb } }
  cell.font = { color: { argb: headerFontArgb }, bold: true }
  cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }
  cell.border = thinBorder(headerBorderArgb)
}

function applyHeaderRowStyle(row: Row) {
  row.height = 24
  row.eachCell(applyHeaderCellStyle)
}

function applyBodyCellStyle(cell: Cell) {
  cell.alignment = { vertical: 'middle', wrapText: true }
  cell.border = thinBorder(bodyBorderArgb)
  if (cell.value === SIZE_NOT_APPLICABLE) {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: notApplicableFillArgb } }
    cell.font = { color: { argb: notApplicableFontArgb } }
  }
}

function applyBodyRowsStyle(sheet: Worksheet) {
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return
    let hasLineBreak = false
    row.eachCell((cell) => {
      if (typeof cell.value === 'string' && cell.value.includes('\n')) {
        hasLineBreak = true
      }
      applyBodyCellStyle(cell)
    })
    row.height = hasLineBreak ? 30 : 21
  })
}

function applyMainSheetStyle(sheet: Worksheet) {
  applyHeaderRowStyle(sheet.getRow(1))
  applyBodyRowsStyle(sheet)
}

function applyMetaSheetStyle(sheet: Worksheet) {
  applyHeaderRowStyle(sheet.getRow(1))
  applyBodyRowsStyle(sheet)
}

export async function createCandidateOrderExcelExport({ stashName, userName, items }: CandidateOrderExportInput) {
  const ExcelJS = await loadExcelJs()
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'HAN.A'
  workbook.created = new Date()

  const sizeColumns = collectSizeColumns(items)
  const mainHeader = [
    '브랜드',
    '상품코드',
    '상품명',
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
  const mainRows = [
    mainHeader,
    ...items.map((item) => exportRow(item, sizeColumns)),
  ]
  const metaRows = [
    ['항목', '값'],
    ['오더 입고 예정일', getInboundExpectedDate(items)],
    ['이름', userName.trim() || '사용자'],
  ]
  const mainColumnWidths = [
    18,
    18,
    34,
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

  const mainSheet = workbook.addWorksheet('주 데이터', {
    views: [{ state: 'frozen', ySplit: 1 }],
  })
  mainSheet.columns = mainColumnWidths.map((width) => ({ width }))
  mainSheet.addRows(mainRows)
  mainSheet.autoFilter = {
    from: 'A1',
    to: `${columnName(mainHeader.length - 1)}1`,
  }
  applyMainSheetStyle(mainSheet)

  const metaSheet = workbook.addWorksheet('메타')
  metaSheet.columns = [{ width: 20 }, { width: 28 }]
  metaSheet.addRows(metaRows)
  applyMetaSheetStyle(metaSheet)

  const workbookBuffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([workbookBuffer as BlobPart], { type: excelMimeType })
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
