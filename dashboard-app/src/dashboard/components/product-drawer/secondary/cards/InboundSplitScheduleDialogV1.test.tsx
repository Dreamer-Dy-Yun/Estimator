// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import type { InboundSplitScheduleRow } from './inboundSplitScheduleModel'
import { resolveSplitSourceWindowEndDate } from './inboundSplitSourceWindow'

const ROWS: InboundSplitScheduleRow[] = [
  {
    id: 'r1',
    round: 1,
    inboundDate: '2026-06-01',
    ignoreExistingOrderInbound: false,
    suggestedQuantitiesBySize: {},
    quantitiesBySize: {},
  },
]

const TWO_ROWS: InboundSplitScheduleRow[] = [
  ...ROWS,
  {
    id: 'r2',
    round: 2,
    inboundDate: '2026-06-20',
    ignoreExistingOrderInbound: false,
    suggestedQuantitiesBySize: {},
    quantitiesBySize: {},
  },
]

describe('resolveSplitSourceWindowEndDate', (): void => {
  it('returns the only row date when only one row exists', (): void => {
    expect(resolveSplitSourceWindowEndDate(ROWS, '2026-06-30')).toBe('2026-06-01')
  })

  it('returns last valid row date when multiple rows exist', (): void => {
    expect(resolveSplitSourceWindowEndDate(TWO_ROWS, '2026-06-30')).toBe('2026-06-20')
  })

  it('uses the latest row date before nextOrder when rows cross the boundary', (): void => {
    expect(resolveSplitSourceWindowEndDate(
      [
        ...TWO_ROWS,
        {
          id: 'r3',
          round: 3,
          inboundDate: '2026-07-02',
          ignoreExistingOrderInbound: false,
          suggestedQuantitiesBySize: {},
          quantitiesBySize: {},
        },
      ],
      '2026-06-30',
    )).toBe('2026-06-20')
  })
})
