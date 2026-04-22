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

export function usePeriodRangeFilter(historicalMonths: string[]): PeriodRangeFilter {
  const [periodStartDate, setPeriodStartDate] = useState('2025-01-01')
  const [periodEndDate, setPeriodEndDate] = useState('2025-12-31')

  const periodStartIdx = useMemo(() => {
    const idx = historicalMonths.findIndex((month) => month === dateToMonth(periodStartDate))
    return idx === -1 ? 0 : idx
  }, [historicalMonths, periodStartDate])

  const periodEndIdx = useMemo(() => {
    const idx = historicalMonths.findIndex((month) => month === dateToMonth(periodEndDate))
    return idx === -1 ? Math.max(0, historicalMonths.length - 1) : idx
  }, [historicalMonths, periodEndDate])

  const setPresetMonths = (months: number) => {
    if (!historicalMonths.length) return
    const endIdx = periodEndIdx
    const startIdx = Math.max(0, endIdx - months + 1)
    setPeriodStartDate(monthToStartDate(historicalMonths[startIdx]!))
    setPeriodEndDate(monthToEndDate(historicalMonths[endIdx]!))
  }

  const setWholeRange = () => {
    if (!historicalMonths.length) return
    setPeriodStartDate(monthToStartDate(historicalMonths[0]!))
    setPeriodEndDate(monthToEndDate(historicalMonths[historicalMonths.length - 1]!))
  }

  const onStartDateChange = (value: string) => {
    if (value > periodEndDate) setPeriodEndDate(value)
    setPeriodStartDate(value)
  }

  const onEndDateChange = (value: string) => {
    if (value < periodStartDate) setPeriodStartDate(value)
    setPeriodEndDate(value)
  }

  const onPeriodBarStart = (value: number) => {
    const idx = Math.min(value, periodEndIdx)
    const month = historicalMonths[idx]
    if (!month) return
    setPeriodStartDate(monthToStartDate(month))
  }

  const onPeriodBarEnd = (value: number) => {
    const idx = Math.max(value, periodStartIdx)
    const month = historicalMonths[idx]
    if (!month) return
    setPeriodEndDate(monthToEndDate(month))
  }

  const startPct = historicalMonths.length > 1 ? (periodStartIdx / (historicalMonths.length - 1)) * 100 : 0
  const endPct = historicalMonths.length > 1 ? (periodEndIdx / (historicalMonths.length - 1)) * 100 : 100

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

