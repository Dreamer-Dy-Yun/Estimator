import { describe, expect, it } from 'vitest'
import { SecondaryDailyTrendRequestWindow } from './SecondaryDailyTrendRequestWindow'

describe('SecondaryDailyTrendRequestWindow', () => {
  it('uses selected month first day through yesterday and maps lead-time days to forecastDays', () => {
    const window = SecondaryDailyTrendRequestWindow.fromSelectedStartMonth({
      selectedStartMonth: '2025-01',
      forecastDays: 183.4,
      today: new Date(2026, 4, 29),
    })

    expect(window.toQueryFields()).toEqual({
      startDate: '2025-01-01',
      endDate: '2026-05-28',
      forecastDays: 183,
    })
  })

  it('does not allow negative forecastDays', () => {
    const window = SecondaryDailyTrendRequestWindow.fromSelectedStartMonth({
      selectedStartMonth: '2025-01',
      forecastDays: -3,
      today: new Date(2026, 4, 29),
    })

    expect(window.forecastDays).toBe(0)
  })
})
