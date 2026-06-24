import type { InboundSplitScheduleRow } from './inboundSplitScheduleModel'

export function resolveSplitSourceWindowEndDate(
  rows: readonly InboundSplitScheduleRow[],
  nextOrderInboundDueDate: string,
): string {
  const validRows: Array<string> = rows
    .map((row: InboundSplitScheduleRow): string => row.inboundDate)
    .filter((date: string): boolean => date < nextOrderInboundDueDate)
    .sort((leftDate: string, rightDate: string): number => leftDate.localeCompare(rightDate))

  if (validRows.length === 0) return nextOrderInboundDueDate

  return validRows[validRows.length - 1] as string
}
