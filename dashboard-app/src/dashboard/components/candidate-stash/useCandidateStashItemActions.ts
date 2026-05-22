import { useCallback, useEffect, useRef, useState } from 'react'
import {
  deleteCandidateItem,
  deleteCandidateItems,
  getApiErrorDisplayMessage,
  updateCandidateItem,
  type CandidateItemDetail,
  type CandidateItemSummary,
  type CandidateStashSummary,
} from '../../../api'
import {
  createCandidateOrderExcelExport,
  downloadBlob,
} from '../../../utils/candidateOrderExcelExport'

type Args = {
  stashUuid: string
  companyUuid?: string
  detailTarget: CandidateStashSummary | null
  items: CandidateItemSummary[]
  itemDeleteTarget: CandidateItemSummary | null
  openedItemUuid: string | null
  closeDrawer: () => void
  refreshStashes: () => Promise<void>
  showToast: (message: string, options?: { variant?: 'success' | 'info' | 'error' }) => void
  onItemsDeleted?: (itemUuids: string[]) => void
  onItemsUnconfirmed?: (updatedItems: CandidateItemDetail[]) => void
}

export function useCandidateStashItemActions({
  stashUuid,
  companyUuid,
  detailTarget,
  items,
  itemDeleteTarget,
  openedItemUuid,
  closeDrawer,
  refreshStashes,
  showToast,
  onItemsDeleted,
  onItemsUnconfirmed,
}: Args) {
  const [itemDeleteBusy, setItemDeleteBusy] = useState(false)
  const [bulkDeleteBusy, setBulkDeleteBusy] = useState(false)
  const [bulkUnconfirmBusy, setBulkUnconfirmBusy] = useState(false)
  const [orderExportBusy, setOrderExportBusy] = useState(false)
  const [orderExportError, setOrderExportError] = useState<string | null>(null)
  const mountedRef = useRef(false)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  const requireCompanyUuid = useCallback(() => {
    if (companyUuid) return companyUuid
    throw new Error('오더 후보군은 회사 선택이 필요합니다.')
  }, [companyUuid])

  const refreshAfterMutation = useCallback(async (failureMessage: string) => {
    try {
      await refreshStashes()
      return true
    } catch {
      if (mountedRef.current) showToast(failureMessage, { variant: 'error' })
      return false
    }
  }, [refreshStashes, showToast])

  const confirmDeleteItem = useCallback(async () => {
    if (!itemDeleteTarget) return
    setItemDeleteBusy(true)
    try {
      try {
        const mutationCompanyUuid = requireCompanyUuid()
        await deleteCandidateItem(itemDeleteTarget.uuid, { companyUuid: mutationCompanyUuid })
      } catch (err) {
        if (mountedRef.current) showToast(getApiErrorDisplayMessage(err, '후보를 삭제하지 못했습니다.'), { variant: 'error' })
        throw err
      }
      if (!mountedRef.current) return
      if (openedItemUuid === itemDeleteTarget.uuid) closeDrawer()
      onItemsDeleted?.([itemDeleteTarget.uuid])
      const refreshed = await refreshAfterMutation('후보를 삭제했지만 목록을 새로고침하지 못했습니다.')
      if (refreshed) showToast('후보를 삭제했습니다.')
    } finally {
      if (mountedRef.current) setItemDeleteBusy(false)
    }
  }, [closeDrawer, itemDeleteTarget, onItemsDeleted, openedItemUuid, refreshAfterMutation, requireCompanyUuid, showToast])

  const confirmDeleteItems = useCallback(async (itemUuids: string[]) => {
    const uniqueUuids = [...new Set(itemUuids)]
    if (!uniqueUuids.length) return
    setBulkDeleteBusy(true)
    try {
      try {
        const mutationCompanyUuid = requireCompanyUuid()
        await deleteCandidateItems(stashUuid, uniqueUuids, { companyUuid: mutationCompanyUuid })
      } catch (err) {
        if (mountedRef.current) showToast(getApiErrorDisplayMessage(err, '선택 후보를 삭제하지 못했습니다.'), { variant: 'error' })
        throw err
      }
      if (!mountedRef.current) return
      if (openedItemUuid && uniqueUuids.includes(openedItemUuid)) closeDrawer()
      onItemsDeleted?.(uniqueUuids)
      const refreshed = await refreshAfterMutation('선택 후보를 삭제했지만 목록을 새로고침하지 못했습니다.')
      if (refreshed) showToast('선택한 후보를 삭제했습니다.')
    } finally {
      if (mountedRef.current) setBulkDeleteBusy(false)
    }
  }, [closeDrawer, onItemsDeleted, openedItemUuid, refreshAfterMutation, requireCompanyUuid, showToast, stashUuid])

  const confirmUnconfirmItems = useCallback(async (itemUuids: string[]) => {
    const uniqueUuids = [...new Set(itemUuids)]
    if (!uniqueUuids.length) return
    setBulkUnconfirmBusy(true)
    let shouldThrowBulkUnconfirmFailure = false
    let bulkUnconfirmFailure: unknown
    try {
      let results: PromiseSettledResult<CandidateItemDetail>[]
      try {
        const mutationCompanyUuid = requireCompanyUuid()
        results = await Promise.allSettled(uniqueUuids.map((itemUuid) => updateCandidateItem({
          itemUuid,
          companyUuid: mutationCompanyUuid,
          details: null,
          isLatestLlmComment: false,
        })))
      } catch (err) {
        if (mountedRef.current) showToast(getApiErrorDisplayMessage(err, '선택 후보 상세 확정을 해제하지 못했습니다.'), { variant: 'error' })
        throw err
      }
      if (!mountedRef.current) return
      const updatedItems = results.flatMap((result) => (
        result.status === 'fulfilled' ? [result.value] : []
      ))
      const failedCount = results.length - updatedItems.length
      if (updatedItems.length) {
        const updatedItemUuidSet = new Set(updatedItems.map((item) => item.uuid))
        onItemsUnconfirmed?.(updatedItems)
        if (openedItemUuid && updatedItemUuidSet.has(openedItemUuid)) closeDrawer()
        const refreshed = await refreshAfterMutation('상세 확정 해제는 반영됐지만 목록을 새로고침하지 못했습니다.')
        if (!refreshed && failedCount === 0) return
      }
      showToast(
        `상세 확정 해제: ${updatedItems.length}개 성공/${failedCount}개 실패했습니다.`,
        failedCount > 0
          ? { variant: 'error' }
          : undefined,
      )
      if (failedCount > 0) {
        const rejectedResult = results.find((result) => result.status === 'rejected')
        shouldThrowBulkUnconfirmFailure = true
        bulkUnconfirmFailure = rejectedResult?.status === 'rejected'
          ? rejectedResult.reason
          : new Error('선택 후보 상세 확정 일부를 해제하지 못했습니다.')
      }
    } finally {
      if (mountedRef.current) setBulkUnconfirmBusy(false)
    }
    if (shouldThrowBulkUnconfirmFailure) throw bulkUnconfirmFailure
  }, [closeDrawer, onItemsUnconfirmed, openedItemUuid, refreshAfterMutation, requireCompanyUuid, showToast])

  const downloadOrderExcel = useCallback(async (userName: string) => {
    if (!detailTarget) return
    if (!items.length) return
    if (items.some((item) => item.orderMetricStatus !== 'loaded' || !item.orderExport)) {
      setOrderExportError('오더 지표 계산이 완료되어야 엑셀을 다운로드할 수 있습니다.')
      return
    }
    setOrderExportBusy(true)
    setOrderExportError(null)
    try {
      const { blob, filename } = await createCandidateOrderExcelExport({
        stashName: detailTarget.name,
        userName,
        items,
      })
      if (!mountedRef.current) return
      downloadBlob(blob, filename)
      showToast('엑셀 다운로드 파일을 생성했습니다.')
    } catch (err) {
      if (!mountedRef.current) return
      const message = getApiErrorDisplayMessage(err, '엑셀 다운로드 파일을 생성하지 못했습니다.')
      setOrderExportError(message)
    } finally {
      if (mountedRef.current) setOrderExportBusy(false)
    }
  }, [detailTarget, items, showToast])

  return {
    itemDeleteBusy,
    bulkDeleteBusy,
    bulkUnconfirmBusy,
    orderExportBusy,
    orderExportError,
    confirmDeleteItem,
    confirmDeleteItems,
    confirmUnconfirmItems,
    downloadOrderExcel,
  }
}
