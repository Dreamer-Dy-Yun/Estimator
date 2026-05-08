import type { CandidateItemSummary } from '../../../api'
import type { OrderSnapshotDocumentV1 } from '../../../snapshot/orderSnapshotTypes'
import { createXlsxWorkbookBlob } from '../../../utils/xlsxWorkbook'

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

export function createCandidateOrderExcelExport({ stashName, userName, items }: CandidateOrderExportInput) {
  const mainRows = [
    ['브랜드', '상품코드', '상품명', '사이즈', '오더량'],
    ...items.flatMap(({ summary, snapshot }) =>
      snapshot.drawer2.sizeRows.map((sizeRow) => [
        summary.brand,
        summary.productCode,
        summary.productName,
        sizeRow.size,
        Math.max(0, Math.round(sizeRow.confirmQty ?? 0)),
      ]),
    ),
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
      columnWidths: [18, 18, 34, 12, 12],
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
