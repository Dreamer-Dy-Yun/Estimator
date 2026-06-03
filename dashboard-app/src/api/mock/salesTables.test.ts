import type { SecondaryCompetitorChannel } from '..'
import { describe, expect, it } from 'vitest'
import { secondaryCompetitorChannels } from './salesTables'

describe('api/mock salesTables competitor channels', () : void => {
  it('contains only kream and musinsa channels', () : void => {
    expect(secondaryCompetitorChannels.map((c: SecondaryCompetitorChannel) : string => c.id)).toEqual(['kream', 'musinsa'])
    expect(secondaryCompetitorChannels.some((c: SecondaryCompetitorChannel) : boolean => c.id === 'naver')).toBe(false)
  })
})
