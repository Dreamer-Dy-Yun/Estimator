import { describe, expect, it } from 'vitest'
import { hashRank } from './hashRank'

describe('hashRank', () => {
  it('creates deterministic rank in 1..mod range', () => {
    const a = hashRank('seed-a', 28)
    const b = hashRank('seed-a', 28)
    const c = hashRank('seed-b', 28)
    expect(a).toBe(b)
    expect(a).toBeGreaterThanOrEqual(1)
    expect(a).toBeLessThanOrEqual(28)
    expect(c).toBeGreaterThanOrEqual(1)
    expect(c).toBeLessThanOrEqual(28)
  })
})
