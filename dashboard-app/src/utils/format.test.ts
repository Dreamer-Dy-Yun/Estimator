import { describe, expect, it } from 'vitest'
import { DisplayNumberFormatter, displayNumber, formatCompactKoreanNumber, formatPercent, formatRatioDecimalKo } from './format'

describe('DisplayNumberFormatter', () : void => {
  it('rounds by decimal digit without changing caller data', () : void => {
    const value = 1234.56 as const

    expect(displayNumber.normalize(value, 0)).toBe(1235)
    expect(displayNumber.normalize(value, -1)).toBe(1234.6)
    expect(value).toBe(1234.56)
  })

  it('rounds by large integer digit', () : void => {
    expect(displayNumber.normalize(12345678, 4)).toBe(12350000)
    expect(displayNumber.normalize(12345678, 7)).toBe(10000000)
  })

  it('supports explicit rounding modes', () : void => {
    const formatter: DisplayNumberFormatter = new DisplayNumberFormatter()

    expect(formatter.normalize(1234.56, 0, 'floor')).toBe(1234)
    expect(formatter.normalize(1234.12, 0, 'ceil')).toBe(1235)
    expect(formatter.normalize(-1234.56, 0, 'trunc')).toBe(-1234)
  })

  it('formats display values with shared percent policy', () : void => {
    expect(formatPercent(12.34)).toBe('12.3%')
    expect(formatRatioDecimalKo(22.79)).toBe('22.8')
  })

  it('uses fallback for missing or non-finite values', () : void => {
    expect(displayNumber.format(null)).toBe('-')
    expect(displayNumber.format(undefined)).toBe('-')
    expect(displayNumber.format(Number.NaN)).toBe('-')
  })

  it('formats compact Korean display values without changing the full value', () : void => {
    expect(formatCompactKoreanNumber(123456789)).toEqual({
      text: '1.23억',
      fullText: '123,456,789',
      compacted: true,
      approximate: true,
    })
    expect(formatCompactKoreanNumber(9876543)).toEqual({
      text: '987.7만',
      fullText: '9,876,543',
      compacted: true,
      approximate: true,
    })
  })

  it('keeps compact Korean display exact below the compact threshold', () : void => {
    expect(formatCompactKoreanNumber(99999, { compactAt: 100000 })).toEqual({
      text: '99,999',
      fullText: '99,999',
      compacted: false,
      approximate: false,
    })
  })
})
