import { useEffect, useMemo, useState } from 'react'
import { dashboardApi } from '../../../api'
import type { ApiUnitErrorInfo, ProductSecondaryDetail } from '../../../types'
import type { OrderSnapshotDocumentV1 } from '../../../snapshot/orderSnapshotTypes'
import { makeApiErrorInfo } from './apiErrorInfo'

type Params = {
  productId: string
  expandPaneOpen: boolean
  hydrateSnapshot?: OrderSnapshotDocumentV1 | null
  pageName: string
}

export function useProductSecondaryDetail({
  productId,
  expandPaneOpen,
  hydrateSnapshot = null,
  pageName,
}: Params) {
  const [secondaryDetail, setSecondaryDetail] = useState<ProductSecondaryDetail | null>(null)
  const [secondaryDetailError, setSecondaryDetailError] = useState<ApiUnitErrorInfo | null>(null)

  const secondaryFromSnapshot = useMemo(
    () =>
      hydrateSnapshot?.drawer2?.secondary != null && hydrateSnapshot.drawer2.secondary.id === productId
        ? hydrateSnapshot.drawer2.secondary
        : null,
    [hydrateSnapshot, productId],
  )

  const hydrateForPanel =
    hydrateSnapshot != null && hydrateSnapshot.productId === productId ? hydrateSnapshot : null

  useEffect(() => {
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
    let alive = true
    void (async () => {
      try {
        const d = await dashboardApi.getProductSecondaryDetail(productId)
        if (!alive) return
        if (!d) throw new Error('2차 상세 데이터가 비어 있습니다.')
        setSecondaryDetail(d)
        setSecondaryDetailError(null)
      } catch (err) {
        if (!alive) return
        setSecondaryDetail(null)
        setSecondaryDetailError(
          makeApiErrorInfo(pageName, `getProductSecondaryDetail(${JSON.stringify({ productId })})`, err),
        )
      }
    })()
    return () => {
      alive = false
    }
  }, [expandPaneOpen, pageName, productId, secondaryFromSnapshot])

  return {
    secondaryDetail,
    secondaryDetailError,
    hydrateForPanel,
  }
}
