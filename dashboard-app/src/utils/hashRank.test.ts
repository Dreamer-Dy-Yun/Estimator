import { describe, expect, it } from 'vitest'
import { hashRank } from './hashRank'

describe('hashRank', () : void => {
  it('creates deterministic rank in 1..mod range', () : void => {
    const a: number = hashRank('seed-a', 28)
    const b: number = hashRank('seed-a', 28)
    const c: number = hashRank('seed-b', 28)
    expect(a).toBe(b)
    expect(a).toBeGreaterThanOrEqual(1)
    expect(a).toBeLessThanOrEqual(28)
    expect(c).toBeGreaterThanOrEqual(1)
    expect(c).toBeLessThanOrEqual(28)
  })
})
