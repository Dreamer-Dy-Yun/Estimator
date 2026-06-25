import { describe, expect, it } from 'vitest'
import type { InboundSplitScheduleRow, InboundSplitSizeColumn } from './inboundSplitScheduleModel'
import { redistributeInboundSplitRowTotalBySuggestedTotals, toInboundSplitDraftInteger } from './inboundSplitDraftQuantityModel'

const COLUMNS: InboundSplitSizeColumn[] = [
  { size: 'S', confirmedQty: 0, recommendedQty: 0 },
  { size: 'M', confirmedQty: 0, recommendedQty: 0 },
]

function row(id: string, round: number, suggestedS: number, suggestedM: number): InboundSplitScheduleRow {
  return {
    id,
    round,
    inboundDate: '2026-04-01',
    excludePeriodExistingOrderInbound: false,
    suggestedQuantitiesBySize: { S: suggestedS, M: suggestedM },
    quantitiesBySize: { S: suggestedS, M: suggestedM },
  }
}

describe('inboundSplitDraftQuantityModel', (): void => {
  it('normalizes draft numeric text as non-negative integer quantities', (): void => {
    expect(toInboundSplitDraftInteger('2.6')).toBe(3)
    expect(toInboundSplitDraftInteger('-9')).toBe(0)
    expect(toInboundSplitDraftInteger('abc')).toBe(0)
  })

  it('redistributes an edited row total by current suggested size totals', (): void => {
    const rows: InboundSplitScheduleRow[] = [
      row('r1', 1, 10, 0),
      row('r2', 2, 0, 10),
    ]

    const nextRows: InboundSplitScheduleRow[] = redistributeInboundSplitRowTotalBySuggestedTotals(rows, COLUMNS, 0, '10')

    expect(nextRows[0]?.quantitiesBySize).toEqual({ S: 5, M: 5 })
    expect(nextRows[1]).toBe(rows[1])
  })
})
