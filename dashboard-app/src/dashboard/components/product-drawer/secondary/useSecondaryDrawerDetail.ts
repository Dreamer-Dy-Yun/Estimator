import type { OrderSnapshotCompetitorBasisV2, OrderSnapshotSizeOrderV2, OrderSnapshotStockOrderDisplaySizeRowV2, OrderSnapshotStockOrderDisplayV2, OrderSnapshotUnitEconomicsV2 } from '../../../../snapshot/orderSnapshotTypes'
import { useEffect, useMemo, useState } from 'react'
import { dashboardApi } from '../../../../api'
import type { ApiUnitErrorInfo, ProductSecondaryDetail } from '../../../../types'
import type { OrderSnapshotDocumentV2 } from '../../../../snapshot/orderSnapshotTypes'
import { makeApiErrorInfo } from '../apiErrorInfo'

export type Params = {
  skuGroupKey: string
  expandPaneOpen: boolean
  companyUuid?: string
  hydrateSnapshot?: OrderSnapshotDocumentV2 | null
  pageName: string
}

export type SecondaryDetailRequestKey = {
  skuGroupKey: string
  companyUuid: string | null
  hydrateSnapshot: OrderSnapshotDocumentV2 | null
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
  hydrateSnapshot: OrderSnapshotDocumentV2 | null,
  skuGroupKey: string,
): ProductSecondaryDetail | null {
  if (hydrateSnapshot?.skuGroupKey !== skuGroupKey) return null
  const basis: OrderSnapshotCompetitorBasisV2 = hydrateSnapshot.drawer2.competitorBasis
  if (basis.skuGroupKey !== skuGroupKey) return null
  const unitEconomics: OrderSnapshotUnitEconomicsV2 | undefined = hydrateSnapshot.drawer2.unitEconomics
  if (unitEconomics == null) return null
  const display: OrderSnapshotStockOrderDisplayV2 | undefined = hydrateSnapshot.drawer2.stockOrderResult?.display
  if (display == null) return null
  const displaySizeRowBySize: Map<string, OrderSnapshotStockOrderDisplaySizeRowV2> = new Map((display?.sizeRows ?? []).map((row: OrderSnapshotStockOrderDisplaySizeRowV2) : [string, OrderSnapshotStockOrderDisplaySizeRowV2] => [row.size, row]))
  if (hydrateSnapshot.drawer2.sizeOrders.some((row: OrderSnapshotSizeOrderV2) : boolean => !displaySizeRowBySize.has(row.size))) return null
  return {
    skuGroupKey: basis.skuGroupKey,
    competitorPrice: basis.competitorPrice,
    competitorQty: basis.competitorQty,
    competitorRatioBySize: { ...basis.competitorRatioBySize },
    sizeRows: hydrateSnapshot.drawer2.sizeOrders.map((row: OrderSnapshotSizeOrderV2) : { size: string; selfRatio: number; confirmedQty: number; avgPrice: number; qty: number; availableStock: number; } => ({
      size: row.size,
      selfRatio: row.selfSharePct,
      confirmedQty: row.confirmQty,
      avgPrice: unitEconomics.unitPrice,
      qty: row.forecastQty,
      availableStock: displaySizeRowBySize.get(row.size)!.currentStockQty,
    })),
  }
}

export function getScopeSafeHydrateSnapshot(
  hydrateSnapshot: OrderSnapshotDocumentV2 | null,
  skuGroupKey: string,
  companyUuid: string | undefined,
): OrderSnapshotDocumentV2 | null {
  if (hydrateSnapshot == null) return null
  if (hydrateSnapshot.skuGroupKey !== skuGroupKey) return null

  if (companyUuid == null) {
    return hydrateSnapshot.companyUuid == null ? hydrateSnapshot : null
  }
  if (hydrateSnapshot.companyUuid !== companyUuid) return null

  return hydrateSnapshot
}

