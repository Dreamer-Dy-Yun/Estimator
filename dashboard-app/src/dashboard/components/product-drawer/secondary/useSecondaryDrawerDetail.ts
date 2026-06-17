import type { OrderSnapshotComparisonBasis } from '../../../../snapshot/orderSnapshotTypes'
import { useEffect, useMemo, useState } from 'react'
import { dashboardApi } from '../../../../api'
import type { ProductComparisonBaseSubjectRef, ProductComparisonTarget } from '../../../../api/types/drawer'
import type { SecondaryStockOrderCalcResult } from '../../../../api/types'
import type { ApiUnitErrorInfo, ProductSecondaryDetail } from '../../../../types'
import type { OrderSnapshotDocument } from '../../../../snapshot/orderSnapshotTypes'
import { getOrderSnapshotConfirmedQtyBySize } from '../../../../snapshot/orderSnapshotTypes'
import { makeApiErrorInfo } from '../apiErrorInfo'
import type { SalesForecastUnitEconomicsFields } from './model/salesForecastOrderInputModel'
import type { SecondarySizeOrderRestoreRow } from './model/secondarySizeOrderRows'

export type Params = {
  skuGroupKey: string
  expandPaneOpen: boolean
  baseSubject: ProductComparisonBaseSubjectRef
  comparisonTarget: ProductComparisonTarget | null
  hydrateSnapshot?: OrderSnapshotDocument | null
  pageName: string
}

export type SecondaryDetailRequestKey = {
  skuGroupKey: string
  baseSubject: ProductComparisonBaseSubjectRef
  comparisonTarget: ProductComparisonTarget | null
  hydrateSnapshot: OrderSnapshotDocument | null
}

export type SecondaryDetailState = {
  requestKey: SecondaryDetailRequestKey
  detail: ProductSecondaryDetail
}

export type SecondaryDetailErrorState = {
  requestKey: SecondaryDetailRequestKey
  error: ApiUnitErrorInfo
}

function snapshotHydrateError(pageName: string): ApiUnitErrorInfo {
  return {
    checkedAt: new Date().toISOString(),
    page: pageName,
    request: 'hydrateOrderSnapshot',
    error: '저장된 스냅샷이 현재 화면 복원 계약을 만족하지 않습니다.',
  }
}

function getSecondaryDetailFromSnapshot(
  hydrateSnapshot: OrderSnapshotDocument | null,
  skuGroupKey: string,
): ProductSecondaryDetail | null {
  if (hydrateSnapshot?.skuGroupKey !== skuGroupKey) return null
  const basis: OrderSnapshotComparisonBasis = hydrateSnapshot.drawer2.comparisonBasis
  if (basis.skuGroupKey !== skuGroupKey) return null
  const unitEconomics: SalesForecastUnitEconomicsFields | undefined = hydrateSnapshot.drawer2.unitEconomics
  if (unitEconomics == null) return null
  const display: SecondaryStockOrderCalcResult['display'] | undefined = hydrateSnapshot.drawer2.stockOrderResult?.display
  if (display == null) return null
  const displaySizeRowBySize: Map<string, SecondaryStockOrderCalcResult['display']['sizeRows'][number]> = new Map((display?.sizeRows ?? []).map((row: SecondaryStockOrderCalcResult['display']['sizeRows'][number]) : [string, SecondaryStockOrderCalcResult['display']['sizeRows'][number]] => [row.size, row]))
  if (hydrateSnapshot.drawer2.sizeOrders.some((row: SecondarySizeOrderRestoreRow) : boolean => !displaySizeRowBySize.has(row.size))) return null
  const confirmedQtyBySize: Record<string, number> = getOrderSnapshotConfirmedQtyBySize(hydrateSnapshot.drawer2.confirmed)
  return {
    skuGroupKey: basis.skuGroupKey,
    comparisonPrice: basis.comparisonPrice,
    comparisonQty: basis.comparisonQty,
    comparisonRatioBySize: { ...basis.comparisonRatioBySize },
    sizeRows: hydrateSnapshot.drawer2.sizeOrders.map((row: SecondarySizeOrderRestoreRow) : { size: string; selfRatio: number; confirmedQty: number; avgPrice: number; qty: number; availableStock: number; } => ({
      size: row.size,
      selfRatio: row.baseSharePct,
      confirmedQty: confirmedQtyBySize[row.size] ?? 0,
      avgPrice: unitEconomics.unitPrice,
      qty: row.forecastQty,
      availableStock: displaySizeRowBySize.get(row.size)!.currentStockQty,
    })),
  }
}

