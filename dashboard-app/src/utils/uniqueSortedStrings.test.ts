import { describe, expect, it } from 'vitest'
import { uniqueSortedStrings } from './uniqueSortedStrings'

describe('uniqueSortedStrings', () => {
  it('trims, drops blanks, removes duplicates, and sorts options', () => {
    expect(uniqueSortedStrings([' B ', '', 'A', 'A', ' C'])).toEqual(['A', 'B', 'C'])
  })

  it('reads a generic iterable without mutating source values', () => {
    const values = new Set(['푸마', '나이키', '푸마'])

    expect(uniqueSortedStrings(values)).toEqual(['나이키', '푸마'])
    expect([...values]).toEqual(['푸마', '나이키'])
  })
})
