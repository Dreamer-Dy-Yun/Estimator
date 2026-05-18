import type { Cell, Row, Worksheet } from 'exceljs'
import {
  SIZE_NOT_APPLICABLE,
  type CandidateOrderExportInput,
  createCandidateOrderWorkbookData,
} from './candidateOrderExcelData'

type ExcelJsModule = typeof import('exceljs')

export type CandidateOrderExcelStyle = {
  headerFillArgb: string
  headerFontArgb: string
  headerBorderArgb: string
  bodyBorderArgb: string
  notApplicableFillArgb: string
  notApplicableFontArgb: string
}

type CandidateOrderWorkbookBuilderDeps = {
  excelJs: ExcelJsModule
  now?: () => Date
  style?: CandidateOrderExcelStyle
}

const excelMimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
const invalidFilenameChars = /[\\/:*?"<>|]+/g

const defaultCandidateOrderExcelStyle: CandidateOrderExcelStyle = {
  headerFillArgb: 'FF000000',
  headerFontArgb: 'FFFFFFFF',
  headerBorderArgb: 'FF111827',
  bodyBorderArgb: 'FFE5E7EB',
  notApplicableFillArgb: 'FFFFE4E6',
  notApplicableFontArgb: 'FFB91C1C',
}

function safeFilenamePart(value: string): string {
  return value.trim().replace(invalidFilenameChars, '_').replace(/\s+/g, '_') || 'candidate-stash'
}

function compactDate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}${m}${d}`
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

export class CandidateOrderWorkbookBuilder {
  private readonly excelJs: ExcelJsModule
  private readonly now: () => Date
  private readonly style: CandidateOrderExcelStyle

  constructor({
    excelJs,
    now = () => new Date(),
    style = defaultCandidateOrderExcelStyle,
  }: CandidateOrderWorkbookBuilderDeps) {
    this.excelJs = excelJs
    this.now = now
    this.style = style
  }

  async build(input: CandidateOrderExportInput) {
    const createdAt = this.now()
    const { mainHeader, mainRows, metaRows, mainColumnWidths } = createCandidateOrderWorkbookData(input)
    const workbook = new this.excelJs.Workbook()
    workbook.creator = 'HAN.A'
    workbook.created = createdAt

    const mainSheet = workbook.addWorksheet('주 데이터', {
      views: [{ state: 'frozen', ySplit: 1 }],
    })
    mainSheet.columns = mainColumnWidths.map((width) => ({ width }))
    mainSheet.addRows(mainRows)
    mainSheet.autoFilter = {
      from: 'A1',
      to: `${columnName(mainHeader.length - 1)}1`,
    }
    this.applySheetStyle(mainSheet)

    const metaSheet = workbook.addWorksheet('메타')
    metaSheet.columns = [{ width: 20 }, { width: 28 }]
    metaSheet.addRows(metaRows)
    this.applySheetStyle(metaSheet)

    const workbookBuffer = await workbook.xlsx.writeBuffer()
    const blob = new Blob([workbookBuffer as BlobPart], { type: excelMimeType })
    return {
      blob,
      filename: `${safeFilenamePart(input.stashName)}_발주_${compactDate(createdAt)}.xlsx`,
    }
  }

  private applySheetStyle(sheet: Worksheet) {
    this.applyHeaderRowStyle(sheet.getRow(1))
    this.applyBodyRowsStyle(sheet)
  }

  private applyHeaderRowStyle(row: Row) {
    row.height = 24
    row.eachCell((cell) => this.applyHeaderCellStyle(cell))
  }

  private applyHeaderCellStyle(cell: Cell) {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: this.style.headerFillArgb } }
    cell.font = { color: { argb: this.style.headerFontArgb }, bold: true }
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }
    cell.border = thinBorder(this.style.headerBorderArgb)
  }

  private applyBodyRowsStyle(sheet: Worksheet) {
    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return
      let hasLineBreak = false
      row.eachCell((cell) => {
        if (typeof cell.value === 'string' && cell.value.includes('\n')) {
          hasLineBreak = true
        }
        this.applyBodyCellStyle(cell)
      })
      row.height = hasLineBreak ? 30 : 21
    })
  }

  private applyBodyCellStyle(cell: Cell) {
    cell.alignment = { vertical: 'middle', wrapText: true }
    cell.border = thinBorder(this.style.bodyBorderArgb)
    if (cell.value === SIZE_NOT_APPLICABLE) {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: this.style.notApplicableFillArgb } }
      cell.font = { color: { argb: this.style.notApplicableFontArgb } }
    }
  }
}
