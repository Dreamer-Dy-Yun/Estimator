import { describe, expect, it } from 'vitest'
import type { SecondaryInboundSplitSource } from '../../../../../api/types/secondary'
import type { InboundSplitSizeColumn } from './inboundSplitScheduleModel'
import { buildInboundSplitSuggestedQuantitiesByRow } from './inboundSplitSuggestionModel'

const COLUMNS: InboundSplitSizeColumn[] = [{ size: 'S', confirmedQty: 10 }]

function makeSource(
  stock: number,
  cells: Record<string, { sale: number; inbound: number }>,
): SecondaryInboundSplitSource {
  const expectationByDate: SecondaryInboundSplitSource['expectationByDate'] = {}
  Object.entries(cells).forEach(([date, cell]: [string, { sale: number; inbound: number }]): void => {
    expectationByDate[date] = { S: cell }
  })

  return {
    productId: 'product-a',
    dateStart: '2026-04-01',
    dateEnd: '2026-04-05',
    stockBySize: { S: stock },
    expectationByDate,
  }
}

describe('buildInboundSplitSuggestedQuantitiesByRow', () : void => {
  it('uses signed source stock and sale minus inbound for interval net demand', () : void => {
    const source: SecondaryInboundSplitSource = makeSource(-2, {
      '2026-04-01': { sale: 3, inbound: 0 },
      '2026-04-02': { sale: 3, inbound: 0 },
      '2026-04-03': { sale: 2, inbound: -1 },
      '2026-04-04': { sale: 0, inbound: 0 },
    })

    const rows: Record<string, number>[] = buildInboundSplitSuggestedQuantitiesByRow(
      COLUMNS,
      ['2026-04-01', '2026-04-03'],
      '2026-04-05',
      source,
    )

    expect(rows).toEqual([{ S: 8 }, { S: 2 }])
  })

  it('preserves the full confirmed quantity even when early demand is lower than the order total', () : void => {
    const source: SecondaryInboundSplitSource = makeSource(20, {
      '2026-04-01': { sale: 1, inbound: 0 },
      '2026-04-02': { sale: 1, inbound: 0 },
      '2026-04-03': { sale: 1, inbound: 0 },
      '2026-04-04': { sale: 1, inbound: 0 },
    })

    const rows: Record<string, number>[] = buildInboundSplitSuggestedQuantitiesByRow(
      COLUMNS,
      ['2026-04-01', '2026-04-03'],
      '2026-04-05',
      source,
    )

    expect(rows.reduce((sum: number, row: Record<string, number>): number => sum + row.S, 0)).toBe(10)
    expect(rows[0].S).toBe(0)
    expect(rows[1].S).toBe(10)
  })

  it('throws instead of silently folding invalid interval dates to zero', () : void => {
    const source: SecondaryInboundSplitSource = makeSource(0, {
      '2026-04-01': { sale: 1, inbound: 0 },
    })

    expect((): Record<string, number>[] => buildInboundSplitSuggestedQuantitiesByRow(
      COLUMNS,
      ['not-a-date'],
      '2026-04-05',
      source,
    )).toThrow('Invalid inbound split source date')
  })
})
