import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  calendarDaysInMonth,
  dateToMonth,
  daysFromTodayThroughInclusive,
  daysInclusiveBetween,
  formatDateTimeMinute,
  monthToEndDate,
  monthToStartDate,
} from './date'

describe('date utils', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('converts month to start and end dates', () => {
    expect(monthToStartDate('2026-02')).toBe('2026-02-01')
    expect(monthToEndDate('2026-02')).toBe('2026-02-28')
    expect(monthToEndDate('2024-02')).toBe('2024-02-29')
  })

  it('extracts month from date string', () => {
    expect(dateToMonth('2026-04-23')).toBe('2026-04')
  })

  it('returns calendar days in month and falls back on invalid input', () => {
    expect(calendarDaysInMonth('2026-01')).toBe(31)
    expect(calendarDaysInMonth('2026-02')).toBe(28)
    expect(calendarDaysInMonth('2024-02')).toBe(29)
    expect(calendarDaysInMonth('bad-input')).toBe(30)
  })

  it('computes inclusive day span and handles reversed/invalid range', () => {
    expect(daysInclusiveBetween('2026-01-01', '2026-01-01')).toBe(1)
    expect(daysInclusiveBetween('2026-01-01', '2026-01-31')).toBe(31)
    expect(daysInclusiveBetween('2026-01-31', '2026-01-01')).toBe(0)
    expect(daysInclusiveBetween('invalid', '2026-01-01')).toBe(0)
  })

  it('computes days from today through end date inclusively', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-10T12:00:00'))
    expect(daysFromTodayThroughInclusive('2026-04-10')).toBe(1)
    expect(daysFromTodayThroughInclusive('2026-04-12')).toBe(3)
    expect(daysFromTodayThroughInclusive('2026-04-09')).toBe(0)
    expect(daysFromTodayThroughInclusive('invalid')).toBe(0)
  })

  it('formats ISO datetime to YYYY-MM-DD HH:mm or returns original string', () => {
    expect(formatDateTimeMinute('2026-01-02T03:04:00')).toBe('2026-01-02 03:04')
    expect(formatDateTimeMinute('not-a-date')).toBe('not-a-date')
  })
})
