import type { DateRange } from './usePeriodRangeFilter'
import { describe, expect, it } from 'vitest'
import {
  buildDefaultPeriodRange,
  clampPeriodBarEndIdx,
  clampPeriodBarStartIdx,
  computePresetPeriodDates,
  computePeriodBarPercents,
  computeWholeRangeDates,
  findPeriodEndIdx,
  findPeriodStartIdx,
  normalizeRangeOnEndInput,
  normalizeRangeOnStartInput,
} from './usePeriodRangeFilter'

describe('usePeriodRangeFilter helpers', () : void => {
  const months: string[] = ['2025-01', '2025-02', '2025-03', '2025-04']

  it('builds the default period from today to one year before today', () : void => {
    expect(buildDefaultPeriodRange(new Date(2026, 4, 12))).toEqual({
      startDate: '2025-05-12',
      endDate: '2026-05-12',
    })
  })

  it('clamps default period start date when the previous year has no same day', () : void => {
    expect(buildDefaultPeriodRange(new Date(2024, 1, 29))).toEqual({
      startDate: '2023-02-28',
      endDate: '2024-02-29',
    })
  })

  it('finds start index from period start date month', () : void => {
    expect(findPeriodStartIdx(months, '2025-03-10')).toBe(2)
  })

  it('returns 0 when start month is missing', () : void => {
    expect(findPeriodStartIdx(months, '2026-01-01')).toBe(0)
  })

  it('finds end index from period end date month', () : void => {
    expect(findPeriodEndIdx(months, '2025-02-28')).toBe(1)
  })

  it('returns last index when end month is missing', () : void => {
    expect(findPeriodEndIdx(months, '2026-01-31')).toBe(3)
  })

  it('returns 0 for end index when month list is empty', () : void => {
    expect(findPeriodEndIdx([], '2026-01-31')).toBe(0)
  })

  it('computes range bar percentages', () : void => {
    const out: { startPct: number; endPct: number; } = computePeriodBarPercents(4, 1, 3)
    expect(out.startPct).toBeCloseTo(33.333333, 5)
    expect(out.endPct).toBe(100)
  })

  it('uses fallback percentages when month count <= 1', () : void => {
    expect(computePeriodBarPercents(0, 0, 0)).toEqual({ startPct: 0, endPct: 100 })
    expect(computePeriodBarPercents(1, 0, 0)).toEqual({ startPct: 0, endPct: 100 })
  })

  it('computes preset period dates with clamp on range and months', () : void => {
    const range: DateRange | null = computePresetPeriodDates(months, 3, 2)
    expect(range).toEqual({ startDate: '2025-03-01', endDate: '2025-04-30' })

    const clamped: DateRange | null = computePresetPeriodDates(months, 999, 99)
    expect(clamped).toEqual({ startDate: '2025-01-01', endDate: '2025-04-30' })
  })

  it('returns null for preset/whole range when month list is empty', () : void => {
    expect(computePresetPeriodDates([], 0, 3)).toBeNull()
    expect(computeWholeRangeDates([])).toBeNull()
  })

  it('computes whole range dates', () : void => {
    expect(computeWholeRangeDates(months)).toEqual({
      startDate: '2025-01-01',
      endDate: '2025-04-30',
    })
  })

  it('normalizes date range when start input exceeds end', () : void => {
    expect(normalizeRangeOnStartInput('2025-05-01', '2025-04-30')).toEqual({
      startDate: '2025-05-01',
      endDate: '2025-05-01',
    })
    expect(normalizeRangeOnStartInput('2025-03-01', '2025-04-30')).toEqual({
      startDate: '2025-03-01',
      endDate: '2025-04-30',
    })
  })

  it('normalizes date range when end input precedes start', () : void => {
    expect(normalizeRangeOnEndInput('2025-02-01', '2025-03-01')).toEqual({
      startDate: '2025-02-01',
      endDate: '2025-02-01',
    })
    expect(normalizeRangeOnEndInput('2025-04-30', '2025-03-01')).toEqual({
      startDate: '2025-03-01',
      endDate: '2025-04-30',
    })
  })

  it('clamps period bar indices to prevent crossing', () : void => {
    expect(clampPeriodBarStartIdx(10, 3)).toBe(3)
    expect(clampPeriodBarStartIdx(2, 3)).toBe(2)
    expect(clampPeriodBarEndIdx(1, 3)).toBe(3)
    expect(clampPeriodBarEndIdx(4, 3)).toBe(4)
  })
})
