import { describe, expect, it } from 'vitest'
import { createDisplayRankMap } from './displayRank'

describe('createDisplayRankMap', () : void => {
  it('creates stable ascending competition ranks from the given value', () : void => {
    const rows: { id: string; qty: number; }[] = [
      { id: 'a', qty: 30 },
      { id: 'b', qty: 10 },
      { id: 'c', qty: 10 },
      { id: 'd', qty: 20 },
    ]

    const rankMap: Map<string, number> = createDisplayRankMap(rows, (row: { id: string; qty: number; }) : string => row.id, (row: { id: string; qty: number; }) : number => row.qty)

    expect([...rankMap.entries()]).toEqual([
      ['b', 1],
      ['c', 1],
      ['d', 3],
      ['a', 4],
    ])
  })

  it('keeps missing values at the end even for descending ranks', () : void => {
    const rows: ({ id: string; qty: number; } | { id: string; qty: null; })[] = [
      { id: 'a', qty: 30 },
      { id: 'b', qty: null },
      { id: 'c', qty: 10 },
    ]

    const rankMap: Map<string, number> = createDisplayRankMap(rows, (row: { id: string; qty: number; } | { id: string; qty: null; }) : string => row.id, (row: { id: string; qty: number; } | { id: string; qty: null; }) : number | null => row.qty, 'desc')

    expect([...rankMap.entries()]).toEqual([
      ['a', 1],
      ['c', 2],
      ['b', 3],
    ])
  })

  it('ranks the highest value first when direction is descending', () : void => {
    const rows: { id: string; qty: number; }[] = [
      { id: 'a', qty: 30 },
      { id: 'b', qty: 10 },
      { id: 'c', qty: 50 },
    ]

    const rankMap: Map<string, number> = createDisplayRankMap(rows, (row: { id: string; qty: number; }) : string => row.id, (row: { id: string; qty: number; }) : number => row.qty, 'desc')

    expect([...rankMap.entries()]).toEqual([
      ['c', 1],
      ['a', 2],
      ['b', 3],
    ])
  })

  it('does not mutate the source row order', () : void => {
    const rows: { id: string; qty: number; }[] = [
      { id: 'a', qty: 30 },
      { id: 'b', qty: 10 },
      { id: 'c', qty: 10 },
      { id: 'd', qty: 20 },
    ]

    createDisplayRankMap(rows, (row: { id: string; qty: number; }) : string => row.id, (row: { id: string; qty: number; }) : number => row.qty)

    expect(rows.map((row: { id: string; qty: number; }) : string => row.id)).toEqual(['a', 'b', 'c', 'd'])
  })
})
