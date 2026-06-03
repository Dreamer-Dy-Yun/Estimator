import { describe, expect, it } from 'vitest'
import { getScatterGridCellColor, getScatterGridCellPointRadius } from './scatterGridDisplay'

describe('getScatterGridCellColor', () : void => {
  it('uses the low-density color for empty or invalid counts', () : void => {
    expect(getScatterGridCellColor(0, 10)).toBe('hsl(217, 91%, 86%)')
    expect(getScatterGridCellColor(1, 10)).toBe('hsl(217, 91%, 86%)')
    expect(getScatterGridCellColor(1, 0)).toBe('hsl(217, 91%, 86%)')
  })

  it('uses a continuous lightness scale in the original blue hue', () : void => {
    const low: string = getScatterGridCellColor(1, 16)
    const middle: string = getScatterGridCellColor(4, 16)
    const high: string = getScatterGridCellColor(16, 16)

    expect(low).not.toBe(middle)
    expect(middle).not.toBe(high)
    expect(middle).toBe('hsl(217, 91%, 74.4%)')
    expect(high).toBe('hsl(217, 91%, 60%)')
  })
})

describe('getScatterGridCellPointRadius', () : void => {
  it('sizes each point from chart dimensions and grid bucket size', () : void => {
    expect(getScatterGridCellPointRadius({
      xAxis: { min: 0, max: 100, bucketSize: 10 },
      yAxis: { min: 0, max: 100, bucketSize: 10 },
    }, 200, 200)).toBe(4.1)
  })

  it('falls back to the minimum radius when meta or chart dimensions are invalid', () : void => {
    expect(getScatterGridCellPointRadius(null, 200, 200)).toBe(1.9)
    expect(getScatterGridCellPointRadius({
      xAxis: { min: 0, max: 0, bucketSize: 10 },
      yAxis: { min: 0, max: 100, bucketSize: 10 },
    }, 200, 200)).toBe(1.9)
  })

  it('clamps radius to the documented display range', () : void => {
    expect(getScatterGridCellPointRadius({
      xAxis: { min: 0, max: 100, bucketSize: 1 },
      yAxis: { min: 0, max: 100, bucketSize: 1 },
    }, 100, 100)).toBe(1.9)

    expect(getScatterGridCellPointRadius({
      xAxis: { min: 0, max: 100, bucketSize: 100 },
      yAxis: { min: 0, max: 100, bucketSize: 100 },
    }, 1000, 1000)).toBe(6.8)
  })
})
