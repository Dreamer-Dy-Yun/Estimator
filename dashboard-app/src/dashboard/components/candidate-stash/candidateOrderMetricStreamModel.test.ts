import { describe, expect, it } from 'vitest'
import {
  buildCandidateOrderMetricRequestSignature,
  createPendingMetricItemUuidSet,
  normalizeCandidateItemUuids,
  settlePendingMetricItem,
} from './candidateOrderMetricStreamModel'

describe('candidateOrderMetricStreamModel', () => {
  it('normalizes candidate item UUIDs for stable request signatures', () => {
    expect(normalizeCandidateItemUuids(['b', 'a', 'b'])).toEqual(['a', 'b'])
    expect(buildCandidateOrderMetricRequestSignature({
      stashUuid: 'stash-1',
      dataReferencePeriodStart: '2026-04-01',
      dataReferencePeriodEnd: '2026-05-31',
      seq: 3,
      candidateItemUuids: ['b', 'a', 'b'],
    })).toBe('stash-1:2026-04-01:2026-05-31:3:a,b')
  })

  it('settles a stream when every requested item has emitted a result', () => {
    const pending = createPendingMetricItemUuidSet(['item-2', 'item-1', 'item-2'])

    expect(settlePendingMetricItem(pending, 'item-1')).toBe(false)
    expect(settlePendingMetricItem(pending, 'unknown-item')).toBe(false)
    expect(settlePendingMetricItem(pending, 'item-2')).toBe(true)
  })
})
