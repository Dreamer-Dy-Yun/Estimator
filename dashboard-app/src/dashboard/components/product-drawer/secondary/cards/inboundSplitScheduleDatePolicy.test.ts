import { describe, expect, it } from 'vitest'
import type { InboundSplitScheduleRow } from './inboundSplitScheduleModel'
import { assertInboundSplitDateOrder, findInboundSplitDateOrderIssue, getInboundSplitDateInterval } from './inboundSplitScheduleDatePolicy'

function row(round: number, inboundDate: string): InboundSplitScheduleRow {
  return {
    id: `r${round}`,
    round,
    inboundDate,
    suggestedQuantitiesBySize: { S: 1 },
    quantitiesBySize: { S: 1 },
  }
}

describe('inboundSplitScheduleDatePolicy', (): void => {
  it('derives date interval days and invalid order from the same contract', (): void => {
    expect(getInboundSplitDateInterval('2026-04-01', '2026-04-10')).toEqual({
      days: 9,
      invalidDateOrder: false,
    })
    expect(getInboundSplitDateInterval('2026-04-10', '2026-04-10')).toEqual({
      days: 0,
      invalidDateOrder: true,
    })
  })

  it('finds the first non-increasing round against work date and previous round', (): void => {
    const issue = findInboundSplitDateOrderIssue('2026-04-01', [
      row(1, '2026-04-03'),
      row(2, '2026-04-02'),
      row(3, '2026-04-05'),
    ])

    expect(issue).toMatchObject({
      rowIndex: 1,
      round: 2,
      previousInboundDate: '2026-04-03',
      inboundDate: '2026-04-02',
      days: -1,
    })
  })

  it('throws for invalid schedule rows before persistence', (): void => {
    expect((): void => assertInboundSplitDateOrder('2026-04-01', [row(1, '2026-04-01')]))
      .toThrow('Inbound split dates must be strictly increasing.')
  })
})
