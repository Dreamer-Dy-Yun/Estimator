import { describe, expect, it } from 'vitest'
import type { ApiFailureKind } from './api-error'
import { classifyApiFailureStatus } from './api-error'

describe('classifyApiFailureStatus', () => {
  const cases: Array<[number, ApiFailureKind]> = [
    [401, 'authentication'],
    [403, 'permission'],
    [404, 'not-found'],
    [409, 'conflict'],
    [422, 'validation'],
    [500, 'server'],
    [503, 'server'],
    [599, 'server'],
  ]

  it.each(cases)('classifies %i as %s', (status, kind) => {
    expect(classifyApiFailureStatus(status)).toBe(kind)
  })

  it('classifies other 4xx statuses as client failures', () => {
    expect(classifyApiFailureStatus(400)).toBe('client')
    expect(classifyApiFailureStatus(429)).toBe('client')
  })

  it('classifies non-error statuses as unknown', () => {
    expect(classifyApiFailureStatus(200)).toBe('unknown')
    expect(classifyApiFailureStatus(302)).toBe('unknown')
  })
})
