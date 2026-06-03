import { useMemo, useState } from 'react'
import { dateToMonth, formatIsoDateLocal, monthToEndDate, monthToStartDate } from '../../utils/date'

export type DateRange = { startDate: string; endDate: string }
export type PeriodRangeFilter = DateRange & {
  periodStartDate: string
  periodEndDate: string
  periodStartIdx: number
  periodEndIdx: number
  startPct: number
  endPct: number
  setPeriodStartDate: (value: string) => void
  setPeriodEndDate: (value: string) => void
  setPresetMonths: (months: number) => void
  setWholeRange: () => void
  onStartDateChange: (value: string) => void
  onEndDateChange: (value: string) => void
  onPeriodBarStart: (value: number) => void
  onPeriodBarEnd: (value: number) => void
}

export function findPeriodStartIdx(historicalMonths: string[], periodStartDate: string): number {
  const idx: number = historicalMonths.findIndex((month: string) : boolean => month === dateToMonth(periodStartDate))
  return idx === -1 ? 0 : idx
}

export function findPeriodEndIdx(historicalMonths: string[], periodEndDate: string): number {
  const idx: number = historicalMonths.findIndex((month: string) : boolean => month === dateToMonth(periodEndDate))
  return idx === -1 ? Math.max(0, historicalMonths.length - 1) : idx
}

export function computePeriodBarPercents(historicalMonthsLength: number, periodStartIdx: number, periodEndIdx: number) : { startPct: number; endPct: number; } {
  if (historicalMonthsLength <= 1) return { startPct: 0, endPct: 100 }
  const maxIdx: number = historicalMonthsLength - 1
  return { startPct: (periodStartIdx / maxIdx) * 100, endPct: (periodEndIdx / maxIdx) * 100 }
}

export function computePresetPeriodDates(historicalMonths: string[], currentEndIdx: number, months: number): DateRange | null {
  if (!historicalMonths.length) return null
  const safeEndIdx: number = Math.max(0, Math.min(historicalMonths.length - 1, currentEndIdx))
  const startIdx: number = Math.max(0, safeEndIdx - Math.max(1, Math.round(months)) + 1)
  return { startDate: monthToStartDate(historicalMonths[startIdx]!), endDate: monthToEndDate(historicalMonths[safeEndIdx]!) }
}

export function computeWholeRangeDates(historicalMonths: string[]): DateRange | null {
  if (!historicalMonths.length) return null
  return { startDate: monthToStartDate(historicalMonths[0]!), endDate: monthToEndDate(historicalMonths[historicalMonths.length - 1]!) }
}

export function normalizeRangeOnStartInput(nextStartDate: string, currentEndDate: string): DateRange {
  return { startDate: nextStartDate, endDate: nextStartDate > currentEndDate ? nextStartDate : currentEndDate }
}

export function normalizeRangeOnEndInput(nextEndDate: string, currentStartDate: string): DateRange {
  return { startDate: nextEndDate < currentStartDate ? nextEndDate : currentStartDate, endDate: nextEndDate }
}

export function clampPeriodBarStartIdx(nextIdx: number, currentEndIdx: number): number {
  return Math.min(nextIdx, currentEndIdx)
}

export function clampPeriodBarEndIdx(nextIdx: number, currentStartIdx: number): number {
  return Math.max(nextIdx, currentStartIdx)
}

function daysInMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate()
}

export function buildDefaultPeriodRange(today: Date = new Date()): DateRange {
  const end: Date = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const start: Date = new Date(end.getFullYear() - 1, end.getMonth(), Math.min(end.getDate(), daysInMonth(end.getFullYear() - 1, end.getMonth())))
  return { startDate: formatIsoDateLocal(start), endDate: formatIsoDateLocal(end) }
}

export function usePeriodRangeFilter(historicalMonths: string[]): PeriodRangeFilter {
  const [defaultPeriod]: [DateRange, React.Dispatch<React.SetStateAction<DateRange>>] = useState(() : DateRange => buildDefaultPeriodRange())
  const [periodStartDate, setPeriodStartDate]: [string, React.Dispatch<React.SetStateAction<string>>] = useState(defaultPeriod.startDate)
  const [periodEndDate, setPeriodEndDate]: [string, React.Dispatch<React.SetStateAction<string>>] = useState(defaultPeriod.endDate)
  const periodStartIdx: number = useMemo(() : number => findPeriodStartIdx(historicalMonths, periodStartDate), [historicalMonths, periodStartDate])
  const periodEndIdx: number = useMemo(() : number => findPeriodEndIdx(historicalMonths, periodEndDate), [historicalMonths, periodEndDate])
  const applyRange: (next: DateRange | null) => void = (next: DateRange | null) : void => {
    if (!next) return
    setPeriodStartDate(next.startDate)
    setPeriodEndDate(next.endDate)
  }
  const onPeriodBarStart: (value: number) => void = (value: number) : void => {
    const month: string = historicalMonths[clampPeriodBarStartIdx(value, periodEndIdx)]
    if (month) setPeriodStartDate(monthToStartDate(month))
  }
  const onPeriodBarEnd: (value: number) => void = (value: number) : void => {
    const month: string = historicalMonths[clampPeriodBarEndIdx(value, periodStartIdx)]
    if (month) setPeriodEndDate(monthToEndDate(month))
  }
  const { startPct, endPct }: { startPct: number; endPct: number; } = computePeriodBarPercents(historicalMonths.length, periodStartIdx, periodEndIdx)

  return {
    startDate: periodStartDate,
    endDate: periodEndDate,
    periodStartDate,
    periodEndDate,
    periodStartIdx,
    periodEndIdx,
    startPct,
    endPct,
    setPeriodStartDate,
    setPeriodEndDate,
    setPresetMonths: (months: number) : void => applyRange(computePresetPeriodDates(historicalMonths, periodEndIdx, months)),
    setWholeRange: () : void => applyRange(computeWholeRangeDates(historicalMonths)),
    onStartDateChange: (value: string) : void => applyRange(normalizeRangeOnStartInput(value, periodEndDate)),
    onEndDateChange: (value: string) : void => applyRange(normalizeRangeOnEndInput(value, periodStartDate)),
    onPeriodBarStart,
    onPeriodBarEnd,
  }
}
