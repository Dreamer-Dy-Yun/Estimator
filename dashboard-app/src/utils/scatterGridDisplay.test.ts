import { describe, expect, it } from 'vitest'
import { getScatterGridCellColor, getScatterGridCellPointRadius } from './scatterGridDisplay'

describe('getScatterGridCellColor', () => {
  it('uses the low-density color for empty or invalid counts', () => {
    expect(getScatterGridCellColor(0, 10)).toBe('hsl(217, 91%, 86%)')
    expect(getScatterGridCellColor(1, 10)).toBe('hsl(217, 91%, 86%)')
    expect(getScatterGridCellColor(1, 0)).toBe('hsl(217, 91%, 86%)')
  })

  it('uses a continuous lightness scale in the original blue hue', () => {
    const low = getScatterGridCellColor(1, 16)
    const middle = getScatterGridCellColor(4, 16)
    const high = getScatterGridCellColor(16, 16)

    expect(low).not.toBe(middle)
    expect(middle).not.toBe(high)
    expect(middle).toBe('hsl(217, 91%, 74.4%)')
    expect(high).toBe('hsl(217, 91%, 60%)')
  })
})

describe('getScatterGridCellPointRadius', () => {
  it('sizes each point from chart dimensions and grid bucket size', () => {
    expect(getScatterGridCellPointRadius({
      xAxis: { min: 0, max: 100, bucketSize: 10 },
      yAxis: { min: 0, max: 100, bucketSize: 10 },
    }, 200, 200)).toBe(5.4)
  })

  it('falls back to the minimum radius when meta or chart dimensions are invalid', () => {
    expect(getScatterGridCellPointRadius(null, 200, 200)).toBe(2.5)
    expect(getScatterGridCellPointRadius({
      xAxis: { min: 0, max: 0, bucketSize: 10 },
      yAxis: { min: 0, max: 100, bucketSize: 10 },
    }, 200, 200)).toBe(2.5)
  })

  it('clamps radius to the documented display range', () => {
    expect(getScatterGridCellPointRadius({
      xAxis: { min: 0, max: 100, bucketSize: 1 },
      yAxis: { min: 0, max: 100, bucketSize: 1 },
    }, 100, 100)).toBe(2.5)

    expect(getScatterGridCellPointRadius({
      xAxis: { min: 0, max: 100, bucketSize: 100 },
      yAxis: { min: 0, max: 100, bucketSize: 100 },
    }, 1000, 1000)).toBe(9)
  })
})
