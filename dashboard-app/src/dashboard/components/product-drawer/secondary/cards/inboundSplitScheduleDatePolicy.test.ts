import { describe, expect, it } from 'vitest'
import type { InboundSplitScheduleRow } from './inboundSplitScheduleModel'
import { assertInboundSplitDatePolicy, findInboundSplitDatePolicyIssue, getInboundSplitDateInterval } from './inboundSplitScheduleDatePolicy'

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
    expect(getInboundSplitDateInterval('2026-04-10', '2026-04-10', { allowSameDate: true })).toEqual({
      days: 0,
      invalidDateOrder: false,
    })
  })

  it('finds the first non-increasing round after the first current-inbound round', (): void => {
    const issue = findInboundSplitDatePolicyIssue('2026-04-01', '2026-05-01', [
      row(1, '2026-04-01'),
      row(2, '2026-04-02'),
      row(3, '2026-04-02'),
    ])

    expect(issue).toMatchObject({
      rowIndex: 2,
      round: 3,
      previousInboundDate: '2026-04-02',
      inboundDate: '2026-04-02',
      days: 0,
      issue: 'non-increasing',
    })
  })

  it('enforces current-inclusive and next-exclusive coverage before persistence', (): void => {
    expect((): void => assertInboundSplitDatePolicy('2026-04-01', '2026-05-01', [row(1, '2026-04-01')]))
      .not.toThrow()
    expect((): void => assertInboundSplitDatePolicy('2026-04-01', '2026-05-01', [row(1, '2026-03-31')]))
      .toThrow('currentOrderInboundDueDate')
    expect((): void => assertInboundSplitDatePolicy('2026-04-01', '2026-05-01', [row(1, '2026-05-01')]))
      .toThrow('nextOrderInboundDueDate')
  })
})
