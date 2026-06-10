import { useEffect, useRef } from 'react'
import type { Dispatch, RefObject, SetStateAction } from 'react'
import { snapshotMutationInputKey } from './secondaryCandidateActionModel'
import type {
  CandidateActionGuardSnapshot,
  CandidateActionScope,
  CandidateMutationState,
} from './secondaryCandidateActionTypes'

export type SecondaryCandidateActionGuardParams = {
  currentScope: CandidateActionScope
  currentMutationRef: RefObject<CandidateMutationState>
  setLoading: Dispatch<SetStateAction<boolean>>
}

export type SecondaryCandidateActionGuard = {
  readCurrentScope: () => CandidateActionScope
  consumeScopeChange: () => boolean
  beginCandidateListRequest: () => number
  isActiveCandidateListRequest: (reqSeq: number, scope: CandidateActionScope) => boolean
  isCurrentCandidateListRequest: (reqSeq: number) => boolean
  isActiveActionScope: (snapshot: CandidateActionGuardSnapshot) => boolean
  isActiveAction: (snapshot: CandidateActionGuardSnapshot) => boolean
  beginAction: (
    targetKind: CandidateActionGuardSnapshot['targetKind'],
    mutationInputKey?: string,
    actionCompanyUuid?: string,
  ) => CandidateActionGuardSnapshot
}

function areCandidateActionScopesEqual(left: CandidateActionScope, right: CandidateActionScope): boolean {
  return left.companyUuid === right.companyUuid
    && left.skuGroupKey === right.skuGroupKey
    && left.periodStart === right.periodStart
    && left.periodEnd === right.periodEnd
    && left.forecastMonths === right.forecastMonths
}

export function useSecondaryCandidateActionGuard({
  currentScope,
  currentMutationRef,
  setLoading,
}: SecondaryCandidateActionGuardParams): SecondaryCandidateActionGuard {
  const mountedRef: RefObject<boolean> = useRef(false)
  const candidateListReqSeqRef: RefObject<number> = useRef(0)
  const actionReqSeqRef: RefObject<number> = useRef(0)
  const currentScopeRef: RefObject<CandidateActionScope> = useRef<CandidateActionScope>(currentScope)
  const resetScopeRef: RefObject<CandidateActionScope> = useRef<CandidateActionScope>(currentScope)

  useEffect(() : () => void => {
    mountedRef.current = true
    return () : void => {
      mountedRef.current = false
      candidateListReqSeqRef.current += 1
      actionReqSeqRef.current += 1
    }
  }, [])

  useEffect(() : void => {
    currentScopeRef.current = currentScope
  }, [currentScope])

  const readCurrentScope: () => CandidateActionScope = () : CandidateActionScope => currentScopeRef.current

  const consumeScopeChange: () => boolean = () : boolean => {
    const nextScope: CandidateActionScope = currentScopeRef.current
    const current: CandidateActionScope = resetScopeRef.current
    if (areCandidateActionScopesEqual(current, nextScope)) return false
    resetScopeRef.current = nextScope
    candidateListReqSeqRef.current += 1
    actionReqSeqRef.current += 1
    return true
  }

  const beginCandidateListRequest: () => number = () : number => {
    const reqSeq: number = candidateListReqSeqRef.current + 1
    candidateListReqSeqRef.current = reqSeq
    return reqSeq
  }

  const isActiveCandidateListRequest: (
    reqSeq: number,
    scope: CandidateActionScope,
  ) => boolean = (reqSeq: number, scope: CandidateActionScope) : boolean => (
    mountedRef.current
    && candidateListReqSeqRef.current === reqSeq
    && areCandidateActionScopesEqual(currentScopeRef.current, scope)
  )

  const isCurrentCandidateListRequest: (reqSeq: number) => boolean = (reqSeq: number) : boolean => (
    candidateListReqSeqRef.current === reqSeq
  )

  const isActiveActionScope: (snapshot: CandidateActionGuardSnapshot) => boolean = (
    snapshot: CandidateActionGuardSnapshot,
  ) : boolean => (
    mountedRef.current
    && areCandidateActionScopesEqual(currentScopeRef.current, snapshot)
    && actionReqSeqRef.current === snapshot.actionSeq
  )

  const currentTargetIdentity: (
    targetKind: CandidateActionGuardSnapshot['targetKind'],
  ) => string = (targetKind: CandidateActionGuardSnapshot['targetKind']) : string => {
    const current: CandidateMutationState = currentMutationRef.current
    if (targetKind === 'append') return current.appendTarget
    if (targetKind === 'create') return current.createTarget
    if (targetKind === 'item') return current.itemTarget
    return ''
  }

  const currentSnapshotMutationInputKey: () => string | null = () : string | null => {
    if (!currentMutationRef.current.canBuildSnapshot) return null
    try {
      return snapshotMutationInputKey(currentMutationRef.current.buildSnapshot())
    } catch {
      return null
    }
  }

  const isActiveAction: (snapshot: CandidateActionGuardSnapshot) => boolean = (
    snapshot: CandidateActionGuardSnapshot,
  ) : boolean => (
    isActiveActionScope(snapshot)
    && currentTargetIdentity(snapshot.targetKind) === snapshot.targetIdentity
    && (snapshot.mutationInputKey === '' || currentSnapshotMutationInputKey() === snapshot.mutationInputKey)
  )

  const beginAction: SecondaryCandidateActionGuard['beginAction'] = (
    targetKind: CandidateActionGuardSnapshot['targetKind'],
    mutationInputKey: string = '',
    actionCompanyUuid: string = currentScopeRef.current.companyUuid,
  ): CandidateActionGuardSnapshot => {
    const actionSeq: number = actionReqSeqRef.current + 1
    actionReqSeqRef.current = actionSeq
    setLoading(true)
    return {
      ...currentScopeRef.current,
      companyUuid: actionCompanyUuid,
      targetKind,
      targetIdentity: currentTargetIdentity(targetKind),
      mutationInputKey,
      actionSeq,
    }
  }

  return {
    readCurrentScope,
    consumeScopeChange,
    beginCandidateListRequest,
    isActiveCandidateListRequest,
    isCurrentCandidateListRequest,
    isActiveActionScope,
    isActiveAction,
    beginAction,
  }
}
