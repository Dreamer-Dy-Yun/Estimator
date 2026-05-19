export interface CandidateDataReferencePeriodRange {
  start: string
  end: string
}

export interface CandidateDataReferencePeriodState {
  dataReferencePeriodStart: string
  dataReferencePeriodEnd: string
  draftDataReferencePeriodStart: string
  draftDataReferencePeriodEnd: string
}

export interface ChangeCandidateDataReferenceDraftStartAction {
  type: 'draftStartChanged'
  value: string
}

export interface ChangeCandidateDataReferenceDraftEndAction {
  type: 'draftEndChanged'
  value: string
}

export interface ApplyCandidateDataReferencePeriodAction {
  type: 'periodApplied'
  start: string
  end: string
}

export interface ResetCandidateDataReferencePeriodAction {
  type: 'reset'
}

export type CandidateDataReferencePeriodAction =
  | ChangeCandidateDataReferenceDraftStartAction
  | ChangeCandidateDataReferenceDraftEndAction
  | ApplyCandidateDataReferencePeriodAction
  | ResetCandidateDataReferencePeriodAction

export const initialCandidateDataReferencePeriodState: CandidateDataReferencePeriodState = {
  dataReferencePeriodStart: '',
  dataReferencePeriodEnd: '',
  draftDataReferencePeriodStart: '',
  draftDataReferencePeriodEnd: '',
}

export function getCandidateDataReferencePeriodQueryDirty(
  state: CandidateDataReferencePeriodState,
): boolean {
  return state.draftDataReferencePeriodStart !== state.dataReferencePeriodStart
    || state.draftDataReferencePeriodEnd !== state.dataReferencePeriodEnd
}

export function normalizeCandidateDataReferenceAppliedPeriod(
  start: string,
  end: string,
): CandidateDataReferencePeriodRange | null {
  if (!start || !end) return null
  return normalizeRangeOnStartInputPolicy(start, end)
}

export function candidateDataReferencePeriodReducer(
  state: CandidateDataReferencePeriodState,
  action: CandidateDataReferencePeriodAction,
): CandidateDataReferencePeriodState {
  switch (action.type) {
    case 'draftStartChanged':
      return reduceDraftStartChanged(state, action.value)
    case 'draftEndChanged':
      return reduceDraftEndChanged(state, action.value)
    case 'periodApplied':
      return reducePeriodApplied(state, action.start, action.end)
    case 'reset':
      return replaceStateIfChanged(state, initialCandidateDataReferencePeriodState)
    default:
      return state
  }
}

function reduceDraftStartChanged(
  state: CandidateDataReferencePeriodState,
  value: string,
): CandidateDataReferencePeriodState {
  if (!value) return state
  const next = normalizeRangeOnStartInputPolicy(value, state.draftDataReferencePeriodEnd || value)
  return replaceStateIfChanged(state, {
    ...state,
    draftDataReferencePeriodStart: next.start,
    draftDataReferencePeriodEnd: next.end,
  })
}

function reduceDraftEndChanged(
  state: CandidateDataReferencePeriodState,
  value: string,
): CandidateDataReferencePeriodState {
  if (!value) return state
  const next = normalizeRangeOnEndInputPolicy(value, state.draftDataReferencePeriodStart || value)
  return replaceStateIfChanged(state, {
    ...state,
    draftDataReferencePeriodStart: next.start,
    draftDataReferencePeriodEnd: next.end,
  })
}

function reducePeriodApplied(
  state: CandidateDataReferencePeriodState,
  start: string,
  end: string,
): CandidateDataReferencePeriodState {
  const next = normalizeCandidateDataReferenceAppliedPeriod(start, end)
  if (!next) return state
  return replaceStateIfChanged(state, {
    dataReferencePeriodStart: next.start,
    dataReferencePeriodEnd: next.end,
    draftDataReferencePeriodStart: next.start,
    draftDataReferencePeriodEnd: next.end,
  })
}

function normalizeRangeOnStartInputPolicy(
  nextStartDate: string,
  currentEndDate: string,
): CandidateDataReferencePeriodRange {
  return {
    start: nextStartDate,
    end: nextStartDate > currentEndDate ? nextStartDate : currentEndDate,
  }
}

function normalizeRangeOnEndInputPolicy(
  nextEndDate: string,
  currentStartDate: string,
): CandidateDataReferencePeriodRange {
  return {
    start: nextEndDate < currentStartDate ? nextEndDate : currentStartDate,
    end: nextEndDate,
  }
}

function replaceStateIfChanged(
  current: CandidateDataReferencePeriodState,
  next: CandidateDataReferencePeriodState,
): CandidateDataReferencePeriodState {
  if (
    current.dataReferencePeriodStart === next.dataReferencePeriodStart
    && current.dataReferencePeriodEnd === next.dataReferencePeriodEnd
    && current.draftDataReferencePeriodStart === next.draftDataReferencePeriodStart
    && current.draftDataReferencePeriodEnd === next.draftDataReferencePeriodEnd
  ) {
    return current
  }
  return next
}