function normalizedSubjectSourceId(subject: { sourceId?: string }): string | undefined {
  const sourceId: string | undefined = subject.sourceId?.trim()
  return sourceId ? sourceId : undefined
}

export function getScopeSafeHydrateSnapshot(
  hydrateSnapshot: OrderSnapshotDocument | null,
  skuGroupKey: string,
  baseSubject: ProductComparisonBaseSubjectRef,
  comparisonTarget: ProductComparisonTarget | null,
): OrderSnapshotDocument | null {
  const baseScopeSafeHydrateSnapshot: OrderSnapshotDocument | null = getBaseScopeSafeHydrateSnapshot(hydrateSnapshot, skuGroupKey, baseSubject)
  if (baseScopeSafeHydrateSnapshot == null) return null
  if (comparisonTarget == null) return null

  const snapshotComparison = baseScopeSafeHydrateSnapshot.drawer2.comparisonSubject
  if (snapshotComparison.kind !== comparisonTarget.kind) return null
  if (normalizedSubjectSourceId(snapshotComparison) !== normalizedSubjectSourceId(comparisonTarget)) return null

  return baseScopeSafeHydrateSnapshot
}

export function getBaseScopeSafeHydrateSnapshot(
  hydrateSnapshot: OrderSnapshotDocument | null,
  skuGroupKey: string,
  baseSubject: ProductComparisonBaseSubjectRef,
): OrderSnapshotDocument | null {
  if (hydrateSnapshot == null) return null
  if (hydrateSnapshot.skuGroupKey !== skuGroupKey) return null

  const snapshotBase = hydrateSnapshot.drawer2.baseSubject
  if (snapshotBase.kind !== baseSubject.kind) return null
  if (normalizedSubjectSourceId(snapshotBase) !== normalizedSubjectSourceId(baseSubject)) return null

  return hydrateSnapshot
}

function isSameSecondaryDetailRequestKey(
  stateKey: SecondaryDetailRequestKey,
  currentKey: SecondaryDetailRequestKey,
): boolean {
  return (
    stateKey.skuGroupKey === currentKey.skuGroupKey &&
    stateKey.baseSubject === currentKey.baseSubject &&
    stateKey.comparisonTarget === currentKey.comparisonTarget &&
    stateKey.hydrateSnapshot === currentKey.hydrateSnapshot
  )
}

