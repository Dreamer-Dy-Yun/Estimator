import { describe, expect, it } from 'vitest'
import { SecondaryDailyTrendRequestWindow } from './SecondaryDailyTrendRequestWindow'

describe('SecondaryDailyTrendRequestWindow', () : void => {
  it('uses selected month first day through yesterday and maps lead-time days to forecastDays', () : void => {
    const window: SecondaryDailyTrendRequestWindow = SecondaryDailyTrendRequestWindow.fromSelectedStartMonth({
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

  it('does not allow negative forecastDays', () : void => {
    const window: SecondaryDailyTrendRequestWindow = SecondaryDailyTrendRequestWindow.fromSelectedStartMonth({
      selectedStartMonth: '2025-01',
      forecastDays: -3,
      today: new Date(2026, 4, 29),
    })

    expect(window.forecastDays).toBe(0)
  })

  it('derives the expected source response window', () : void => {
    const window: SecondaryDailyTrendRequestWindow = SecondaryDailyTrendRequestWindow.fromSelectedStartMonth({
      selectedStartMonth: '2025-01',
      forecastDays: 3,
      today: new Date(2026, 4, 29),
    })

    expect(window.toSourceExpectation()).toEqual({
      size: null,
      dateStart: '2025-01-01',
      dateEnd: '2026-05-31',
      forecastStartDate: '2026-05-29',
    })
  })
})
