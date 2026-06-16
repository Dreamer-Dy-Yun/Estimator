import { daysBetweenIsoDates } from '../../../../../utils/date'
import type { InboundSplitScheduleRow } from './inboundSplitScheduleModel'

export interface InboundSplitDateInterval {
  readonly days: number | null
  readonly invalidDateOrder: boolean
}

export interface InboundSplitDateOrderIssue {
  readonly rowIndex: number
  readonly round: number
  readonly previousInboundDate: string
  readonly inboundDate: string
  readonly days: number
}

export function getInboundSplitDateInterval(previousInboundDate: string, inboundDate: string): InboundSplitDateInterval {
  const days: number | null = daysBetweenIsoDates(previousInboundDate, inboundDate)
  return {
    days,
    invalidDateOrder: days != null && days <= 0,
  }
}

export function findInboundSplitDateOrderIssue(workDate: string, rows: readonly InboundSplitScheduleRow[]): InboundSplitDateOrderIssue | null {
  for (let rowIndex = 0; rowIndex < rows.length; rowIndex += 1) {
    const row: InboundSplitScheduleRow | undefined = rows[rowIndex]
    if (row == null) continue
    const previousInboundDate: string = rowIndex === 0 ? workDate : (rows[rowIndex - 1]?.inboundDate ?? workDate)
    const interval: InboundSplitDateInterval = getInboundSplitDateInterval(previousInboundDate, row.inboundDate)
    if (!interval.invalidDateOrder || interval.days == null) continue
    return {
      rowIndex,
      round: row.round,
      previousInboundDate,
      inboundDate: row.inboundDate,
      days: interval.days,
    }
  }
  return null
}

export function assertInboundSplitDateOrder(workDate: string, rows: readonly InboundSplitScheduleRow[]): void {
  const issue: InboundSplitDateOrderIssue | null = findInboundSplitDateOrderIssue(workDate, rows)
  if (issue == null) return
  throw new Error(`Inbound split dates must be strictly increasing. Round ${issue.round} is ${issue.days} days from the previous basis date.`)
}
