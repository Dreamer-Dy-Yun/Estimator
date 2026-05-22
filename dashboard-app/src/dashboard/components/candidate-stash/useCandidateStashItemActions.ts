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

type CandidateItemActionScope = {
  stashUuid: string
  companyUuid?: string
  drawerItemUuid: string | null
  itemTargetUuid?: string | null
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
  const currentItemDeleteTargetUuid = itemDeleteTarget?.uuid ?? null
  const mountedRef = useRef(false)
  const currentActionScopeRef = useRef<CandidateItemActionScope>({
    stashUuid,
    ...(companyUuid ? { companyUuid } : {}),
    drawerItemUuid: openedItemUuid,
    itemTargetUuid: currentItemDeleteTargetUuid,
  })
  const itemDeleteRequestRef = useRef(0)
  const bulkDeleteRequestRef = useRef(0)
  const bulkUnconfirmRequestRef = useRef(0)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  useEffect(() => {
    const currentScope = currentActionScopeRef.current
    const scopeChanged = currentScope.stashUuid !== stashUuid
      || currentScope.companyUuid !== companyUuid
      || currentScope.drawerItemUuid !== openedItemUuid
    const itemTargetChanged = currentScope.itemTargetUuid !== currentItemDeleteTargetUuid
    currentActionScopeRef.current = {
      stashUuid,
      ...(companyUuid ? { companyUuid } : {}),
      drawerItemUuid: openedItemUuid,
      itemTargetUuid: currentItemDeleteTargetUuid,
    }
    if (scopeChanged) {
      setItemDeleteBusy(false)
      setBulkDeleteBusy(false)
      setBulkUnconfirmBusy(false)
    } else if (itemTargetChanged) {
      setItemDeleteBusy(false)
    }
  }, [companyUuid, currentItemDeleteTargetUuid, openedItemUuid, stashUuid])

  const requireCompanyUuid = useCallback((scope: CandidateItemActionScope) => {
    if (scope.companyUuid) return scope.companyUuid
    throw new Error('오더 후보군은 회사 선택이 필요합니다.')
  }, [])

  const createActionScope = useCallback((itemTargetUuid?: string | null): CandidateItemActionScope => {
    const scope: CandidateItemActionScope = {
      stashUuid,
      ...(companyUuid ? { companyUuid } : {}),
      drawerItemUuid: openedItemUuid,
    }
    if (itemTargetUuid !== undefined) scope.itemTargetUuid = itemTargetUuid
    return scope
  }, [companyUuid, openedItemUuid, stashUuid])

  const isCurrentActionScope = useCallback((scope: CandidateItemActionScope) => {
    const currentScope = currentActionScopeRef.current
    return currentScope.stashUuid === scope.stashUuid
      && currentScope.companyUuid === scope.companyUuid
      && currentScope.drawerItemUuid === scope.drawerItemUuid
      && (
        scope.itemTargetUuid === undefined
        || currentScope.itemTargetUuid === scope.itemTargetUuid
      )
  }, [])

  const refreshAfterMutation = useCallback(async (failureMessage: string, canReflect: () => boolean) => {
    if (!canReflect()) return false
    try {
      await refreshStashes()
      if (!canReflect()) return false
      return true
    } catch {
      if (canReflect()) showToast(failureMessage, { variant: 'error' })
      return false
    }
  }, [refreshStashes, showToast])

  const confirmDeleteItem = useCallback(async () => {
    if (!itemDeleteTarget) return
    const targetItem = itemDeleteTarget
    const actionScope = createActionScope(targetItem.uuid)
    itemDeleteRequestRef.current += 1
    const actionRequestId = itemDeleteRequestRef.current
    const canReflect = () => (
      itemDeleteRequestRef.current === actionRequestId
        && isCurrentActionScope(actionScope)
    )
    setItemDeleteBusy(true)
    try {
      try {
        const mutationCompanyUuid = requireCompanyUuid(actionScope)
        await deleteCandidateItem(targetItem.uuid, { companyUuid: mutationCompanyUuid })
      } catch (err) {
        if (canReflect()) showToast(getApiErrorDisplayMessage(err, '후보를 삭제하지 못했습니다.'), { variant: 'error' })
        throw err
      }
      if (!canReflect()) return
      onItemsDeleted?.([targetItem.uuid])
      const refreshed = await refreshAfterMutation('후보를 삭제했지만 목록을 새로고침하지 못했습니다.', canReflect)
      if (refreshed && canReflect()) showToast('후보를 삭제했습니다.')
      if (canReflect() && actionScope.drawerItemUuid === targetItem.uuid) closeDrawer()
    } finally {
      if (canReflect()) setItemDeleteBusy(false)
    }
  }, [isCurrentActionScope, closeDrawer, createActionScope, itemDeleteTarget, onItemsDeleted, refreshAfterMutation, requireCompanyUuid, showToast])

  const confirmDeleteItems = useCallback(async (itemUuids: string[]) => {
    const itemUuidsSnapshot = [...new Set(itemUuids)]
    if (!itemUuidsSnapshot.length) return
    const actionScope = createActionScope()
    bulkDeleteRequestRef.current += 1
    const actionRequestId = bulkDeleteRequestRef.current
    const canReflect = () => (
      bulkDeleteRequestRef.current === actionRequestId
        && isCurrentActionScope(actionScope)
    )
    setBulkDeleteBusy(true)
    try {
      try {
        const mutationCompanyUuid = requireCompanyUuid(actionScope)
        await deleteCandidateItems(actionScope.stashUuid, itemUuidsSnapshot, { companyUuid: mutationCompanyUuid })
      } catch (err) {
        if (canReflect()) showToast(getApiErrorDisplayMessage(err, '선택 후보를 삭제하지 못했습니다.'), { variant: 'error' })
        throw err
      }
      if (!canReflect()) return
      onItemsDeleted?.(itemUuidsSnapshot)
      const refreshed = await refreshAfterMutation('선택 후보를 삭제했지만 목록을 새로고침하지 못했습니다.', canReflect)
      if (refreshed && canReflect()) showToast('선택한 후보를 삭제했습니다.')
      if (canReflect() && actionScope.drawerItemUuid && itemUuidsSnapshot.includes(actionScope.drawerItemUuid)) {
        closeDrawer()
      }
    } finally {
      if (canReflect()) setBulkDeleteBusy(false)
    }
  }, [isCurrentActionScope, closeDrawer, createActionScope, onItemsDeleted, refreshAfterMutation, requireCompanyUuid, showToast])

  const confirmUnconfirmItems = useCallback(async (itemUuids: string[]) => {
    const itemUuidsSnapshot = [...new Set(itemUuids)]
    if (!itemUuidsSnapshot.length) return
    const actionScope = createActionScope()
    bulkUnconfirmRequestRef.current += 1
    const actionRequestId = bulkUnconfirmRequestRef.current
    const canReflect = () => (
      bulkUnconfirmRequestRef.current === actionRequestId
        && isCurrentActionScope(actionScope)
    )
    setBulkUnconfirmBusy(true)
    let shouldThrowBulkUnconfirmFailure = false
    let bulkUnconfirmFailure: unknown
    try {
      let results: PromiseSettledResult<CandidateItemDetail>[]
      try {
        const mutationCompanyUuid = requireCompanyUuid(actionScope)
        results = await Promise.allSettled(itemUuidsSnapshot.map((itemUuid) => updateCandidateItem({
          itemUuid,
          companyUuid: mutationCompanyUuid,
          details: null,
          isLatestLlmComment: false,
        })))
      } catch (err) {
        if (canReflect()) showToast(getApiErrorDisplayMessage(err, '선택 후보 상세 확정을 해제하지 못했습니다.'), { variant: 'error' })
        throw err
      }
      if (!canReflect()) return
      const updatedItems = results.flatMap((result) => (
        result.status === 'fulfilled' ? [result.value] : []
      ))
      const failedCount = results.length - updatedItems.length
      if (updatedItems.length) {
        const updatedItemUuidSet = new Set(updatedItems.map((item) => item.uuid))
        onItemsUnconfirmed?.(updatedItems)
        const refreshed = await refreshAfterMutation('상세 확정 해제는 반영됐지만 목록을 새로고침하지 못했습니다.', canReflect)
        if (!refreshed && failedCount === 0) return
        if (canReflect() && actionScope.drawerItemUuid && updatedItemUuidSet.has(actionScope.drawerItemUuid)) {
          closeDrawer()
        }
      }
      if (!canReflect()) return
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
      if (canReflect()) setBulkUnconfirmBusy(false)
    }
    if (shouldThrowBulkUnconfirmFailure) throw bulkUnconfirmFailure
  }, [isCurrentActionScope, closeDrawer, createActionScope, onItemsUnconfirmed, refreshAfterMutation, requireCompanyUuid, showToast])

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
