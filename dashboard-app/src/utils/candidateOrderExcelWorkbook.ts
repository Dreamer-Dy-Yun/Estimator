import type { CandidateOrderWorkbookData } from './candidateOrderExcelData'
import type { Cell, Row, Workbook, Worksheet } from 'exceljs'
import {
  SIZE_NOT_APPLICABLE,
  type CandidateOrderExportInput,
  createCandidateOrderWorkbookData,
} from './candidateOrderExcelData'

export type ExcelJsModule = typeof import('exceljs')

export type CandidateOrderExcelStyle = {
  headerFillArgb: string
  headerFontArgb: string
  headerBorderArgb: string
  bodyBorderArgb: string
  notApplicableFillArgb: string
  notApplicableFontArgb: string
}

export type CandidateOrderWorkbookBuilderDeps = {
  excelJs: ExcelJsModule
  now?: () => Date
  style?: CandidateOrderExcelStyle
}

const excelMimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' as const
const invalidFilenameChars: RegExp = /[\\/:*?"<>|]+/g

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
  const y: number = date.getFullYear()
  const m: string = String(date.getMonth() + 1).padStart(2, '0')
  const d: string = String(date.getDate()).padStart(2, '0')
  return `${y}${m}${d}`
}

function columnName(index: number): string {
  let n: number = index + 1
  let name: string = ''
  while (n > 0) {
    const rem: number = (n - 1) % 26
    name = String.fromCharCode(65 + rem) + name
    n = Math.floor((n - 1) / 26)
  }
  return name
}

function thinBorder(argb: string) : { top: { style: 'thin'; color: { argb: string; }; }; left: { style: 'thin'; color: { argb: string; }; }; bottom: { style: 'thin'; color: { argb: string; }; }; right: { style: 'thin'; color: { argb: string; }; }; } {
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
    now = () : Date => new Date(),
    style = defaultCandidateOrderExcelStyle,
  }: CandidateOrderWorkbookBuilderDeps) {
    this.excelJs = excelJs
    this.now = now
    this.style = style
  }

  async build(input: CandidateOrderExportInput) : Promise<{ blob: Blob; filename: string; }> {
    const createdAt: Date = this.now()
    const { mainHeader, mainRows, metaRows, mainColumnWidths }: CandidateOrderWorkbookData = createCandidateOrderWorkbookData(input)
    const workbook: Workbook = new this.excelJs.Workbook()
    workbook.creator = 'HAN.A'
    workbook.created = createdAt

    const mainSheet: Worksheet = workbook.addWorksheet('주 데이터', {
      views: [{ state: 'frozen', ySplit: 1 }],
    })
    mainSheet.columns = mainColumnWidths.map((width: number) : { width: number; } => ({ width }))
    mainSheet.addRows(mainRows)
    mainSheet.autoFilter = {
      from: 'A1',
      to: `${columnName(mainHeader.length - 1)}1`,
    }
    this.applySheetStyle(mainSheet)

    const metaSheet: Worksheet = workbook.addWorksheet('메타')
    metaSheet.columns = [{ width: 20 }, { width: 28 }]
    metaSheet.addRows(metaRows)
    this.applySheetStyle(metaSheet)

    const workbookBuffer: BlobPart = await workbook.xlsx.writeBuffer() as BlobPart
    const blob: Blob = new Blob([workbookBuffer], { type: excelMimeType })
    return {
      blob,
      filename: `${safeFilenamePart(input.stashName)}_발주_${compactDate(createdAt)}.xlsx`,
    }
  }

  private applySheetStyle(sheet: Worksheet) : void {
    this.applyHeaderRowStyle(sheet.getRow(1))
    this.applyBodyRowsStyle(sheet)
  }

  private applyHeaderRowStyle(row: Row) : void {
    row.height = 24
    row.eachCell((cell: Cell) : void => this.applyHeaderCellStyle(cell))
  }

  private applyHeaderCellStyle(cell: Cell) : void {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: this.style.headerFillArgb } }
    cell.font = { color: { argb: this.style.headerFontArgb }, bold: true }
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }
    cell.border = thinBorder(this.style.headerBorderArgb)
  }

  private applyBodyRowsStyle(sheet: Worksheet) : void {
    sheet.eachRow((row: Row, rowNumber: number) : void => {
      if (rowNumber === 1) return
      let hasLineBreak: boolean = false
      row.eachCell((cell: Cell) : void => {
        if (typeof cell.value === 'string' && cell.value.includes('\n')) {
          hasLineBreak = true
        }
        this.applyBodyCellStyle(cell)
      })
      row.height = hasLineBreak ? 30 : 21
    })
  }

  private applyBodyCellStyle(cell: Cell) : void {
    cell.alignment = { vertical: 'middle', wrapText: true }
    cell.border = thinBorder(this.style.bodyBorderArgb)
    if (cell.value === SIZE_NOT_APPLICABLE) {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: this.style.notApplicableFillArgb } }
      cell.font = { color: { argb: this.style.notApplicableFontArgb } }
    }
  }
}
