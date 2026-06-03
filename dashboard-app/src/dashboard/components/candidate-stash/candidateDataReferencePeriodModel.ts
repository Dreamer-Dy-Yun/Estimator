export interface CandidateDataReferencePeriodState {
  dataReferencePeriodStart: string
  dataReferencePeriodEnd: string
  draftDataReferencePeriodStart: string
  draftDataReferencePeriodEnd: string
}

export type CandidateDataReferencePeriodAction =
  | { type: 'draftStartChanged'; value: string }
  | { type: 'draftEndChanged'; value: string }
  | { type: 'periodApplied'; start: string; end: string }
  | { type: 'reset' }

export const initialCandidateDataReferencePeriodState: CandidateDataReferencePeriodState = {
  dataReferencePeriodStart: '',
  dataReferencePeriodEnd: '',
  draftDataReferencePeriodStart: '',
  draftDataReferencePeriodEnd: '',
}

export function getCandidateDataReferencePeriodQueryDirty(state: CandidateDataReferencePeriodState): boolean {
  return state.draftDataReferencePeriodStart !== state.dataReferencePeriodStart
    || state.draftDataReferencePeriodEnd !== state.dataReferencePeriodEnd
}

export function normalizeCandidateDataReferenceAppliedPeriod(start: string, end: string) : { start: string; end: string; } | null {
  return start && end ? { start, end: start > end ? start : end } : null
}

function samePeriodState(a: CandidateDataReferencePeriodState, b: CandidateDataReferencePeriodState) : boolean {
  return a.dataReferencePeriodStart === b.dataReferencePeriodStart
    && a.dataReferencePeriodEnd === b.dataReferencePeriodEnd
    && a.draftDataReferencePeriodStart === b.draftDataReferencePeriodStart
    && a.draftDataReferencePeriodEnd === b.draftDataReferencePeriodEnd
}

function replaceIfChanged(current: CandidateDataReferencePeriodState, next: CandidateDataReferencePeriodState) : CandidateDataReferencePeriodState {
  return samePeriodState(current, next) ? current : next
}

export function candidateDataReferencePeriodReducer(
  state: CandidateDataReferencePeriodState,
  action: CandidateDataReferencePeriodAction,
): CandidateDataReferencePeriodState {
  if (action.type === 'reset') return replaceIfChanged(state, initialCandidateDataReferencePeriodState)
  if (action.type === 'periodApplied') {
    const next: { start: string; end: string; } | null = normalizeCandidateDataReferenceAppliedPeriod(action.start, action.end)
    return next ? replaceIfChanged(state, {
      dataReferencePeriodStart: next.start,
      dataReferencePeriodEnd: next.end,
      draftDataReferencePeriodStart: next.start,
      draftDataReferencePeriodEnd: next.end,
    }) : state
  }
  if (!action.value) return state
  const draftStart: string = action.type === 'draftStartChanged'
    ? action.value
    : action.value < (state.draftDataReferencePeriodStart || action.value)
      ? action.value
      : state.draftDataReferencePeriodStart || action.value
  const draftEnd: string = action.type === 'draftEndChanged'
    ? action.value
    : action.value > (state.draftDataReferencePeriodEnd || action.value)
      ? action.value
      : state.draftDataReferencePeriodEnd || action.value
  return replaceIfChanged(state, {
    ...state,
    draftDataReferencePeriodStart: draftStart,
    draftDataReferencePeriodEnd: draftEnd,
  })
}
