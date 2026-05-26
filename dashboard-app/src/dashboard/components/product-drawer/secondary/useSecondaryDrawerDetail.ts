import { useEffect, useMemo, useState } from 'react'
import { dashboardApi, getCompanyUuidForOptionalScope } from '../../../../api'
import { useAuth } from '../../../../auth/AuthContext'
import type { ApiUnitErrorInfo, ProductSecondaryDetail } from '../../../../types'
import type { OrderSnapshotDocumentV1 } from '../../../../snapshot/orderSnapshotTypes'
import { makeApiErrorInfo } from '../apiErrorInfo'

type Params = {
  skuGroupKey: string
  expandPaneOpen: boolean
  hydrateSnapshot?: OrderSnapshotDocumentV1 | null
  pageName: string
}

type SecondaryDetailRequestKey = {
  skuGroupKey: string
  companyUuid: string | null
  hydrateSnapshot: OrderSnapshotDocumentV1 | null
}

type SecondaryDetailState = {
  requestKey: SecondaryDetailRequestKey
  detail: ProductSecondaryDetail
}

type SecondaryDetailErrorState = {
  requestKey: SecondaryDetailRequestKey
  error: ApiUnitErrorInfo
}

function getSecondaryDetailFromSnapshot(
  hydrateSnapshot: OrderSnapshotDocumentV1 | null,
  skuGroupKey: string,
): ProductSecondaryDetail | null {
  if (hydrateSnapshot?.skuGroupKey !== skuGroupKey) return null
  const basis = hydrateSnapshot.drawer2.competitorSalesBasis
  if (basis.skuGroupKey !== skuGroupKey) return null
  return {
    skuGroupKey: basis.skuGroupKey,
    competitorPrice: basis.competitorPrice,
    competitorQty: basis.competitorQty,
    competitorRatioBySize: { ...basis.competitorRatioBySize },
  }
}

function getScopeSafeHydrateSnapshot(
  hydrateSnapshot: OrderSnapshotDocumentV1 | null,
  skuGroupKey: string,
  companyUuid: string | undefined,
): OrderSnapshotDocumentV1 | null {
  if (hydrateSnapshot == null) return null
  if (hydrateSnapshot.skuGroupKey !== skuGroupKey) return null

  // OrderSnapshotDocumentV1 does not persist companyUuid. In a company-scoped
  // drawer we cannot prove that a saved snapshot belongs to the current
  // company, so API-keyed state must win until the snapshot contract carries
  // company scope explicitly.
  if (companyUuid != null) return null

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
  hydrateSnapshot = null,
  pageName,
}: Params) {
  const { selectedCompanyUuid } = useAuth()
  const companyUuid = getCompanyUuidForOptionalScope(selectedCompanyUuid)
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

  const hydrateForPanel = scopeSafeHydrateSnapshot

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
      setSecondaryDetailState(null)
      setSecondaryDetailErrorState(null)
      void (async () => {
        try {
          const d = await dashboardApi.getProductSecondaryDetail(skuGroupKey, { companyUuid })
          if (!alive) return
          if (!d) throw new Error('2차 상세 데이터가 비어 있습니다.')
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
  }, [companyUuid, expandPaneOpen, pageName, secondaryDetailRequestKey, secondaryFromSnapshot, skuGroupKey])

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
