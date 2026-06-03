import type { ScatterSalesGridResponse } from '../types'
import { describe, expect, it } from 'vitest'
import { buildScatterGridCells } from './scatterGrid'

describe('buildScatterGridCells', () : void => {
  it('quantizes points and limits clickable sku ids per cell', () : void => {
    const grid: ScatterSalesGridResponse = buildScatterGridCells(
      [
        { skuGroupKey: 'A__010', x: 10, y: 100 },
        { skuGroupKey: 'B__010', x: 11, y: 101 },
        { skuGroupKey: 'C__010', x: 80, y: 800 },
      ],
      20,
      200,
      1,
    )

    expect(grid.meta.xAxis.bucketSize).toBe(20)
    expect(grid.meta.yAxis.bucketSize).toBe(200)
    expect(grid.cells[0]).toMatchObject({
      count: 2,
      skuIds: ['A__010'],
      hasMoreSkuIds: true,
    })
  })

  it('returns safe empty metadata when no finite points are available', () : void => {
    expect(buildScatterGridCells([{ skuGroupKey: 'A__010', x: Number.NaN, y: 1 }])).toEqual({
      cells: [],
      meta: {
        xAxis: { min: 0, max: 0, bucketSize: 1 },
        yAxis: { min: 0, max: 0, bucketSize: 1 },
      },
    })
  })
})
