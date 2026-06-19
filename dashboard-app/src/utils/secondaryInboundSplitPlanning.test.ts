import type { SecondaryInboundSplitSource } from '../api/types/secondary'
import { describe, expect, it } from 'vitest'
import { buildSecondaryPlanningSuggestionRows } from './secondaryInboundSplitPlanning'

describe('secondaryInboundSplitPlanning', () : void => {
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
        [{ inboundDate: '2026-02-01', ignoreExistingOrderInbound: true }],
        '2026-02-03',
        source,
      )
    }).toThrow('expectation.S')
  })
})
