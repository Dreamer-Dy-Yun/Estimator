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

export function useSecondaryDrawerDetail({
  skuGroupKey,
  expandPaneOpen,
  hydrateSnapshot = null,
  pageName,
}: Params) {
  const { selectedCompanyUuid } = useAuth()
  const companyUuid = getCompanyUuidForOptionalScope(selectedCompanyUuid)
  const [secondaryDetail, setSecondaryDetail] = useState<ProductSecondaryDetail | null>(null)
  const [secondaryDetailError, setSecondaryDetailError] = useState<ApiUnitErrorInfo | null>(null)

  const secondaryFromSnapshot = useMemo(
    () =>
      hydrateSnapshot != null && hydrateSnapshot.drawer2.secondary.skuGroupKey === skuGroupKey
        ? hydrateSnapshot.drawer2.secondary
        : null,
    [hydrateSnapshot, skuGroupKey],
  )

  const hydrateForPanel =
    hydrateSnapshot != null && hydrateSnapshot.skuGroupKey === skuGroupKey ? hydrateSnapshot : null

  useEffect(() => {
    let alive = true
    queueMicrotask(() => {
      if (!alive) return
    if (!expandPaneOpen) {
      setSecondaryDetail(null)
      setSecondaryDetailError(null)
      return
    }
    if (secondaryFromSnapshot) {
      setSecondaryDetail(secondaryFromSnapshot)
      setSecondaryDetailError(null)
      return
    }
    setSecondaryDetail(null)
    setSecondaryDetailError(null)
    void (async () => {
      try {
        const d = await dashboardApi.getProductSecondaryDetail(skuGroupKey, { companyUuid })
        if (!alive) return
        if (!d) throw new Error('2차 상세 데이터가 비어 있습니다.')
        setSecondaryDetail(d)
        setSecondaryDetailError(null)
      } catch (err) {
        if (!alive) return
        setSecondaryDetail(null)
        setSecondaryDetailError(
          makeApiErrorInfo(pageName, `getProductSecondaryDetail(${JSON.stringify({ skuGroupKey, companyUuid })})`, err),
        )
      }
    })()
    })
    return () => {
      alive = false
    }
  }, [companyUuid, expandPaneOpen, pageName, skuGroupKey, secondaryFromSnapshot])

  return {
    secondaryDetail,
    secondaryDetailError,
    hydrateForPanel,
  }
}
