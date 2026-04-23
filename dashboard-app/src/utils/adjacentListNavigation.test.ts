import { describe, expect, it } from 'vitest'
import { adjacentIdInOrder } from './adjacentListNavigation'

describe('adjacentIdInOrder', () => {
  const order = ['A', 'B', 'C']

  it('returns next item for normal forward move', () => {
    expect(adjacentIdInOrder(order, 'A', 'next')).toBe('B')
  })

  it('wraps to first when moving next from last', () => {
    expect(adjacentIdInOrder(order, 'C', 'next')).toBe('A')
  })

  it('returns previous item for normal backward move', () => {
    expect(adjacentIdInOrder(order, 'C', 'prev')).toBe('B')
  })

  it('wraps to last when moving prev from first', () => {
    expect(adjacentIdInOrder(order, 'A', 'prev')).toBe('C')
  })

  it('uses index 0 as base when current id is not in list', () => {
    expect(adjacentIdInOrder(order, 'UNKNOWN', 'next')).toBe('B')
    expect(adjacentIdInOrder(order, 'UNKNOWN', 'prev')).toBe('C')
  })

  it('returns null when list is empty or current id is null', () => {
    expect(adjacentIdInOrder([], 'A', 'next')).toBeNull()
    expect(adjacentIdInOrder(order, null, 'next')).toBeNull()
  })

  it('keeps same item when list has one element', () => {
    expect(adjacentIdInOrder(['ONLY'], 'ONLY', 'next')).toBe('ONLY')
    expect(adjacentIdInOrder(['ONLY'], 'ONLY', 'prev')).toBe('ONLY')
  })
})
