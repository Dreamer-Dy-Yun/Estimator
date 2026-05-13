import { describe, expect, it } from 'vitest'
import { getScatterGridCellColor } from './scatterGridColor'

describe('getScatterGridCellColor', () => {
  it('uses the low-density color for empty or invalid counts', () => {
    expect(getScatterGridCellColor(0, 10)).toBe('#ccfbf1')
    expect(getScatterGridCellColor(1, 10)).toBe('#ccfbf1')
    expect(getScatterGridCellColor(1, 0)).toBe('#ccfbf1')
  })

  it('uses a continuous gradient value between color stops', () => {
    const low = getScatterGridCellColor(1, 16)
    const middle = getScatterGridCellColor(4, 16)
    const high = getScatterGridCellColor(16, 16)

    expect(low).not.toBe(middle)
    expect(middle).not.toBe(high)
    expect(high).toBe('#f59e0b')
  })
})