function isSameSecondaryDetailRequestKey(
  stateKey: SecondaryDetailRequestKey,
  currentKey: SecondaryDetailRequestKey,
): boolean {
  return (
    stateKey.skuGroupKey === currentKey.skuGroupKey &&
    stateKey.companyUuid === currentKey.companyUuid &&
    stateKey.hydrateSnapshot === currentKey.hydrateSnapshot
  )
}

export function useSecondaryDrawerDetail({
  skuGroupKey,
  expandPaneOpen,
  companyUuid,
  hydrateSnapshot = null,
  pageName,
}: Params) : { secondaryDetail: ProductSecondaryDetail | null; secondaryDetailError: ApiUnitErrorInfo | null; hydrateForPanel: OrderSnapshotDocumentV2 | null; } {
  const [secondaryDetailState, setSecondaryDetailState]: [SecondaryDetailState | null, React.Dispatch<React.SetStateAction<SecondaryDetailState | null>>] = useState<SecondaryDetailState | null>(null)
  const [secondaryDetailErrorState, setSecondaryDetailErrorState]: [SecondaryDetailErrorState | null, React.Dispatch<React.SetStateAction<SecondaryDetailErrorState | null>>] = useState<SecondaryDetailErrorState | null>(null)

  const scopeSafeHydrateSnapshot: OrderSnapshotDocumentV2 | null = useMemo(
    () : OrderSnapshotDocumentV2 | null => getScopeSafeHydrateSnapshot(hydrateSnapshot, skuGroupKey, companyUuid),
    [companyUuid, hydrateSnapshot, skuGroupKey],
  )

  const secondaryFromSnapshot: ProductSecondaryDetail | null = useMemo(
    () : ProductSecondaryDetail | null => getSecondaryDetailFromSnapshot(scopeSafeHydrateSnapshot, skuGroupKey),
    [scopeSafeHydrateSnapshot, skuGroupKey],
  )

  const secondaryDetailRequestKey: { skuGroupKey: string; companyUuid: string | null; hydrateSnapshot: OrderSnapshotDocumentV2 | null; } = useMemo(
    () : { skuGroupKey: string; companyUuid: string | null; hydrateSnapshot: OrderSnapshotDocumentV2 | null; } => ({ skuGroupKey, companyUuid: companyUuid ?? null, hydrateSnapshot: scopeSafeHydrateSnapshot }),
    [companyUuid, scopeSafeHydrateSnapshot, skuGroupKey],
  )

  const hydrateForPanel: OrderSnapshotDocumentV2 | null = secondaryFromSnapshot == null ? null : scopeSafeHydrateSnapshot

  useEffect(() : () => void => {
    let alive: boolean = true
    const requestKey: { skuGroupKey: string; companyUuid: string | null; hydrateSnapshot: OrderSnapshotDocumentV2 | null; } = secondaryDetailRequestKey
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
      if (scopeSafeHydrateSnapshot != null) {
        setSecondaryDetailState(null)
        setSecondaryDetailErrorState({
          requestKey,
          error: snapshotHydrateError(pageName),
        })
        return
      }
      setSecondaryDetailState(null)
      setSecondaryDetailErrorState(null)
      void (async () : Promise<void> => {
        try {
          const d: ProductSecondaryDetail = await dashboardApi.getProductSecondaryDetail(skuGroupKey, { companyUuid })
          if (!alive) return
          if (!d) throw new Error('Secondary detail data is empty.')
          setSecondaryDetailState({ requestKey, detail: d })
          setSecondaryDetailErrorState(null)
        } catch (err) {
          if (!alive) return
          setSecondaryDetailState(null)
          setSecondaryDetailErrorState({
            requestKey,
            error: makeApiErrorInfo(pageName, `getProductSecondaryDetail(${JSON.stringify({ skuGroupKey, companyUuid })})`, err),
          })
        }
      })()
    })
    return () : void => {
      alive = false
    }
  }, [companyUuid, expandPaneOpen, pageName, scopeSafeHydrateSnapshot, secondaryDetailRequestKey, secondaryFromSnapshot, skuGroupKey])

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
