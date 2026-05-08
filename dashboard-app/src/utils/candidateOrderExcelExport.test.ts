import { describe, expect, it } from 'vitest'
import type { CandidateItemSummary } from '../api/types'
import { createCandidateOrderExcelExport } from './candidateOrderExcelExport'

function candidateItem(uuid: string, size: string): CandidateItemSummary {
  return {
    uuid,
    stashUuid: 'stash-1',
    productId: `product-${uuid}`,
    brand: '나이키',
    productCode: `SKU-${uuid}`,
    productName: `테스트 상품 ${uuid}`,
    qty: 10,
    expectedOrderAmount: 100000,
    expectedSalesAmount: 150000,
    expectedOpProfit: 20000,
    insight: {
      competitorChannelLabel: '크림',
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
      badgeNames: ['크림판매'],
    },
    isLatestLlmComment: true,
    orderExport: {
      competitorChannelLabel: '크림',
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

describe('createCandidateOrderExcelExport', () => {
  it('applies main header and N/A cell styles', async () => {
    const ExcelJS = await import('exceljs')
    const { blob } = await createCandidateOrderExcelExport({
      stashName: '스타일 테스트',
      userName: 'mock-admin',
      items: [candidateItem('1', 'M'), candidateItem('2', 'L')],
    })

    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(await blob.arrayBuffer())

    const mainSheet = workbook.getWorksheet('주 데이터')
    expect(mainSheet).toBeDefined()
    const header = mainSheet!.getCell('A1')
    expect((header.fill as { fgColor?: { argb?: string } }).fgColor?.argb).toBe('FF000000')
    expect(header.font.color?.argb).toBe('FFFFFFFF')

    const missingSizeCell = mainSheet!.getCell('N2')
    expect(missingSizeCell.value).toBe('N/A')
    expect((missingSizeCell.fill as { fgColor?: { argb?: string } }).fgColor?.argb).toBe('FFF3F4F6')
  }, 15000)
})
