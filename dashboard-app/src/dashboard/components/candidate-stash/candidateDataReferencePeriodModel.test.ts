import { describe, expect, it } from 'vitest'
import {
  candidateDataReferencePeriodReducer,
  getCandidateDataReferencePeriodQueryDirty,
  initialCandidateDataReferencePeriodState,
  normalizeCandidateDataReferenceAppliedPeriod,
  type CandidateDataReferencePeriodState,
} from './candidateDataReferencePeriodModel'

function applyPeriod(
  start: string,
  end: string,
  state: CandidateDataReferencePeriodState = initialCandidateDataReferencePeriodState,
): CandidateDataReferencePeriodState {
  return candidateDataReferencePeriodReducer(state, { type: 'periodApplied', start, end })
}

describe('candidateDataReferencePeriodModel', () => {
  it('applies a period to both applied and draft state', () => {
    const state = applyPeriod('2025-01-01', '2025-01-31')

    expect(state).toEqual({
      dataReferencePeriodStart: '2025-01-01',
      dataReferencePeriodEnd: '2025-01-31',
      draftDataReferencePeriodStart: '2025-01-01',
      draftDataReferencePeriodEnd: '2025-01-31',
    })
    expect(getCandidateDataReferencePeriodQueryDirty(state)).toBe(false)
  })

  it('normalizes applied periods with the start-input policy', () => {
    expect(normalizeCandidateDataReferenceAppliedPeriod('2025-02-10', '2025-02-01')).toEqual({
      start: '2025-02-10',
      end: '2025-02-10',
    })

    const state = applyPeriod('2025-02-10', '2025-02-01')
    expect(state.dataReferencePeriodStart).toBe('2025-02-10')
    expect(state.dataReferencePeriodEnd).toBe('2025-02-10')
  })

  it('ignores empty applied or draft inputs', () => {
    const state = applyPeriod('2025-01-01', '2025-01-31')

    expect(applyPeriod('', '2025-02-01', state)).toBe(state)
    expect(candidateDataReferencePeriodReducer(state, { type: 'draftStartChanged', value: '' })).toBe(state)
    expect(candidateDataReferencePeriodReducer(state, { type: 'draftEndChanged', value: '' })).toBe(state)
  })

  it('updates draft start and keeps or raises draft end by policy', () => {
    const state = applyPeriod('2025-01-01', '2025-01-31')
    const keptEnd = candidateDataReferencePeriodReducer(state, {
      type: 'draftStartChanged',
      value: '2025-01-10',
    })
    const raisedEnd = candidateDataReferencePeriodReducer(state, {
      type: 'draftStartChanged',
      value: '2025-02-10',
    })

    expect(keptEnd).toMatchObject({
      dataReferencePeriodStart: '2025-01-01',
      dataReferencePeriodEnd: '2025-01-31',
      draftDataReferencePeriodStart: '2025-01-10',
      draftDataReferencePeriodEnd: '2025-01-31',
    })
    expect(raisedEnd).toMatchObject({
      draftDataReferencePeriodStart: '2025-02-10',
      draftDataReferencePeriodEnd: '2025-02-10',
    })
    expect(getCandidateDataReferencePeriodQueryDirty(keptEnd)).toBe(true)
  })

  it('updates draft end and keeps or lowers draft start by policy', () => {
    const state = applyPeriod('2025-03-01', '2025-03-31')
    const keptStart = candidateDataReferencePeriodReducer(state, {
      type: 'draftEndChanged',
      value: '2025-03-20',
    })
    const loweredStart = candidateDataReferencePeriodReducer(state, {
      type: 'draftEndChanged',
      value: '2025-02-10',
    })

    expect(keptStart).toMatchObject({
      dataReferencePeriodStart: '2025-03-01',
      dataReferencePeriodEnd: '2025-03-31',
      draftDataReferencePeriodStart: '2025-03-01',
      draftDataReferencePeriodEnd: '2025-03-20',
    })
    expect(loweredStart).toMatchObject({
      draftDataReferencePeriodStart: '2025-02-10',
      draftDataReferencePeriodEnd: '2025-02-10',
    })
    expect(getCandidateDataReferencePeriodQueryDirty(loweredStart)).toBe(true)
  })

  it('resets every period field to blank state', () => {
    const state = candidateDataReferencePeriodReducer(
      applyPeriod('2025-01-01', '2025-01-31'),
      { type: 'draftEndChanged', value: '2025-02-15' },
    )
    const reset = candidateDataReferencePeriodReducer(state, { type: 'reset' })

    expect(reset).toEqual(initialCandidateDataReferencePeriodState)
    expect(getCandidateDataReferencePeriodQueryDirty(reset)).toBe(false)
  })
})
