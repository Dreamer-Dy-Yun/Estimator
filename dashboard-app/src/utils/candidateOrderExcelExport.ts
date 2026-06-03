import type { CandidateOrderExportInput } from './candidateOrderExcelData'
import { CandidateOrderWorkbookBuilder } from './candidateOrderExcelWorkbook'

export type { CandidateOrderExportInput } from './candidateOrderExcelData'
export { CandidateOrderWorkbookBuilder } from './candidateOrderExcelWorkbook'

export type ExcelJsModule = typeof import('exceljs')

let excelJsModulePromise: Promise<ExcelJsModule> | null = null

function loadExcelJs(): Promise<ExcelJsModule> {
  excelJsModulePromise ??= import('exceljs').catch((err: unknown) : never => {
    excelJsModulePromise = null
    throw err
  })
  return excelJsModulePromise
}

export function preloadCandidateOrderExcelExport(): Promise<ExcelJsModule> {
  return loadExcelJs()
}

export async function createCandidateOrderExcelExport(input: CandidateOrderExportInput) : Promise<{ blob: Blob; filename: string; }> {
  const excelJs: typeof import("exceljs") = await loadExcelJs()
  return new CandidateOrderWorkbookBuilder({ excelJs }).build(input)
}

export function downloadBlob(blob: Blob, filename: string) : void {
  const url: string = window.URL.createObjectURL(blob)
  const link: HTMLAnchorElement = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() : void => window.URL.revokeObjectURL(url), 0)
}
