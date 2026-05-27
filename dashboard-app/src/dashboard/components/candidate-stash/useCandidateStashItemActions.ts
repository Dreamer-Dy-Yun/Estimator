import { useCallback, useEffect, useRef, useState, type MutableRefObject } from 'react'
import {
  deleteCandidateItem,
  deleteCandidateItems,
  getApiErrorDisplayMessage,
  updateCandidateItem,
  type CandidateItemDetail,
  type CandidateItemSummary,
  type CandidateStashSummary,
} from '../../../api'
import { createCandidateOrderExcelExport, downloadBlob } from '../../../utils/candidateOrderExcelExport'
import type { CandidateItemActionScope, CandidateShowToast } from './candidateStashDetailTypes'

type Args = {
  stashUuid: string
  companyUuid?: string
  detailTarget: CandidateStashSummary | null
  items: CandidateItemSummary[]
  itemDeleteTarget: CandidateItemSummary | null
  openedItemUuid: string | null
  closeDrawer: () => void
  refreshStashes: () => Promise<void>
  showToast: CandidateShowToast
  onItemsDeleted?: (itemUuids: string[]) => void
  onItemsUnconfirmed?: (updatedItems: CandidateItemDetail[]) => void
}

type RequestRef = MutableRefObject<number>

const COMPANY_REQUIRED_MESSAGE = '오더 후보군 작업은 회사 선택이 필요합니다.'

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
  const itemDeleteRequestRef = useRef(0)
  const bulkDeleteRequestRef = useRef(0)
  const bulkUnconfirmRequestRef = useRef(0)
  const currentItemDeleteTargetUuid = itemDeleteTarget?.uuid ?? null
  const currentActionScopeRef = useRef<CandidateItemActionScope>(createScope(stashUuid, companyUuid, openedItemUuid, currentItemDeleteTargetUuid))

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  useEffect(() => {
    const previous = currentActionScopeRef.current
    const next = createScope(stashUuid, companyUuid, openedItemUuid, currentItemDeleteTargetUuid)
    const scopeChanged = previous.stashUuid !== next.stashUuid || previous.companyUuid !== next.companyUuid || previous.drawerItemUuid !== next.drawerItemUuid
    currentActionScopeRef.current = next
    if (scopeChanged) {
      setItemDeleteBusy(false)
      setBulkDeleteBusy(false)
      setBulkUnconfirmBusy(false)
    } else if (previous.itemTargetUuid !== next.itemTargetUuid) {
      setItemDeleteBusy(false)
    }
  }, [companyUuid, currentItemDeleteTargetUuid, openedItemUuid, stashUuid])

  const isCurrentActionScope = useCallback((scope: CandidateItemActionScope) => {
    const current = currentActionScopeRef.current
    return current.stashUuid === scope.stashUuid
      && current.companyUuid === scope.companyUuid
      && current.drawerItemUuid === scope.drawerItemUuid
      && (scope.itemTargetUuid === undefined || current.itemTargetUuid === scope.itemTargetUuid)
  }, [])

  const createCanReflectAction = useCallback((scope: CandidateItemActionScope, requestRef: RequestRef, requestId: number) => () => (
    mountedRef.current && requestRef.current === requestId && isCurrentActionScope(scope)
  ), [isCurrentActionScope])

  const beginAction = useCallback((scope: CandidateItemActionScope, requestRef: RequestRef, setBusy: (busy: boolean) => void) => {
    requestRef.current += 1
    const requestId = requestRef.current
    setBusy(true)
    return createCanReflectAction(scope, requestRef, requestId)
  }, [createCanReflectAction])

  const refreshAfterMutation = useCallback(async (failureMessage: string, canReflect: () => boolean) => {
    if (!canReflect()) return null
    try {
      await refreshStashes()
      return null
    } catch {
      return canReflect() ? failureMessage : null
    }
  }, [refreshStashes])

  const confirmDeleteItem = useCallback(async () => {
    if (!itemDeleteTarget) return
    const target = itemDeleteTarget
    const actionScope = createScope(stashUuid, companyUuid, openedItemUuid, target.uuid)
    const canReflect = beginAction(actionScope, itemDeleteRequestRef, setItemDeleteBusy)
    try {
      try {
        await deleteCandidateItem(target.uuid, { companyUuid: requireCompanyUuid(actionScope) })
      } catch (err) {
        if (canReflect()) showToast(getApiErrorDisplayMessage(err, '후보를 삭제하지 못했습니다.'), { variant: 'error' })
        throw err
      }
      if (!canReflect()) return
      onItemsDeleted?.([target.uuid])
      const refreshWarningMessage = await refreshAfterMutation('후보는 삭제했지만 목록을 새로고침하지 못했습니다.', canReflect)
      if (canReflect()) showToast(refreshWarningMessage ?? '후보를 삭제했습니다.', refreshWarningMessage ? { variant: 'warning' } : undefined)
      if (canReflect() && actionScope.drawerItemUuid === target.uuid) closeDrawer()
    } finally {
      if (canReflect()) setItemDeleteBusy(false)
    }
  }, [beginAction, closeDrawer, companyUuid, itemDeleteTarget, onItemsDeleted, openedItemUuid, refreshAfterMutation, showToast, stashUuid])

  const confirmDeleteItems = useCallback(async (itemUuids: string[]) => {
    const itemUuidsSnapshot = uniqueUuids(itemUuids)
    if (!itemUuidsSnapshot.length) return
    const actionScope = createScope(stashUuid, companyUuid, openedItemUuid)
    const canReflect = beginAction(actionScope, bulkDeleteRequestRef, setBulkDeleteBusy)
    try {
      try {
        await deleteCandidateItems(actionScope.stashUuid, itemUuidsSnapshot, { companyUuid: requireCompanyUuid(actionScope) })
      } catch (err) {
        if (canReflect()) showToast(getApiErrorDisplayMessage(err, '선택 후보를 삭제하지 못했습니다.'), { variant: 'error' })
        throw err
      }
      if (!canReflect()) return
      onItemsDeleted?.(itemUuidsSnapshot)
      const refreshWarningMessage = await refreshAfterMutation('선택 후보는 삭제했지만 목록을 새로고침하지 못했습니다.', canReflect)
      if (canReflect()) showToast(refreshWarningMessage ?? '선택한 후보를 삭제했습니다.', refreshWarningMessage ? { variant: 'warning' } : undefined)
      if (canReflect() && actionScope.drawerItemUuid && itemUuidsSnapshot.includes(actionScope.drawerItemUuid)) closeDrawer()
    } finally {
      if (canReflect()) setBulkDeleteBusy(false)
    }
  }, [beginAction, closeDrawer, companyUuid, onItemsDeleted, openedItemUuid, refreshAfterMutation, showToast, stashUuid])

  const confirmUnconfirmItems = useCallback(async (itemUuids: string[]) => {
    const itemUuidsSnapshot = uniqueUuids(itemUuids)
    if (!itemUuidsSnapshot.length) return
    const actionScope = createScope(stashUuid, companyUuid, openedItemUuid)
    const canReflect = beginAction(actionScope, bulkUnconfirmRequestRef, setBulkUnconfirmBusy)
    let failureToThrow: unknown = null
    try {
      const mutationCompanyUuid = requireCompanyUuid(actionScope)
      const results = await Promise.allSettled(itemUuidsSnapshot.map((itemUuid) => updateCandidateItem({
        itemUuid,
        companyUuid: mutationCompanyUuid,
        details: null,
        isLatestLlmComment: false,
      })))
      if (!canReflect()) return
      const updatedItems = results.flatMap((result) => result.status === 'fulfilled' ? [result.value] : [])
      const failedCount = results.length - updatedItems.length
      let bulkUnconfirmRefreshFailed = false
      if (updatedItems.length) {
        const updatedItemUuidSet = new Set(updatedItems.map((item) => item.uuid))
        onItemsUnconfirmed?.(updatedItems)
        const refreshWarningMessage = await refreshAfterMutation('상세확정 해제는 반영했지만 목록을 새로고침하지 못했습니다.', canReflect)
        if (refreshWarningMessage && canReflect() && failedCount === 0) {
          bulkUnconfirmRefreshFailed = true
          showToast(refreshWarningMessage, { variant: 'warning' })
        }
        if (canReflect() && actionScope.drawerItemUuid && updatedItemUuidSet.has(actionScope.drawerItemUuid)) closeDrawer()
      }
      if (!canReflect()) return
      if (bulkUnconfirmRefreshFailed) return
      showToast(`상세확정 해제: ${updatedItems.length}개 성공/${failedCount}개 실패했습니다.`, failedCount > 0 ? { variant: 'error' } : undefined)
      if (failedCount > 0) {
        const rejected = results.find((result): result is PromiseRejectedResult => result.status === 'rejected')
        failureToThrow = rejected?.reason ?? new Error('선택 후보 상세확정 일부를 해제하지 못했습니다.')
      }
    } catch (err) {
      if (canReflect()) showToast(getApiErrorDisplayMessage(err, '선택 후보 상세확정을 해제하지 못했습니다.'), { variant: 'error' })
      throw err
    } finally {
      if (canReflect()) setBulkUnconfirmBusy(false)
    }
    if (failureToThrow) throw failureToThrow
  }, [beginAction, closeDrawer, companyUuid, onItemsUnconfirmed, openedItemUuid, refreshAfterMutation, showToast, stashUuid])

  const downloadOrderExcel = useCallback(async (userName: string) => {
    if (!detailTarget || !items.length) return
    if (items.some((item) => item.orderMetricStatus !== 'loaded' || !item.orderExport)) {
      setOrderExportError('오더 지표 계산이 완료되어야 엑셀 다운로드가 가능합니다.')
      return
    }
    setOrderExportBusy(true)
    setOrderExportError(null)
    try {
      const { blob, filename } = await createCandidateOrderExcelExport({ stashName: detailTarget.name, userName, items })
      if (!mountedRef.current) return
      downloadBlob(blob, filename)
      showToast('엑셀 다운로드 파일을 생성했습니다.')
    } catch (err) {
      if (mountedRef.current) setOrderExportError(getApiErrorDisplayMessage(err, '엑셀 다운로드 파일을 생성하지 못했습니다.'))
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

function createScope(stashUuid: string, companyUuid: string | undefined, drawerItemUuid: string | null, itemTargetUuid?: string | null): CandidateItemActionScope {
  return { stashUuid, ...(companyUuid ? { companyUuid } : {}), drawerItemUuid, ...(itemTargetUuid !== undefined ? { itemTargetUuid } : {}) }
}

function requireCompanyUuid(scope: CandidateItemActionScope) {
  if (scope.companyUuid) return scope.companyUuid
  throw new Error(COMPANY_REQUIRED_MESSAGE)
}

function uniqueUuids(uuids: string[]) {
  return [...new Set(uuids)]
}
