import { describe, expect, it } from 'vitest'
import { DAILY_TREND_AS_OF_DATE } from './dailyTrendAsOf'

describe('DAILY_TREND_AS_OF_DATE', () : void => {
  it('uses ISO date literal format YYYY-MM-DD', () : void => {
    expect(DAILY_TREND_AS_OF_DATE).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('is parseable date string', () : void => {
    const t: number = new Date(`${DAILY_TREND_AS_OF_DATE}T00:00:00Z`).getTime()
    expect(Number.isNaN(t)).toBe(false)
  })
})
