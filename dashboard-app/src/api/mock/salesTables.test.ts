import { describe, expect, it } from 'vitest'
import { secondaryCompetitorChannels } from './salesTables'

describe('api/mock salesTables competitor channels', () => {
  it('contains only kream and musinsa channels', () => {
    expect(secondaryCompetitorChannels.map((c) => c.id)).toEqual(['kream', 'musinsa'])
    expect(secondaryCompetitorChannels.some((c) => c.id === 'naver')).toBe(false)
  })
})
