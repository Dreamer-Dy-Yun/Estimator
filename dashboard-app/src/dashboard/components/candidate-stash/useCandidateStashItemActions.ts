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

export type Args = {
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

export type RequestRef = MutableRefObject<number>

const COMPANY_REQUIRED_MESSAGE = '오더 후보군 작업은 회사 선택이 필요합니다.' as const

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
}: Args) : { itemDeleteBusy: boolean; bulkDeleteBusy: boolean; bulkUnconfirmBusy: boolean; orderExportBusy: boolean; orderExportError: string | null; confirmDeleteItem: () => Promise<void>; confirmDeleteItems: (itemUuids: string[]) => Promise<void>; confirmUnconfirmItems: (itemUuids: string[]) => Promise<void>; downloadOrderExcel: (userName: string) => Promise<void>; } {
  const [itemDeleteBusy, setItemDeleteBusy]: [boolean, React.Dispatch<React.SetStateAction<boolean>>] = useState(false)
  const [bulkDeleteBusy, setBulkDeleteBusy]: [boolean, React.Dispatch<React.SetStateAction<boolean>>] = useState(false)
  const [bulkUnconfirmBusy, setBulkUnconfirmBusy]: [boolean, React.Dispatch<React.SetStateAction<boolean>>] = useState(false)
  const [orderExportBusy, setOrderExportBusy]: [boolean, React.Dispatch<React.SetStateAction<boolean>>] = useState(false)
  const [orderExportError, setOrderExportError]: [string | null, React.Dispatch<React.SetStateAction<string | null>>] = useState<string | null>(null)
  const mountedRef: React.RefObject<boolean> = useRef(false)
  const itemDeleteRequestRef: React.RefObject<number> = useRef(0)
  const bulkDeleteRequestRef: React.RefObject<number> = useRef(0)
  const bulkUnconfirmRequestRef: React.RefObject<number> = useRef(0)
  const currentItemDeleteTargetUuid: string | null = itemDeleteTarget?.uuid ?? null
  const currentActionScopeRef: React.RefObject<CandidateItemActionScope> = useRef<CandidateItemActionScope>(createScope(stashUuid, companyUuid, openedItemUuid, currentItemDeleteTargetUuid))

  useEffect(() : () => void => {
    mountedRef.current = true
    return () : void => {
      mountedRef.current = false
    }
  }, [])

  useEffect(() : void => {
    const previous: CandidateItemActionScope = currentActionScopeRef.current
    const next: CandidateItemActionScope = createScope(stashUuid, companyUuid, openedItemUuid, currentItemDeleteTargetUuid)
    const scopeChanged: boolean = previous.stashUuid !== next.stashUuid || previous.companyUuid !== next.companyUuid || previous.drawerItemUuid !== next.drawerItemUuid
    currentActionScopeRef.current = next
    if (scopeChanged) {
      setItemDeleteBusy(false)
      setBulkDeleteBusy(false)
      setBulkUnconfirmBusy(false)
    } else if (previous.itemTargetUuid !== next.itemTargetUuid) {
      setItemDeleteBusy(false)
    }
  }, [companyUuid, currentItemDeleteTargetUuid, openedItemUuid, stashUuid])

  const isCurrentActionScope: (scope: CandidateItemActionScope) => boolean = useCallback((scope: CandidateItemActionScope) : boolean => {
    const current: CandidateItemActionScope = currentActionScopeRef.current
    return current.stashUuid === scope.stashUuid
      && current.companyUuid === scope.companyUuid
      && current.drawerItemUuid === scope.drawerItemUuid
      && (scope.itemTargetUuid === undefined || current.itemTargetUuid === scope.itemTargetUuid)
  }, [])

  const createCanReflectAction: (scope: CandidateItemActionScope, requestRef: RequestRef, requestId: number) => () => boolean = useCallback((scope: CandidateItemActionScope, requestRef: RequestRef, requestId: number) : () => boolean => () : boolean => (
    mountedRef.current && requestRef.current === requestId && isCurrentActionScope(scope)
  ), [isCurrentActionScope])

  const beginAction: (scope: CandidateItemActionScope, requestRef: RequestRef, setBusy: (busy: boolean) => void) => () => boolean = useCallback((scope: CandidateItemActionScope, requestRef: RequestRef, setBusy: (busy: boolean) => void) : () => boolean => {
    requestRef.current += 1
    const requestId: number = requestRef.current
    setBusy(true)
    return createCanReflectAction(scope, requestRef, requestId)
  }, [createCanReflectAction])

  const refreshAfterMutation: (failureMessage: string, canReflect: () => boolean) => Promise<string | null> = useCallback(async (failureMessage: string, canReflect: () => boolean) : Promise<string | null> => {
    if (!canReflect()) return null
    try {
      await refreshStashes()
      return null
    } catch {
      return canReflect() ? failureMessage : null
    }
  }, [refreshStashes])

  const confirmDeleteItem: () => Promise<void> = useCallback(async () : Promise<void> => {
    if (!itemDeleteTarget) return
    const target: CandidateItemSummary = itemDeleteTarget
    const actionScope: CandidateItemActionScope = createScope(stashUuid, companyUuid, openedItemUuid, target.uuid)
    const canReflect: () => boolean = beginAction(actionScope, itemDeleteRequestRef, setItemDeleteBusy)
    try {
      try {
        await deleteCandidateItem(target.uuid, { companyUuid: requireCompanyUuid(actionScope) })
      } catch (err) {
        if (canReflect()) showToast(getApiErrorDisplayMessage(err, '후보를 삭제하지 못했습니다.'), { variant: 'error' })
        throw err
      }
      if (!canReflect()) return
      onItemsDeleted?.([target.uuid])
      const refreshWarningMessage: string | null = await refreshAfterMutation('후보는 삭제했지만 목록을 새로고침하지 못했습니다.', canReflect)
      if (canReflect()) showToast(refreshWarningMessage ?? '후보를 삭제했습니다.', refreshWarningMessage ? { variant: 'warning' } : undefined)
      if (canReflect() && actionScope.drawerItemUuid === target.uuid) closeDrawer()
    } finally {
      if (canReflect()) setItemDeleteBusy(false)
    }
  }, [beginAction, closeDrawer, companyUuid, itemDeleteTarget, onItemsDeleted, openedItemUuid, refreshAfterMutation, showToast, stashUuid])

  const confirmDeleteItems: (itemUuids: string[]) => Promise<void> = useCallback(async (itemUuids: string[]) : Promise<void> => {
    const itemUuidsSnapshot: string[] = uniqueUuids(itemUuids)
    if (!itemUuidsSnapshot.length) return
    const actionScope: CandidateItemActionScope = createScope(stashUuid, companyUuid, openedItemUuid)
    const canReflect: () => boolean = beginAction(actionScope, bulkDeleteRequestRef, setBulkDeleteBusy)
    try {
      try {
        await deleteCandidateItems(actionScope.stashUuid, itemUuidsSnapshot, { companyUuid: requireCompanyUuid(actionScope) })
      } catch (err) {
        if (canReflect()) showToast(getApiErrorDisplayMessage(err, '선택 후보를 삭제하지 못했습니다.'), { variant: 'error' })
        throw err
      }
      if (!canReflect()) return
      onItemsDeleted?.(itemUuidsSnapshot)
      const refreshWarningMessage: string | null = await refreshAfterMutation('선택 후보는 삭제했지만 목록을 새로고침하지 못했습니다.', canReflect)
      if (canReflect()) showToast(refreshWarningMessage ?? '선택한 후보를 삭제했습니다.', refreshWarningMessage ? { variant: 'warning' } : undefined)
      if (canReflect() && actionScope.drawerItemUuid && itemUuidsSnapshot.includes(actionScope.drawerItemUuid)) closeDrawer()
    } finally {
      if (canReflect()) setBulkDeleteBusy(false)
    }
  }, [beginAction, closeDrawer, companyUuid, onItemsDeleted, openedItemUuid, refreshAfterMutation, showToast, stashUuid])

  const confirmUnconfirmItems: (itemUuids: string[]) => Promise<void> = useCallback(async (itemUuids: string[]) : Promise<void> => {
    const itemUuidsSnapshot: string[] = uniqueUuids(itemUuids)
    if (!itemUuidsSnapshot.length) return
    const actionScope: CandidateItemActionScope = createScope(stashUuid, companyUuid, openedItemUuid)
    const canReflect: () => boolean = beginAction(actionScope, bulkUnconfirmRequestRef, setBulkUnconfirmBusy)
    let failureToThrow: unknown = null
    try {
      const mutationCompanyUuid: string = requireCompanyUuid(actionScope)
      const results: PromiseSettledResult<CandidateItemDetail>[] = await Promise.allSettled(itemUuidsSnapshot.map((itemUuid: string) : Promise<CandidateItemDetail> => updateCandidateItem({
        itemUuid,
        companyUuid: mutationCompanyUuid,
        confirmedOrderSnapshot: null,
        isLatestLlmComment: false,
      })))
      if (!canReflect()) return
      const updatedItems: CandidateItemDetail[] = results.flatMap((result: PromiseSettledResult<CandidateItemDetail>) : CandidateItemDetail[] => result.status === 'fulfilled' ? [result.value] : [])
      const failedCount: number = results.length - updatedItems.length
      let bulkUnconfirmRefreshFailed: boolean = false
      if (updatedItems.length) {
        const updatedItemUuidSet: Set<string> = new Set(updatedItems.map((item: CandidateItemDetail) : string => item.uuid))
        onItemsUnconfirmed?.(updatedItems)
        const refreshWarningMessage: string | null = await refreshAfterMutation('상세확정 해제는 반영했지만 목록을 새로고침하지 못했습니다.', canReflect)
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
        const rejected: PromiseRejectedResult | undefined = results.find((result: PromiseSettledResult<CandidateItemDetail>): result is PromiseRejectedResult => result.status === 'rejected')
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

  const downloadOrderExcel: (userName: string) => Promise<void> = useCallback(async (userName: string) : Promise<void> => {
    if (!detailTarget || !items.length) return
    if (items.some((item: CandidateItemSummary) : boolean => item.orderMetricStatus !== 'loaded' || !item.orderExport)) {
      setOrderExportError('오더 지표 계산이 완료되어야 엑셀 다운로드가 가능합니다.')
      return
    }
    setOrderExportBusy(true)
    setOrderExportError(null)
    try {
      const { blob, filename }: { blob: Blob; filename: string; } = await createCandidateOrderExcelExport({ stashName: detailTarget.name, userName, items })
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

function requireCompanyUuid(scope: CandidateItemActionScope) : string {
  if (scope.companyUuid) return scope.companyUuid
  throw new Error(COMPANY_REQUIRED_MESSAGE)
}

function uniqueUuids(uuids: string[]) : string[] {
  return [...new Set(uuids)]
}
