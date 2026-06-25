import { describe, expect, it } from 'vitest'
import type { SecondaryInboundSplitSource } from '../../../../../api/types/secondary'
import type { InboundSplitSizeColumn } from './inboundSplitScheduleModel'
import { buildInboundSplitSuggestedQuantitiesByRow } from './inboundSplitSuggestionModel'

const COLUMNS: InboundSplitSizeColumn[] = [{ size: 'S', confirmedQty: 10, recommendedQty: 10 }]

function makeSource(
  stock: number,
  cells: Record<string, { sale: number; inbound: number }>,
): SecondaryInboundSplitSource {
  const sales: SecondaryInboundSplitSource['total']['sales'] = {}
  const expectation: SecondaryInboundSplitSource['expectation']['S'] = []
  Object.entries(cells).forEach(([date, cell]: [string, { sale: number; inbound: number }]): void => {
    sales[date] = cell.sale
    if (cell.inbound > 0) expectation.push({ date, inbound: cell.inbound })
  })

  return {
    total: {
      suggestion: Math.max(0, Object.values(sales).reduce((sum: number, sale: number): number => sum + sale, 0)),
      sales,
    },
    sizeInfo: {
      S: { salesRate: 1, baseStock: stock },
    },
    expectation: { S: expectation },
    confirmed: { total_phase: 0, data: [] },
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
        { inboundDate: '2026-04-01', excludePeriodExistingOrderInbound: false },
        { inboundDate: '2026-04-03', excludePeriodExistingOrderInbound: false },
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
        { inboundDate: '2026-04-01', excludePeriodExistingOrderInbound: false },
        { inboundDate: '2026-04-03', excludePeriodExistingOrderInbound: false },
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
        { inboundDate: '2026-04-01', excludePeriodExistingOrderInbound: false },
        { inboundDate: '2026-04-03', excludePeriodExistingOrderInbound: false },
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
      [{ inboundDate: 'not-a-date', excludePeriodExistingOrderInbound: false }],
      '2026-04-05',
      source,
    )).toThrow('Invalid inbound split source date')
  })

  it('suggests each size from its own interval stock and sales flow', () : void => {
    const source: SecondaryInboundSplitSource = {
      total: {
        suggestion: 10,
        sales: {
          '2026-04-01': 2,
          '2026-04-02': 2,
          '2026-04-03': 4,
          '2026-04-04': 2,
        },
      },
      sizeInfo: {
        S: { salesRate: 0.6, baseStock: 0 },
        M: { salesRate: 0.4, baseStock: 0 },
      },
      expectation: { S: [], M: [] },
      confirmed: { total_phase: 0, data: [] },
    }

    const rows: Record<string, number>[] = buildInboundSplitSuggestedQuantitiesByRow(
      [
        { size: 'S', confirmedQty: 10, recommendedQty: 10 },
        { size: 'M', confirmedQty: 10, recommendedQty: 10 },
      ],
      [
        { inboundDate: '2026-04-01', excludePeriodExistingOrderInbound: false },
        { inboundDate: '2026-04-03', excludePeriodExistingOrderInbound: false },
      ],
      '2026-04-05',
      source,
    )

    expect(rows).toEqual([{ S: 3, M: 2 }, { S: 3, M: 2 }])
  })
})
