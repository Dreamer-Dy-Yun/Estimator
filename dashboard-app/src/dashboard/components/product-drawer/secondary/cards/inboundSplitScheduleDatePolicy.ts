import { daysBetweenIsoDates } from '../../../../../utils/date'
import type { InboundSplitScheduleRow } from './inboundSplitScheduleModel'

export interface InboundSplitDateInterval {
  readonly days: number | null
  readonly invalidDateOrder: boolean
}

export type InboundSplitDatePolicyIssueKind = 'before-current-inbound' | 'at-or-after-next-inbound' | 'non-increasing'

export interface InboundSplitDatePolicyIssue {
  readonly rowIndex: number
  readonly round: number
  readonly previousInboundDate: string
  readonly inboundDate: string
  readonly days: number
  readonly issue: InboundSplitDatePolicyIssueKind
}

export interface InboundSplitDateIntervalOptions {
  readonly allowSameDate?: boolean
}

export function getInboundSplitDateInterval(
  previousInboundDate: string,
  inboundDate: string,
  options: InboundSplitDateIntervalOptions = {},
): InboundSplitDateInterval {
  const days: number | null = daysBetweenIsoDates(previousInboundDate, inboundDate)
  return {
    days,
    invalidDateOrder: days != null && (options.allowSameDate ? days < 0 : days <= 0),
  }
}

export function isInboundSplitDateOutsideCoverage(
  currentOrderInboundDueDate: string,
  nextOrderInboundDueDate: string,
  inboundDate: string,
): boolean {
  return inboundDate < currentOrderInboundDueDate || inboundDate >= nextOrderInboundDueDate
}

export function findInboundSplitDatePolicyIssue(
  currentOrderInboundDueDate: string,
  nextOrderInboundDueDate: string,
  rows: readonly InboundSplitScheduleRow[],
): InboundSplitDatePolicyIssue | null {
  for (let rowIndex = 0; rowIndex < rows.length; rowIndex += 1) {
    const row: InboundSplitScheduleRow | undefined = rows[rowIndex]
    if (row == null) continue
    const previousInboundDate: string = rowIndex === 0 ? currentOrderInboundDueDate : (rows[rowIndex - 1]?.inboundDate ?? currentOrderInboundDueDate)
    const interval: InboundSplitDateInterval = getInboundSplitDateInterval(previousInboundDate, row.inboundDate, { allowSameDate: rowIndex === 0 })
    if (row.inboundDate < currentOrderInboundDueDate) {
      return {
        rowIndex,
        round: row.round,
        previousInboundDate,
        inboundDate: row.inboundDate,
        days: interval.days ?? 0,
        issue: 'before-current-inbound',
      }
    }
    if (row.inboundDate >= nextOrderInboundDueDate) {
      return {
        rowIndex,
        round: row.round,
        previousInboundDate,
        inboundDate: row.inboundDate,
        days: interval.days ?? 0,
        issue: 'at-or-after-next-inbound',
      }
    }
    if (!interval.invalidDateOrder || interval.days == null) continue
    return {
      rowIndex,
      round: row.round,
      previousInboundDate,
      inboundDate: row.inboundDate,
      days: interval.days,
      issue: 'non-increasing',
    }
  }
  return null
}

export function assertInboundSplitDatePolicy(
  currentOrderInboundDueDate: string,
  nextOrderInboundDueDate: string,
  rows: readonly InboundSplitScheduleRow[],
): void {
  const issue: InboundSplitDatePolicyIssue | null = findInboundSplitDatePolicyIssue(currentOrderInboundDueDate, nextOrderInboundDueDate, rows)
  if (issue == null) return
  if (issue.issue === 'before-current-inbound') {
    throw new Error(`Inbound split dates must be on or after currentOrderInboundDueDate. Round ${issue.round} is ${issue.inboundDate}.`)
  }
  if (issue.issue === 'at-or-after-next-inbound') {
    throw new Error(`Inbound split dates must be before nextOrderInboundDueDate. Round ${issue.round} is ${issue.inboundDate}.`)
  }
  throw new Error(`Inbound split dates must be increasing after the first round. Round ${issue.round} is ${issue.days} days from the previous basis date.`)
}
