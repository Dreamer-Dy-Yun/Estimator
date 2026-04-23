import { describe, expect, it } from 'vitest'
import {
  formatCurrency,
  formatGroupedNumber,
  formatNumber,
  formatPercent,
  formatPercentTwoDecimals,
  formatRatioDecimalKo,
} from './format'

describe('format utils', () => {
  it('formats nullable grouped numbers (수량·금액 공통)', () => {
    expect(formatGroupedNumber(null)).toBe('-')
    expect(formatGroupedNumber(12345)).toBe('12,345')
    expect(formatGroupedNumber(67890)).toBe('67,890')
  })

  it('formats percent with 1 and 2 decimal places', () => {
    expect(formatPercent(12.34)).toBe('12.3%')
    expect(formatPercentTwoDecimals(12.345)).toBe('12.35%')
    expect(formatPercent(9.99)).toBe('10.0%')
  })

  it('formats ratio decimal string with two fraction digits (no % suffix)', () => {
    expect(formatRatioDecimalKo(3.1)).toBe('3.10')
    expect(formatRatioDecimalKo(1234.567)).toBe('1,234.57')
  })

  it('formats plain number and currency suffix helpers', () => {
    expect(formatNumber(1234567)).toBe('1,234,567')
    expect(formatCurrency(1234567)).toBe('1,234,567원')
  })
})
