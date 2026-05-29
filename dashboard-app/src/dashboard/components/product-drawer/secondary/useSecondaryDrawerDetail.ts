import { useEffect, useMemo, useState } from 'react'
import { dashboardApi } from '../../../../api'
import type { ApiUnitErrorInfo, ProductSecondaryDetail } from '../../../../types'
import type { OrderSnapshotDocumentV2 } from '../../../../snapshot/orderSnapshotTypes'
import { makeApiErrorInfo } from '../apiErrorInfo'

type Params = {
  skuGroupKey: string
  expandPaneOpen: boolean
  companyUuid?: string
  hydrateSnapshot?: OrderSnapshotDocumentV2 | null
  pageName: string
}

type SecondaryDetailRequestKey = {
  skuGroupKey: string
  companyUuid: string | null
  hydrateSnapshot: OrderSnapshotDocumentV2 | null
}

type SecondaryDetailState = {
  requestKey: SecondaryDetailRequestKey
  detail: ProductSecondaryDetail
}

type SecondaryDetailErrorState = {
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
  const basis = hydrateSnapshot.drawer2.competitorBasis
  if (basis.skuGroupKey !== skuGroupKey) return null
  const unitEconomics = hydrateSnapshot.drawer2.unitEconomics
  if (unitEconomics == null) return null
  const display = hydrateSnapshot.drawer2.stockOrderResult?.display
  if (display == null) return null
  const displaySizeRowBySize = new Map((display?.sizeRows ?? []).map((row) => [row.size, row]))
  if (hydrateSnapshot.drawer2.sizeOrders.some((row) => !displaySizeRowBySize.has(row.size))) return null
  return {
    skuGroupKey: basis.skuGroupKey,
    competitorPrice: basis.competitorPrice,
    competitorQty: basis.competitorQty,
    competitorRatioBySize: { ...basis.competitorRatioBySize },
    sizeRows: hydrateSnapshot.drawer2.sizeOrders.map((row) => ({
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
}: Params) {
  const [secondaryDetailState, setSecondaryDetailState] = useState<SecondaryDetailState | null>(null)
  const [secondaryDetailErrorState, setSecondaryDetailErrorState] = useState<SecondaryDetailErrorState | null>(null)

  const scopeSafeHydrateSnapshot = useMemo(
    () => getScopeSafeHydrateSnapshot(hydrateSnapshot, skuGroupKey, companyUuid),
    [companyUuid, hydrateSnapshot, skuGroupKey],
  )

  const secondaryFromSnapshot = useMemo(
    () => getSecondaryDetailFromSnapshot(scopeSafeHydrateSnapshot, skuGroupKey),
    [scopeSafeHydrateSnapshot, skuGroupKey],
  )

  const secondaryDetailRequestKey = useMemo(
    () => ({ skuGroupKey, companyUuid: companyUuid ?? null, hydrateSnapshot: scopeSafeHydrateSnapshot }),
    [companyUuid, scopeSafeHydrateSnapshot, skuGroupKey],
  )

  const hydrateForPanel = secondaryFromSnapshot == null ? null : scopeSafeHydrateSnapshot

  useEffect(() => {
    let alive = true
    const requestKey = secondaryDetailRequestKey
    queueMicrotask(() => {
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
      void (async () => {
        try {
          const d = await dashboardApi.getProductSecondaryDetail(skuGroupKey, { companyUuid })
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
    return () => {
      alive = false
    }
  }, [companyUuid, expandPaneOpen, pageName, scopeSafeHydrateSnapshot, secondaryDetailRequestKey, secondaryFromSnapshot, skuGroupKey])

  const keyedSecondaryDetail =
    secondaryDetailState != null &&
    isSameSecondaryDetailRequestKey(secondaryDetailState.requestKey, secondaryDetailRequestKey)
      ? secondaryDetailState.detail
      : null
  const keyedSecondaryDetailError =
    secondaryDetailErrorState != null &&
    isSameSecondaryDetailRequestKey(secondaryDetailErrorState.requestKey, secondaryDetailRequestKey)
      ? secondaryDetailErrorState.error
      : null
  const currentSecondaryDetail = !expandPaneOpen ? null : keyedSecondaryDetail ?? secondaryFromSnapshot
  const currentSecondaryDetailError = !expandPaneOpen || currentSecondaryDetail != null ? null : keyedSecondaryDetailError

  return {
    secondaryDetail: currentSecondaryDetail,
    secondaryDetailError: currentSecondaryDetailError,
    hydrateForPanel,
  }
}
