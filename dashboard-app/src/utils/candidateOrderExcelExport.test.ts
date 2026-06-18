import { describe, expect, it } from 'vitest'
import type { Cell, Workbook, Worksheet } from 'exceljs'
import type { CandidateItemSummary } from '../api/types'
import {
  CandidateOrderWorkbookBuilder,
  createCandidateOrderExcelExport,
} from './candidateOrderExcelExport'

function candidateItem(uuid: string, size: string): CandidateItemSummary {
  return {
    uuid,
    stashUuid: 'stash-1',
    skuUuid: `product-${uuid}`,
    skuGroupKey: `product-${uuid}`,
    brand: '나이키',
    code: `SKU-${uuid}`,
    productName: `테스트 상품 ${uuid}`,
    colorCode: '010',
    thumbnailUrl: null,
    orderMetricStatus: 'loaded',
    qty: 10,
    expectedOrderAmount: 100000,
    expectedSalesAmount: 150000,
    expectedOpProfit: 20000,
    insightStatus: 'loaded',
    insight: {
      competitorSalesSourceLabel: '크림',
      competitorQty: 8,
      competitorAmount: 120000,
      selfQty: 10,
      selfAmount: 150000,
      expectedSalesQty: 10,
      expectedSalesAmount: 150000,
      expectedOpProfit: 20000,
      selfOpProfitRatePct: 9,
      rankTone: 'top',
      topPercentThreshold: 10,
      bottomPercentThreshold: 10,
      badges: [{
        name: '크림판매',
        color: '#0f766e',
        tooltip: '조회 기간 내 크림 경쟁사 판매수량 상위 후보입니다.',
      }],
    },
    isLatestLlmComment: true,
    hasConfirmedOrderSnapshot: true,
    orderExport: {
      comparisonSubjectLabel: '크림',
      selfQty: 10,
      competitorQty: 8,
      expectedSalesQty: 10,
      expectedOrderAmount: 100000,
      avgCost: 70000,
      avgPrice: 100000,
      feeRatePct: 13,
      opMarginRatePct: 9,
      inboundExpectedDate: '2026-06-01',
      sizeOrderQty: [{ size, orderQty: 10 }],
    },
    dbCreatedAt: '2026-05-08T00:00:00.000Z',
    dbUpdatedAt: '2026-05-08T00:00:00.000Z',
  }
}

describe('createCandidateOrderExcelExport', () : void => {
  it('uses injected clock when building the download filename', async () : Promise<void> => {
    const ExcelJS: typeof import('exceljs') = await import('exceljs')
    const builder: CandidateOrderWorkbookBuilder = new CandidateOrderWorkbookBuilder({
      excelJs: ExcelJS,
      now: () : Date => new Date(2026, 4, 13),
    })

    const { filename }: { blob: Blob; filename: string; } = await builder.build({
      stashName: '정리 테스트',
      userName: 'mock-admin',
      items: [candidateItem('1', 'M')],
    })

    expect(filename).toBe('정리_테스트_발주_20260513.xlsx')
  }, 15000)

  it('applies sheet header and N/A cell styles', async () : Promise<void> => {
    const ExcelJS: typeof import('exceljs') = await import('exceljs')
    const { blob }: { blob: Blob; filename: string; } = await createCandidateOrderExcelExport({
      stashName: '스타일 테스트',
      userName: 'mock-admin',
      items: [candidateItem('1', 'M'), candidateItem('2', 'L')],
    })

    const workbook: Workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(await blob.arrayBuffer())

    const mainSheet: Worksheet | undefined = workbook.getWorksheet('주 데이터')
    expect(mainSheet).toBeDefined()
    const header: Cell = mainSheet!.getCell('A1')
    expect((header.fill as { fgColor?: { argb?: string } }).fgColor?.argb).toBe('FF000000')
    expect(header.font.color?.argb).toBe('FFFFFFFF')

    const missingSizeCell: Cell = mainSheet!.getCell('O2')
    expect(missingSizeCell.value).toBe('N/A')
    expect((missingSizeCell.fill as { fgColor?: { argb?: string } }).fgColor?.argb).toBe('FFFFE4E6')

    const metaSheet: Worksheet | undefined = workbook.getWorksheet('메타')
    expect(metaSheet).toBeDefined()
    const metaHeader: Cell = metaSheet!.getCell('A1')
    expect((metaHeader.fill as { fgColor?: { argb?: string } }).fgColor?.argb).toBe('FF000000')
    expect(metaHeader.font.color?.argb).toBe('FFFFFFFF')
  }, 15000)
})
