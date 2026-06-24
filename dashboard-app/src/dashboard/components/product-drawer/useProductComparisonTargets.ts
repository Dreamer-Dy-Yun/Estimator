import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  dashboardApi,
  type ProductComparisonBaseSubjectRef,
  type ProductComparisonTarget,
  type ProductComparisonTargetKind,
} from '../../../api'
import type { ApiUnitErrorInfo } from '../../../types'
import { makeApiErrorInfo } from './apiErrorInfo'

export type ProductComparisonTargetIds = Record<ProductComparisonTargetKind, string>

export type ProductComparisonTargetsState = {
  comparisonTargets: ProductComparisonTarget[]
  comparisonMode: ProductComparisonTargetKind
  comparisonTarget: ProductComparisonTarget | null
  targetsLoading: boolean
  targetsError: ApiUnitErrorInfo | null
  setComparisonMode: React.Dispatch<React.SetStateAction<ProductComparisonTargetKind>>
  setComparisonTargetId: (next: string) => void
  setComparisonSubject: (next: ProductComparisonTarget) => void
}

const INITIAL_TARGET_IDS: ProductComparisonTargetIds = {
  'competitor-channel': '',
  'self-company': '',
}

function targetsByKind(
  targets: ProductComparisonTarget[],
  kind: ProductComparisonTargetKind,
): ProductComparisonTarget[] {
  return targets.filter((target: ProductComparisonTarget) : boolean => target.kind === kind)
}

function selectedTarget(
  targets: ProductComparisonTarget[],
  kind: ProductComparisonTargetKind,
  targetIds: ProductComparisonTargetIds,
): ProductComparisonTarget | null {
  const candidates: ProductComparisonTarget[] = targetsByKind(targets, kind)
  if (!candidates.length) return null
  const selectedId: string = targetIds[kind]
  if (selectedId === '') return candidates[0]!
  return candidates.find((target: ProductComparisonTarget) : boolean => target.id === selectedId) ?? null
}

function targetIdForLoadedTargets(
  targets: ProductComparisonTarget[],
  kind: ProductComparisonTargetKind,
  prev: ProductComparisonTargetIds,
): string {
  return prev[kind] !== '' ? prev[kind] : selectedTarget(targets, kind, prev)?.id ?? ''
}

export function useProductComparisonTargets({
  pageName,
  base,
}: {
  pageName: string
  base: ProductComparisonBaseSubjectRef
}): ProductComparisonTargetsState {
  const baseKey: string = useMemo(() : string => JSON.stringify(base), [base])
  const [comparisonTargets, setComparisonTargets]: [
    ProductComparisonTarget[],
    React.Dispatch<React.SetStateAction<ProductComparisonTarget[]>>,
  ] = useState<ProductComparisonTarget[]>([])
  const [loadedBaseKey, setLoadedBaseKey]: [
    string,
    React.Dispatch<React.SetStateAction<string>>,
  ] = useState<string>('')
  const [comparisonMode, setComparisonMode]: [
    ProductComparisonTargetKind,
    React.Dispatch<React.SetStateAction<ProductComparisonTargetKind>>,
  ] = useState<ProductComparisonTargetKind>('competitor-channel')
  const [targetIds, setTargetIds]: [
    ProductComparisonTargetIds,
    React.Dispatch<React.SetStateAction<ProductComparisonTargetIds>>,
  ] = useState<ProductComparisonTargetIds>(INITIAL_TARGET_IDS)
  const [targetsError, setTargetsError]: [
    ApiUnitErrorInfo | null,
    React.Dispatch<React.SetStateAction<ApiUnitErrorInfo | null>>,
  ] = useState<ApiUnitErrorInfo | null>(null)
  const [targetsLoading, setTargetsLoading]: [
    boolean,
    React.Dispatch<React.SetStateAction<boolean>>,
  ] = useState<boolean>(true)

  useEffect(() : () => void => {
    let alive: boolean = true
    void (async () : Promise<void> => {
      try {
        setTargetsLoading(true)
        setComparisonTargets([])
        setTargetIds(INITIAL_TARGET_IDS)
        setLoadedBaseKey('')
        const rows: ProductComparisonTarget[] = await dashboardApi.getProductComparisonTargets({ base })
        if (!alive) return
        setComparisonTargets(rows)
        setLoadedBaseKey(baseKey)
        setTargetIds((prev: ProductComparisonTargetIds) : ProductComparisonTargetIds => ({
          'competitor-channel': targetIdForLoadedTargets(rows, 'competitor-channel', prev),
          'self-company': targetIdForLoadedTargets(rows, 'self-company', prev),
        }))
        setTargetsError(null)
      } catch (err) {
        if (!alive) return
        setComparisonTargets([])
        setTargetIds(INITIAL_TARGET_IDS)
        setLoadedBaseKey('')
        setTargetsError(makeApiErrorInfo(pageName, 'getProductComparisonTargets()', err))
      } finally {
        if (alive) setTargetsLoading(false)
      }
    })()
    return () : void => {
      alive = false
    }
  }, [base, baseKey, pageName])

  const comparisonTargetsForBase: ProductComparisonTarget[] = useMemo(
    () : ProductComparisonTarget[] => loadedBaseKey === baseKey ? comparisonTargets : [],
    [baseKey, comparisonTargets, loadedBaseKey],
  )
  const effectiveTargetsLoading: boolean = targetsLoading || (loadedBaseKey !== baseKey && targetsError == null)
  const comparisonTarget: ProductComparisonTarget | null = useMemo(
    () : ProductComparisonTarget | null => selectedTarget(comparisonTargetsForBase, comparisonMode, targetIds),
    [comparisonMode, comparisonTargetsForBase, targetIds],
  )
  const comparisonModeRef: React.RefObject<ProductComparisonTargetKind> = useRef(comparisonMode)
  const targetIdsRef: React.RefObject<ProductComparisonTargetIds> = useRef(targetIds)

  useEffect(() : void => {
    comparisonModeRef.current = comparisonMode
    targetIdsRef.current = targetIds
  }, [comparisonMode, targetIds])

  const setComparisonTargetId: (next: string) => void = useCallback((next: string) : void => {
    const currentMode: ProductComparisonTargetKind = comparisonModeRef.current
    if (targetIdsRef.current[currentMode] === next) return
    setTargetIds((prev: ProductComparisonTargetIds) : ProductComparisonTargetIds => (
      prev[currentMode] === next
        ? prev
        : {
            ...prev,
            [currentMode]: next,
          }
    ))
  }, [])

  const setComparisonSubject: (next: ProductComparisonTarget) => void = useCallback((next: ProductComparisonTarget) : void => {
    if (comparisonModeRef.current === next.kind && targetIdsRef.current[next.kind] === next.id) return
    setComparisonMode((prev: ProductComparisonTargetKind) : ProductComparisonTargetKind => prev === next.kind ? prev : next.kind)
    setTargetIds((prev: ProductComparisonTargetIds) : ProductComparisonTargetIds => (
      prev[next.kind] === next.id
        ? prev
        : {
            ...prev,
            [next.kind]: next.id,
          }
    ))
  }, [])

  return {
    comparisonTargets: comparisonTargetsForBase,
    comparisonMode,
    comparisonTarget,
    targetsLoading: effectiveTargetsLoading,
    targetsError,
    setComparisonMode,
    setComparisonTargetId,
    setComparisonSubject,
  }
}
