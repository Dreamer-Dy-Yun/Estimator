import { useMemo, useState } from 'react'
import { dateToMonth, formatIsoDateLocal, monthToEndDate, monthToStartDate } from '../../utils/date'

type DateRange = { startDate: string; endDate: string }
type PeriodRangeFilter = DateRange & {
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
  const idx = historicalMonths.findIndex((month) => month === dateToMonth(periodStartDate))
  return idx === -1 ? 0 : idx
}

export function findPeriodEndIdx(historicalMonths: string[], periodEndDate: string): number {
  const idx = historicalMonths.findIndex((month) => month === dateToMonth(periodEndDate))
  return idx === -1 ? Math.max(0, historicalMonths.length - 1) : idx
}

export function computePeriodBarPercents(historicalMonthsLength: number, periodStartIdx: number, periodEndIdx: number) {
  if (historicalMonthsLength <= 1) return { startPct: 0, endPct: 100 }
  const maxIdx = historicalMonthsLength - 1
  return { startPct: (periodStartIdx / maxIdx) * 100, endPct: (periodEndIdx / maxIdx) * 100 }
}

export function computePresetPeriodDates(historicalMonths: string[], currentEndIdx: number, months: number): DateRange | null {
  if (!historicalMonths.length) return null
  const safeEndIdx = Math.max(0, Math.min(historicalMonths.length - 1, currentEndIdx))
  const startIdx = Math.max(0, safeEndIdx - Math.max(1, Math.round(months)) + 1)
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

export function buildDefaultPeriodRange(today = new Date()): DateRange {
  const end = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const start = new Date(end.getFullYear() - 1, end.getMonth(), Math.min(end.getDate(), daysInMonth(end.getFullYear() - 1, end.getMonth())))
  return { startDate: formatIsoDateLocal(start), endDate: formatIsoDateLocal(end) }
}

export function usePeriodRangeFilter(historicalMonths: string[]): PeriodRangeFilter {
  const [defaultPeriod] = useState(() => buildDefaultPeriodRange())
  const [periodStartDate, setPeriodStartDate] = useState(defaultPeriod.startDate)
  const [periodEndDate, setPeriodEndDate] = useState(defaultPeriod.endDate)
  const periodStartIdx = useMemo(() => findPeriodStartIdx(historicalMonths, periodStartDate), [historicalMonths, periodStartDate])
  const periodEndIdx = useMemo(() => findPeriodEndIdx(historicalMonths, periodEndDate), [historicalMonths, periodEndDate])
  const applyRange = (next: DateRange | null) => {
    if (!next) return
    setPeriodStartDate(next.startDate)
    setPeriodEndDate(next.endDate)
  }
  const onPeriodBarStart = (value: number) => {
    const month = historicalMonths[clampPeriodBarStartIdx(value, periodEndIdx)]
    if (month) setPeriodStartDate(monthToStartDate(month))
  }
  const onPeriodBarEnd = (value: number) => {
    const month = historicalMonths[clampPeriodBarEndIdx(value, periodStartIdx)]
    if (month) setPeriodEndDate(monthToEndDate(month))
  }
  const { startPct, endPct } = computePeriodBarPercents(historicalMonths.length, periodStartIdx, periodEndIdx)

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
    setPresetMonths: (months) => applyRange(computePresetPeriodDates(historicalMonths, periodEndIdx, months)),
    setWholeRange: () => applyRange(computeWholeRangeDates(historicalMonths)),
    onStartDateChange: (value) => applyRange(normalizeRangeOnStartInput(value, periodEndDate)),
    onEndDateChange: (value) => applyRange(normalizeRangeOnEndInput(value, periodStartDate)),
    onPeriodBarStart,
    onPeriodBarEnd,
  }
}
