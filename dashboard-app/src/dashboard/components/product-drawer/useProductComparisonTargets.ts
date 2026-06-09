import { useEffect, useMemo, useState } from 'react'
import {
  dashboardApi,
  type ProductComparisonBaseSubjectRef,
  type ProductComparisonTarget,
  type ProductComparisonTargetKind,
  type SecondaryCompetitorChannel,
} from '../../../api'
import type { ApiUnitErrorInfo } from '../../../types'
import { makeApiErrorInfo } from './apiErrorInfo'

export type ProductComparisonTargetIds = Record<ProductComparisonTargetKind, string>

export type ProductComparisonTargetsState = {
  comparisonTargets: ProductComparisonTarget[]
  comparisonMode: ProductComparisonTargetKind
  comparisonTarget: ProductComparisonTarget | null
  competitorChannels: SecondaryCompetitorChannel[]
  competitorChannelId: string
  targetsLoading: boolean
  targetsError: ApiUnitErrorInfo | null
  setComparisonMode: React.Dispatch<React.SetStateAction<ProductComparisonTargetKind>>
  setComparisonTargetId: (next: string) => void
  setCompetitorChannelId: (next: string) => void
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

function selectedCompetitorTarget(
  targets: ProductComparisonTarget[],
  competitorChannelId: string,
): ProductComparisonTarget | null {
  const candidates: ProductComparisonTarget[] = targetsByKind(targets, 'competitor-channel')
  if (!candidates.length) return null
  if (competitorChannelId === '') return candidates[0]!
  return candidates.find((target: ProductComparisonTarget) : boolean => target.sourceId === competitorChannelId) ?? null
}

function competitorChannelsFromTargets(targets: ProductComparisonTarget[]): SecondaryCompetitorChannel[] {
  return targetsByKind(targets, 'competitor-channel')
    .map((target: ProductComparisonTarget) : SecondaryCompetitorChannel => ({
      id: target.sourceId,
      label: target.label,
    }))
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
  const [comparisonTargets, setComparisonTargets]: [
    ProductComparisonTarget[],
    React.Dispatch<React.SetStateAction<ProductComparisonTarget[]>>,
  ] = useState<ProductComparisonTarget[]>([])
  const [comparisonMode, setComparisonMode]: [
    ProductComparisonTargetKind,
    React.Dispatch<React.SetStateAction<ProductComparisonTargetKind>>,
  ] = useState<ProductComparisonTargetKind>('competitor-channel')
  const [targetIds, setTargetIds]: [
    ProductComparisonTargetIds,
    React.Dispatch<React.SetStateAction<ProductComparisonTargetIds>>,
  ] = useState<ProductComparisonTargetIds>(INITIAL_TARGET_IDS)
  const [selectedCompetitorChannelId, setSelectedCompetitorChannelId]: [
    string,
    React.Dispatch<React.SetStateAction<string>>,
  ] = useState<string>('')
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
        const rows: ProductComparisonTarget[] = await dashboardApi.getProductComparisonTargets({ base })
        if (!alive) return
        setComparisonTargets(rows)
        setTargetIds((prev: ProductComparisonTargetIds) : ProductComparisonTargetIds => ({
          'competitor-channel': targetIdForLoadedTargets(rows, 'competitor-channel', prev),
          'self-company': targetIdForLoadedTargets(rows, 'self-company', prev),
        }))
        setSelectedCompetitorChannelId((prev: string) : string =>
          prev === '' ? selectedCompetitorTarget(rows, '')?.sourceId ?? '' : prev)
        setTargetsError(null)
      } catch (err) {
        if (!alive) return
        setComparisonTargets([])
        setTargetIds(INITIAL_TARGET_IDS)
        setSelectedCompetitorChannelId('')
        setTargetsError(makeApiErrorInfo(pageName, 'getProductComparisonTargets()', err))
      } finally {
        if (alive) setTargetsLoading(false)
      }
    })()
    return () : void => {
      alive = false
    }
  }, [base, pageName])

  const comparisonTarget: ProductComparisonTarget | null = useMemo(
    () : ProductComparisonTarget | null => (
      comparisonMode === 'competitor-channel'
        ? selectedCompetitorTarget(comparisonTargets, selectedCompetitorChannelId)
        : selectedTarget(comparisonTargets, comparisonMode, targetIds)
    ),
    [comparisonMode, comparisonTargets, selectedCompetitorChannelId, targetIds],
  )
  const competitorChannels: SecondaryCompetitorChannel[] = useMemo(
    () : SecondaryCompetitorChannel[] => competitorChannelsFromTargets(comparisonTargets),
    [comparisonTargets],
  )
  const competitorTarget: ProductComparisonTarget | null = useMemo(
    () : ProductComparisonTarget | null => selectedCompetitorTarget(comparisonTargets, selectedCompetitorChannelId),
    [comparisonTargets, selectedCompetitorChannelId],
  )
  const competitorChannelId: string = selectedCompetitorChannelId === '' ? competitorTarget?.sourceId ?? '' : selectedCompetitorChannelId

  const setComparisonTargetId: (next: string) => void = (next: string) : void => {
    if (comparisonMode === 'competitor-channel') {
      const target: ProductComparisonTarget | undefined = comparisonTargets.find(
        (candidate: ProductComparisonTarget) : boolean =>
          candidate.kind === 'competitor-channel' && candidate.id === next,
      )
      if (target == null) return
      setSelectedCompetitorChannelId(target.sourceId)
      return
    }
    setTargetIds((prev: ProductComparisonTargetIds) : ProductComparisonTargetIds => ({
      ...prev,
      [comparisonMode]: next,
    }))
  }

  const setCompetitorChannelId: (next: string) => void = (next: string) : void => {
    setSelectedCompetitorChannelId(next)
  }

  return {
    comparisonTargets,
    comparisonMode,
    comparisonTarget,
    competitorChannels,
    competitorChannelId,
    targetsLoading,
    targetsError,
    setComparisonMode,
    setComparisonTargetId,
    setCompetitorChannelId,
  }
}
