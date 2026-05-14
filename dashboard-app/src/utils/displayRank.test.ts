import { describe, expect, it } from 'vitest'
import { createDisplayRankMap } from './displayRank'

describe('createDisplayRankMap', () => {
  it('creates stable ascending competition ranks from the given value', () => {
    const rows = [
      { id: 'a', qty: 30 },
      { id: 'b', qty: 10 },
      { id: 'c', qty: 10 },
      { id: 'd', qty: 20 },
    ]

    const rankMap = createDisplayRankMap(rows, (row) => row.id, (row) => row.qty)

    expect([...rankMap.entries()]).toEqual([
      ['b', 1],
      ['c', 1],
      ['d', 3],
      ['a', 4],
    ])
  })

  it('keeps missing values at the end even for descending ranks', () => {
    const rows = [
      { id: 'a', qty: 30 },
      { id: 'b', qty: null },
      { id: 'c', qty: 10 },
    ]

    const rankMap = createDisplayRankMap(rows, (row) => row.id, (row) => row.qty, 'desc')

    expect([...rankMap.entries()]).toEqual([
      ['a', 1],
      ['c', 2],
      ['b', 3],
    ])
  })
})
