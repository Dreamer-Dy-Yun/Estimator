import { describe, expect, it } from 'vitest'
import { createXlsxWorkbookBlob } from './xlsxWorkbook'

describe('createXlsxWorkbookBlob', () => {
  it('creates a two-sheet xlsx zip payload', async () => {
    const blob = createXlsxWorkbookBlob([
      { name: '주 데이터', rows: [['브랜드', '오더량'], ['나이키', 10]] },
      { name: '메타', rows: [['항목', '값'], ['이름', 'mock-admin']] },
    ])

    const bytes = new Uint8Array(await blob.arrayBuffer())
    expect(blob.type).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    expect(Array.from(bytes.slice(0, 4))).toEqual([0x50, 0x4b, 0x03, 0x04])
    expect(new TextDecoder().decode(bytes)).toContain('xl/workbook.xml')
  })
})