export function useSecondaryDrawerDetail({
  skuGroupKey,
  expandPaneOpen,
  baseSubject,
  comparisonTarget,
  hydrateSnapshot = null,
  pageName,
}: Params) : { secondaryDetail: ProductSecondaryDetail | null; secondaryDetailError: ApiUnitErrorInfo | null; hydrateForPanel: OrderSnapshotDocument | null; } {
  const [secondaryDetailState, setSecondaryDetailState]: [SecondaryDetailState | null, React.Dispatch<React.SetStateAction<SecondaryDetailState | null>>] = useState<SecondaryDetailState | null>(null)
  const [secondaryDetailErrorState, setSecondaryDetailErrorState]: [SecondaryDetailErrorState | null, React.Dispatch<React.SetStateAction<SecondaryDetailErrorState | null>>] = useState<SecondaryDetailErrorState | null>(null)

  const baseScopeSafeHydrateSnapshot: OrderSnapshotDocument | null = useMemo(
    () : OrderSnapshotDocument | null => getBaseScopeSafeHydrateSnapshot(hydrateSnapshot, skuGroupKey, baseSubject),
    [baseSubject, hydrateSnapshot, skuGroupKey],
  )

  const secondaryFromSnapshot: ProductSecondaryDetail | null = useMemo(
    () : ProductSecondaryDetail | null => getSecondaryDetailFromSnapshot(baseScopeSafeHydrateSnapshot, skuGroupKey),
    [baseScopeSafeHydrateSnapshot, skuGroupKey],
  )

  const secondaryDetailRequestKey: SecondaryDetailRequestKey = useMemo(
    () : SecondaryDetailRequestKey => ({ skuGroupKey, baseSubject, comparisonTarget, hydrateSnapshot: baseScopeSafeHydrateSnapshot }),
    [baseScopeSafeHydrateSnapshot, baseSubject, comparisonTarget, skuGroupKey],
  )

  const hydrateForPanel: OrderSnapshotDocument | null = secondaryFromSnapshot == null ? null : baseScopeSafeHydrateSnapshot

  useEffect(() : () => void => {
    let alive: boolean = true
    const requestKey: SecondaryDetailRequestKey = secondaryDetailRequestKey
    queueMicrotask(() : void => {
      if (!alive) return
      if (!expandPaneOpen) {
        setSecondaryDetailState(null)
        setSecondaryDetailErrorState(null)
        return
      }
      if (secondaryFromSnapshot) {
        setSecondaryDetailState({ requestKey, detail: secondaryFromSnapshot })
        setSecondaryDetailErrorState(null)
        return
      }
      if (baseScopeSafeHydrateSnapshot != null) {
        setSecondaryDetailState(null)
        setSecondaryDetailErrorState({
          requestKey,
          error: snapshotHydrateError(pageName),
        })
        return
      }
      if (comparisonTarget == null) {
        setSecondaryDetailState(null)
        setSecondaryDetailErrorState(null)
        return
      }
      setSecondaryDetailState(null)
      setSecondaryDetailErrorState(null)
      void (async () : Promise<void> => {
        try {
          const d: ProductSecondaryDetail = await dashboardApi.getProductSecondaryDetail(skuGroupKey, { base: baseSubject, comparison: comparisonTarget })
          if (!alive) return
          if (!d) throw new Error('Secondary detail data is empty.')
          setSecondaryDetailState({ requestKey, detail: d })
          setSecondaryDetailErrorState(null)
        } catch (err) {
          if (!alive) return
          setSecondaryDetailState(null)
          setSecondaryDetailErrorState({
            requestKey,
            error: makeApiErrorInfo(pageName, `getProductSecondaryDetail(${JSON.stringify({ skuGroupKey, base: baseSubject, comparison: comparisonTarget })})`, err),
          })
        }
      })()
    })
    return () : void => {
      alive = false
    }
  }, [baseScopeSafeHydrateSnapshot, baseSubject, comparisonTarget, expandPaneOpen, pageName, secondaryDetailRequestKey, secondaryFromSnapshot, skuGroupKey])

  const keyedSecondaryDetail: ProductSecondaryDetail | null =
    secondaryDetailState != null &&
    isSameSecondaryDetailRequestKey(secondaryDetailState.requestKey, secondaryDetailRequestKey)
      ? secondaryDetailState.detail
      : null
  const keyedSecondaryDetailError: ApiUnitErrorInfo | null =
    secondaryDetailErrorState != null &&
    isSameSecondaryDetailRequestKey(secondaryDetailErrorState.requestKey, secondaryDetailRequestKey)
      ? secondaryDetailErrorState.error
      : null
  const currentSecondaryDetail: ProductSecondaryDetail | null = !expandPaneOpen ? null : keyedSecondaryDetail ?? secondaryFromSnapshot
  const currentSecondaryDetailError: ApiUnitErrorInfo | null = !expandPaneOpen || currentSecondaryDetail != null ? null : keyedSecondaryDetailError

  return {
    secondaryDetail: currentSecondaryDetail,
    secondaryDetailError: currentSecondaryDetailError,
    hydrateForPanel,
  }
}
