import type { SecondaryInboundSplitSource } from '../api/types/secondary'
import { describe, expect, it } from 'vitest'
import { buildSecondaryPlanningSuggestionRows, type SecondaryPlanningSuggestionRow } from './secondaryInboundSplitPlanning'

function makeSource(args: {
  readonly baseStock: number
  readonly sales: Record<string, number>
  readonly inbound?: Array<{ date: string; qty: number }>
}): SecondaryInboundSplitSource {
  return {
    total: {
      suggestion: Object.values(args.sales).reduce((sum: number, qty: number): number => sum + qty, 0),
      sales: args.sales,
    },
    sizeInfo: {
      S: { salesRate: 1, baseStock: args.baseStock },
    },
    expectation: {
      S: (args.inbound ?? []).map((point: { date: string; qty: number }): { date: string; inbound: number } => ({
        date: point.date,
        inbound: point.qty,
      })),
    },
    confirmed: { total_phase: 0, data: [] },
  }
}

describe('secondaryInboundSplitPlanning', () : void => {
  it('requires enough suggested quantity for the lowest stock point when existing inbound arrives late', () : void => {
    const rows: SecondaryPlanningSuggestionRow[] = buildSecondaryPlanningSuggestionRows(
      [{ size: 'S' }],
      [{ inboundDate: '2026-02-01', excludePeriodExistingOrderInbound: false }],
      '2026-02-04',
      makeSource({
        baseStock: 0,
        sales: {
          '2026-02-01': 10,
          '2026-02-02': 10,
          '2026-02-03': 10,
        },
        inbound: [{ date: '2026-02-03', qty: 20 }],
      }),
    )

    expect(rows[0].suggestedQuantitiesBySize.S).toBe(20)
    expect(rows[0].suggestionBasisBySize.S.minimumStockQty).toBe(-20)
    expect(rows[0].suggestionBasisBySize.S.expectedInboundQty).toBe(20)
  })

  it('uses the target stock quantity as the stock-flow floor', () : void => {
    const rows: SecondaryPlanningSuggestionRow[] = buildSecondaryPlanningSuggestionRows(
      [{ size: 'S', targetEndingStockQty: 7 }],
      [{ inboundDate: '2026-02-01', excludePeriodExistingOrderInbound: false }],
      '2026-02-03',
      makeSource({
        baseStock: 10,
        sales: {
          '2026-02-01': 5,
          '2026-02-02': 5,
        },
      }),
    )

    expect(rows[0].suggestedQuantitiesBySize.S).toBe(7)
    expect(rows[0].suggestionBasisBySize.S.endingStockQty).toBe(7)
  })

  it('excludes in-period existing inbound from stock flow when the row option is enabled', () : void => {
    const rows: SecondaryPlanningSuggestionRow[] = buildSecondaryPlanningSuggestionRows(
      [{ size: 'S' }],
      [{ inboundDate: '2026-02-01', excludePeriodExistingOrderInbound: true }],
      '2026-02-03',
      makeSource({
        baseStock: 0,
        sales: {
          '2026-02-01': 10,
          '2026-02-02': 10,
        },
        inbound: [{ date: '2026-02-01', qty: 20 }],
      }),
    )

    expect(rows[0].suggestedQuantitiesBySize.S).toBe(20)
    expect(rows[0].suggestionBasisBySize.S.expectedInboundQty).toBe(0)
  })

  it('throws when a source expectation entry is missing for a planned size', () : void => {
    const source: SecondaryInboundSplitSource = {
      total: {
        suggestion: 10,
        sales: {
          '2026-02-01': 5,
          '2026-02-02': 5,
        },
      },
      sizeInfo: {
        S: { salesRate: 1, baseStock: 0 },
      },
      expectation: {},
      confirmed: { total_phase: 0, data: [] },
    }

    expect(() : void => {
      buildSecondaryPlanningSuggestionRows(
        [{ size: 'S' }],
        [{ inboundDate: '2026-02-01', excludePeriodExistingOrderInbound: true }],
        '2026-02-03',
        source,
      )
    }).toThrow('expectation.S')
  })
})
