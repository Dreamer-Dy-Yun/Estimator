import { describe, expect, it } from 'vitest'
import { clamp, makeUuid32 } from './utils'

describe('api/mock utils', () => {
  it('clamps value into given range', () => {
    expect(clamp(10, 1, 5)).toBe(5)
    expect(clamp(-3, 1, 5)).toBe(1)
    expect(clamp(3, 1, 5)).toBe(3)
  })

  it('generates lowercase hex uuid with 32 chars', () => {
    const uuid = makeUuid32()
    expect(uuid).toMatch(/^[a-f0-9]{32}$/)
  })
})
