import { describe, expect, it } from 'vitest'
import { compareSortValues, nextSortState } from './sort'

describe('sort utilities', () => {
  it('sorts numbers, Korean strings, and missing values consistently', () => {
    expect(compareSortValues(1, 2)).toBeLessThan(0)
    expect(compareSortValues('나이키', '푸마')).toBeLessThan(0)
    expect(compareSortValues(null, 1)).toBeGreaterThan(0)
    expect(compareSortValues(undefined, null)).toBe(0)
  })

  it('cycles sort state through asc, desc, and none', () => {
    const asc = nextSortState(null, 'brand')
    expect(asc).toEqual({ key: 'brand', dir: 'asc' })

    const desc = nextSortState(asc, 'brand')
    expect(desc).toEqual({ key: 'brand', dir: 'desc' })

    expect(nextSortState(desc, 'brand')).toBeNull()
    expect(nextSortState(desc, 'name')).toEqual({ key: 'name', dir: 'asc' })
  })
})
