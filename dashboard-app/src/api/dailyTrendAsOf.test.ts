import { describe, expect, it } from 'vitest'
import { DAILY_TREND_AS_OF_DATE } from './dailyTrendAsOf'

describe('DAILY_TREND_AS_OF_DATE', () => {
  it('uses ISO date literal format YYYY-MM-DD', () => {
    expect(DAILY_TREND_AS_OF_DATE).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('is parseable date string', () => {
    const t = new Date(`${DAILY_TREND_AS_OF_DATE}T00:00:00Z`).getTime()
    expect(Number.isNaN(t)).toBe(false)
  })
})
