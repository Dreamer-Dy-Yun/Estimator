import { describe, expect, it } from 'vitest'
import {
  addIsoDays,
  calendarDaysInMonth,
  dateToMonth,
  daysBetweenIsoDates,
  daysInclusiveBetween,
  formatDateTimeMinute,
  monthToEndDate,
  monthToStartDate,
} from './date'

describe('date utils', () : void => {
  it('converts month to start and end dates', () : void => {
    expect(monthToStartDate('2026-02')).toBe('2026-02-01')
    expect(monthToEndDate('2026-02')).toBe('2026-02-28')
    expect(monthToEndDate('2024-02')).toBe('2024-02-29')
  })

  it('extracts month from date string', () : void => {
    expect(dateToMonth('2026-04-23')).toBe('2026-04')
  })

  it('returns calendar days in month and falls back on invalid input', () : void => {
    expect(calendarDaysInMonth('2026-01')).toBe(31)
    expect(calendarDaysInMonth('2026-02')).toBe(28)
    expect(calendarDaysInMonth('2024-02')).toBe(29)
    expect(calendarDaysInMonth('bad-input')).toBe(30)
  })

  it('computes inclusive day span and handles reversed/invalid range', () : void => {
    expect(daysInclusiveBetween('2026-01-01', '2026-01-01')).toBe(1)
    expect(daysInclusiveBetween('2026-01-01', '2026-01-31')).toBe(31)
    expect(daysInclusiveBetween('2026-01-31', '2026-01-01')).toBe(0)
    expect(daysInclusiveBetween('invalid', '2026-01-01')).toBe(0)
  })

  it('computes exclusive ISO date distance for interval labels', () : void => {
    expect(daysBetweenIsoDates('2026-01-01', '2026-01-10')).toBe(9)
    expect(daysBetweenIsoDates('2026-01-10', '2026-01-01')).toBe(-9)
    expect(daysBetweenIsoDates('2026-01-01', '2026-01-01')).toBe(0)
    expect(daysBetweenIsoDates('invalid', '2026-01-01')).toBeNull()
    expect(daysBetweenIsoDates('2026-02-31', '2026-03-01')).toBeNull()
  })

  it('adds ISO days with UTC date rollover', () : void => {
    expect(addIsoDays('2026-01-31', 1)).toBe('2026-02-01')
    expect(addIsoDays('2024-02-28', 1)).toBe('2024-02-29')
    expect(addIsoDays('bad-input', 1)).toBe('bad-input')
  })

  it('formats ISO datetime to YYYY-MM-DD HH:mm or returns original string', () : void => {
    expect(formatDateTimeMinute('2026-01-02T03:04:00')).toBe('2026-01-02 03:04')
    expect(formatDateTimeMinute('not-a-date')).toBe('not-a-date')
  })
})
