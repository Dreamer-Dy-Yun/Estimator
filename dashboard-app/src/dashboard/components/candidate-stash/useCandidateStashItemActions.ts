import { useCallback, useEffect, useRef, useState } from 'react'
import {
  deleteCandidateItem,
  deleteCandidateItems,
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
  detailTarget: CandidateStashSummary | null
  items: CandidateItemSummary[]
  itemDeleteTarget: CandidateItemSummary | null
  openedItemUuid: string | null
  closeDrawer: () => void
  loadItems: () => Promise<void>
  refreshStashes: () => Promise<void>
  showToast: (message: string) => void
  onItemsUnconfirmed?: (updatedItems: CandidateItemDetail[]) => void
}

export function useCandidateStashItemActions({
  stashUuid,
  detailTarget,
  items,
  itemDeleteTarget,
  openedItemUuid,
  closeDrawer,
  loadItems,
  refreshStashes,
  showToast,
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

  const confirmDeleteItem = useCallback(async () => {
    if (!itemDeleteTarget) return
    setItemDeleteBusy(true)
    try {
      await deleteCandidateItem(itemDeleteTarget.uuid)
      if (!mountedRef.current) return
      if (openedItemUuid === itemDeleteTarget.uuid) closeDrawer()
      await loadItems()
      await refreshStashes()
      showToast('후보를 삭제했습니다.')
    } finally {
      if (mountedRef.current) setItemDeleteBusy(false)
    }
  }, [closeDrawer, itemDeleteTarget, loadItems, openedItemUuid, refreshStashes, showToast])

  const confirmDeleteItems = useCallback(async (itemUuids: string[]) => {
    const uniqueUuids = [...new Set(itemUuids)]
    if (!uniqueUuids.length) return
    setBulkDeleteBusy(true)
    try {
      await deleteCandidateItems(stashUuid, uniqueUuids)
      if (!mountedRef.current) return
      if (openedItemUuid && uniqueUuids.includes(openedItemUuid)) closeDrawer()
      await loadItems()
      await refreshStashes()
      showToast('선택한 후보를 삭제했습니다.')
    } finally {
      if (mountedRef.current) setBulkDeleteBusy(false)
    }
  }, [closeDrawer, loadItems, openedItemUuid, refreshStashes, showToast, stashUuid])

  const confirmUnconfirmItems = useCallback(async (itemUuids: string[]) => {
    const uniqueUuids = [...new Set(itemUuids)]
    if (!uniqueUuids.length) return
    setBulkUnconfirmBusy(true)
    try {
      const updatedItems = await Promise.all(uniqueUuids.map((itemUuid) => updateCandidateItem({
        itemUuid,
        details: null,
        isLatestLlmComment: false,
      })))
      if (!mountedRef.current) return
      onItemsUnconfirmed?.(updatedItems)
      if (openedItemUuid && uniqueUuids.includes(openedItemUuid)) closeDrawer()
      await loadItems()
      await refreshStashes()
      showToast('선택한 후보의 상세확정을 해제했습니다.')
    } finally {
      if (mountedRef.current) setBulkUnconfirmBusy(false)
    }
  }, [closeDrawer, loadItems, onItemsUnconfirmed, openedItemUuid, refreshStashes, showToast])

  const downloadOrderExcel = useCallback(async (userName: string) => {
    if (!detailTarget) return
    if (!items.length) return
    if (items.some((item) => item.orderMetricStatus !== 'loaded' || !item.orderExport)) {
      setOrderExportError('오더 지표 계산이 완료된 뒤 엑셀을 다운로드할 수 있습니다.')
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
      const message = err instanceof Error ? err.message : '엑셀 다운로드 파일 생성에 실패했습니다.'
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
