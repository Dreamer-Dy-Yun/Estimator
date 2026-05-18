import type { CandidateOrderExportInput } from './candidateOrderExcelData'
import { CandidateOrderWorkbookBuilder } from './candidateOrderExcelWorkbook'

export type { CandidateOrderExportInput } from './candidateOrderExcelData'
export { CandidateOrderWorkbookBuilder } from './candidateOrderExcelWorkbook'

type ExcelJsModule = typeof import('exceljs')

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

export async function createCandidateOrderExcelExport(input: CandidateOrderExportInput) {
  const excelJs = await loadExcelJs()
  return new CandidateOrderWorkbookBuilder({ excelJs }).build(input)
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
