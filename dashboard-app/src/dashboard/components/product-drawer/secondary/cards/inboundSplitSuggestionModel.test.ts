import { describe, expect, it } from 'vitest'
import type { SecondaryInboundSplitSource } from '../../../../../api/types/secondary'
import type { InboundSplitSizeColumn } from './inboundSplitScheduleModel'
import { buildInboundSplitSuggestedQuantitiesByRow } from './inboundSplitSuggestionModel'

const COLUMNS: InboundSplitSizeColumn[] = [{ size: 'S', confirmedQty: 10, recommendedQty: 10 }]

function makeSource(
  stock: number,
  cells: Record<string, { sale: number; inbound: number }>,
): SecondaryInboundSplitSource {
  const supplyBySize: SecondaryInboundSplitSource['supplyBySize'] = {
    S: [{ date: '2026-04-01', qty: stock }],
  }
  const salesForecastByDate: SecondaryInboundSplitSource['salesForecastByDate'] = {}
  Object.entries(cells).forEach(([date, cell]: [string, { sale: number; inbound: number }]): void => {
    salesForecastByDate[date] = { S: cell.sale }
    if (cell.inbound > 0) supplyBySize.S.push({ date, qty: cell.inbound })
  })

  return {
    productId: 'product-a',
    productIdentity: { productUuid: null, skuGroupKey: 'product-a', brand: 'Brand', code: 'CODE', colorCode: 'BLK' },
    calculationBaseDate: '2026-04-01',
    coverageStartDate: '2026-04-01',
    coverageEndDate: '2026-04-05',
    supplyBySize,
    salesForecastByDate,
  }
}

describe('buildInboundSplitSuggestedQuantitiesByRow', () : void => {
  it('uses source stock and existing-order inbound supply for interval shortage', () : void => {
    const source: SecondaryInboundSplitSource = makeSource(-2, {
      '2026-04-01': { sale: 3, inbound: 0 },
      '2026-04-02': { sale: 3, inbound: 0 },
      '2026-04-03': { sale: 2, inbound: -1 },
      '2026-04-04': { sale: 0, inbound: 0 },
    })

    const rows: Record<string, number>[] = buildInboundSplitSuggestedQuantitiesByRow(
      COLUMNS,
      [
        { inboundDate: '2026-04-01', ignoreExistingOrderInbound: false },
        { inboundDate: '2026-04-03', ignoreExistingOrderInbound: false },
      ],
      '2026-04-05',
      source,
    )

    expect(rows).toEqual([{ S: 8 }, { S: 2 }])
  })

  it('keeps suggestion based on recommended quantity after confirmed quantity diverges', () : void => {
    const source: SecondaryInboundSplitSource = makeSource(-2, {
      '2026-04-01': { sale: 3, inbound: 0 },
      '2026-04-02': { sale: 3, inbound: 0 },
      '2026-04-03': { sale: 2, inbound: -1 },
      '2026-04-04': { sale: 0, inbound: 0 },
    })

    const rows: Record<string, number>[] = buildInboundSplitSuggestedQuantitiesByRow(
      [{ size: 'S', confirmedQty: 0, recommendedQty: 10 }],
      [
        { inboundDate: '2026-04-01', ignoreExistingOrderInbound: false },
        { inboundDate: '2026-04-03', ignoreExistingOrderInbound: false },
      ],
      '2026-04-05',
      source,
    )

    expect(rows).toEqual([{ S: 8 }, { S: 2 }])
  })

  it('keeps suggested quantity at zero when projected stock covers the interval demand', () : void => {
    const source: SecondaryInboundSplitSource = makeSource(20, {
      '2026-04-01': { sale: 1, inbound: 0 },
      '2026-04-02': { sale: 1, inbound: 0 },
      '2026-04-03': { sale: 1, inbound: 0 },
      '2026-04-04': { sale: 1, inbound: 0 },
    })

    const rows: Record<string, number>[] = buildInboundSplitSuggestedQuantitiesByRow(
      COLUMNS,
      [
        { inboundDate: '2026-04-01', ignoreExistingOrderInbound: false },
        { inboundDate: '2026-04-03', ignoreExistingOrderInbound: false },
      ],
      '2026-04-05',
      source,
    )

    expect(rows.reduce((sum: number, row: Record<string, number>): number => sum + row.S, 0)).toBe(0)
    expect(rows[0].S).toBe(0)
    expect(rows[1].S).toBe(0)
  })

  it('throws instead of silently folding invalid interval dates to zero', () : void => {
    const source: SecondaryInboundSplitSource = makeSource(0, {
      '2026-04-01': { sale: 1, inbound: 0 },
    })

    expect((): Record<string, number>[] => buildInboundSplitSuggestedQuantitiesByRow(
      COLUMNS,
      [{ inboundDate: 'not-a-date', ignoreExistingOrderInbound: false }],
      '2026-04-05',
      source,
    )).toThrow('Invalid inbound split source date')
  })

  it('suggests each size from its own interval stock and sales flow', () : void => {
    const source: SecondaryInboundSplitSource = {
      productId: 'product-a',
      productIdentity: { productUuid: null, skuGroupKey: 'product-a', brand: 'Brand', code: 'CODE', colorCode: 'BLK' },
      calculationBaseDate: '2026-04-01',
      coverageStartDate: '2026-04-01',
      coverageEndDate: '2026-04-05',
      supplyBySize: {
        S: [{ date: '2026-04-01', qty: 0 }],
        M: [{ date: '2026-04-01', qty: 0 }],
      },
      salesForecastByDate: {
        '2026-04-01': { S: 2, M: 0 },
        '2026-04-02': { S: 2, M: 0 },
        '2026-04-03': { S: 1, M: 3 },
        '2026-04-04': { S: 1, M: 1 },
      },
    }

    const rows: Record<string, number>[] = buildInboundSplitSuggestedQuantitiesByRow(
      [
        { size: 'S', confirmedQty: 10, recommendedQty: 10 },
        { size: 'M', confirmedQty: 10, recommendedQty: 10 },
      ],
      [
        { inboundDate: '2026-04-01', ignoreExistingOrderInbound: false },
        { inboundDate: '2026-04-03', ignoreExistingOrderInbound: false },
      ],
      '2026-04-05',
      source,
    )

    expect(rows).toEqual([{ S: 4, M: 0 }, { S: 2, M: 4 }])
  })
})
