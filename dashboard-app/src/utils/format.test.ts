import { describe, expect, it } from 'vitest'
import {
  formatEaQuantity,
  formatGroupedNumber,
  formatPercent,
  formatRatioDecimalKo,
} from './format'

describe('format utils', () => {
  it('formats nullable grouped numbers (수량·금액 공통)', () => {
    expect(formatGroupedNumber(null)).toBe('-')
    expect(formatGroupedNumber(12345)).toBe('12,345')
    expect(formatGroupedNumber(67890)).toBe('67,890')
  })

  it('formats percent with 1 decimal place', () => {
    expect(formatPercent(12.34)).toBe('12.3%')
    expect(formatPercent(9.99)).toBe('10.0%')
  })

  it('formats ratio decimal string with two fraction digits (no % suffix)', () => {
    expect(formatRatioDecimalKo(3.1)).toBe('3.10')
    expect(formatRatioDecimalKo(1234.567)).toBe('1,234.57')
  })

  it('formats nullable EA quantity helper', () => {
    expect(formatEaQuantity(null)).toBe('-')
    expect(formatEaQuantity(5000)).toBe('5,000 EA')
  })
})
