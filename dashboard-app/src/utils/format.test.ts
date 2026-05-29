import { describe, expect, it } from 'vitest'
import { DisplayNumberFormatter, displayNumber, formatPercent, formatRatioDecimalKo } from './format'

describe('DisplayNumberFormatter', () => {
  it('rounds by decimal digit without changing caller data', () => {
    const value = 1234.56

    expect(displayNumber.normalize(value, 0)).toBe(1235)
    expect(displayNumber.normalize(value, -1)).toBe(1234.6)
    expect(value).toBe(1234.56)
  })

  it('rounds by large integer digit', () => {
    expect(displayNumber.normalize(12345678, 4)).toBe(12350000)
    expect(displayNumber.normalize(12345678, 7)).toBe(10000000)
  })

  it('supports explicit rounding modes', () => {
    const formatter = new DisplayNumberFormatter()

    expect(formatter.normalize(1234.56, 0, 'floor')).toBe(1234)
    expect(formatter.normalize(1234.12, 0, 'ceil')).toBe(1235)
    expect(formatter.normalize(-1234.56, 0, 'trunc')).toBe(-1234)
  })

  it('formats display values with shared percent policy', () => {
    expect(formatPercent(12.34)).toBe('12.3%')
    expect(formatRatioDecimalKo(22.79)).toBe('22.8')
  })

  it('uses fallback for missing or non-finite values', () => {
    expect(displayNumber.format(null)).toBe('-')
    expect(displayNumber.format(undefined)).toBe('-')
    expect(displayNumber.format(Number.NaN)).toBe('-')
  })
})
