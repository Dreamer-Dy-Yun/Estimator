import { useMemo, useState } from 'react'
import { dateToMonth, monthToEndDate, monthToStartDate } from '../../utils/date'

type PeriodRangeFilter = {
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

export function computePeriodBarPercents(
  historicalMonthsLength: number,
  periodStartIdx: number,
  periodEndIdx: number,
): { startPct: number; endPct: number } {
  if (historicalMonthsLength <= 1) return { startPct: 0, endPct: 100 }
  return {
    startPct: (periodStartIdx / (historicalMonthsLength - 1)) * 100,
    endPct: (periodEndIdx / (historicalMonthsLength - 1)) * 100,
  }
}

export function computePresetPeriodDates(
  historicalMonths: string[],
  currentEndIdx: number,
  months: number,
): { startDate: string; endDate: string } | null {
  if (!historicalMonths.length) return null
  const safeEndIdx = Math.max(0, Math.min(historicalMonths.length - 1, currentEndIdx))
  const safeMonths = Math.max(1, Math.round(months))
  const startIdx = Math.max(0, safeEndIdx - safeMonths + 1)
  return {
    startDate: monthToStartDate(historicalMonths[startIdx]!),
    endDate: monthToEndDate(historicalMonths[safeEndIdx]!),
  }
}

export function computeWholeRangeDates(
  historicalMonths: string[],
): { startDate: string; endDate: string } | null {
  if (!historicalMonths.length) return null
  return {
    startDate: monthToStartDate(historicalMonths[0]!),
    endDate: monthToEndDate(historicalMonths[historicalMonths.length - 1]!),
  }
}

export function normalizeRangeOnStartInput(
  nextStartDate: string,
  currentEndDate: string,
): { startDate: string; endDate: string } {
  return {
    startDate: nextStartDate,
    endDate: nextStartDate > currentEndDate ? nextStartDate : currentEndDate,
  }
}

export function normalizeRangeOnEndInput(
  nextEndDate: string,
  currentStartDate: string,
): { startDate: string; endDate: string } {
  return {
    startDate: nextEndDate < currentStartDate ? nextEndDate : currentStartDate,
    endDate: nextEndDate,
  }
}

export function clampPeriodBarStartIdx(nextIdx: number, currentEndIdx: number): number {
  return Math.min(nextIdx, currentEndIdx)
}

export function clampPeriodBarEndIdx(nextIdx: number, currentStartIdx: number): number {
  return Math.max(nextIdx, currentStartIdx)
}

export function usePeriodRangeFilter(historicalMonths: string[]): PeriodRangeFilter {
  const [periodStartDate, setPeriodStartDate] = useState('2025-01-01')
  const [periodEndDate, setPeriodEndDate] = useState('2025-12-31')

  const periodStartIdx = useMemo(() => {
    return findPeriodStartIdx(historicalMonths, periodStartDate)
  }, [historicalMonths, periodStartDate])

  const periodEndIdx = useMemo(() => {
    return findPeriodEndIdx(historicalMonths, periodEndDate)
  }, [historicalMonths, periodEndDate])

  const setPresetMonths = (months: number) => {
    const next = computePresetPeriodDates(historicalMonths, periodEndIdx, months)
    if (!next) return
    setPeriodStartDate(next.startDate)
    setPeriodEndDate(next.endDate)
  }

  const setWholeRange = () => {
    const next = computeWholeRangeDates(historicalMonths)
    if (!next) return
    setPeriodStartDate(next.startDate)
    setPeriodEndDate(next.endDate)
  }

  const onStartDateChange = (value: string) => {
    const next = normalizeRangeOnStartInput(value, periodEndDate)
    setPeriodStartDate(next.startDate)
    setPeriodEndDate(next.endDate)
  }

  const onEndDateChange = (value: string) => {
    const next = normalizeRangeOnEndInput(value, periodStartDate)
    setPeriodStartDate(next.startDate)
    setPeriodEndDate(next.endDate)
  }

  const onPeriodBarStart = (value: number) => {
    const idx = clampPeriodBarStartIdx(value, periodEndIdx)
    const month = historicalMonths[idx]
    if (!month) return
    setPeriodStartDate(monthToStartDate(month))
  }

  const onPeriodBarEnd = (value: number) => {
    const idx = clampPeriodBarEndIdx(value, periodStartIdx)
    const month = historicalMonths[idx]
    if (!month) return
    setPeriodEndDate(monthToEndDate(month))
  }

  const { startPct, endPct } = computePeriodBarPercents(historicalMonths.length, periodStartIdx, periodEndIdx)

  return {
    periodStartDate,
    periodEndDate,
    periodStartIdx,
    periodEndIdx,
    startPct,
    endPct,
    setPeriodStartDate,
    setPeriodEndDate,
    setPresetMonths,
    setWholeRange,
    onStartDateChange,
    onEndDateChange,
    onPeriodBarStart,
    onPeriodBarEnd,
  }
}

