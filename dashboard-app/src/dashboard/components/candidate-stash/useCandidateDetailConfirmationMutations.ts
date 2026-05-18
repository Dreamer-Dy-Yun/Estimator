import { useCallback, type MutableRefObject } from 'react'
import type { CandidateItemDetail, CandidateItemSummary } from '../../../api'
import type { OrderSnapshotDocumentV1 } from '../../../snapshot/orderSnapshotTypes'
import {
  createCandidateDetailConfirmationOverride,
  type CandidateDetailConfirmationOverrideMap,
} from './candidateDetailConfirmationOverrideModel'

type ItemStateUpdater = CandidateItemSummary[] | ((current: CandidateItemSummary[]) => CandidateItemSummary[])

interface DrawerSnapshotBridge {
  markDrawerSnapshotConfirmed: (
    itemUuid: string,
    snapshot: OrderSnapshotDocumentV1,
    baseDbUpdatedAt: string | null,
  ) => void
  markDrawerSnapshotUnconfirmed: (itemUuid: string, baseDbUpdatedAt: string | null) => void
}

interface UseCandidateDetailConfirmationMutationsParams {
  itemsRef: MutableRefObject<CandidateItemSummary[]>
  confirmationOverridesRef: MutableRefObject<CandidateDetailConfirmationOverrideMap>
  setItems: (next: ItemStateUpdater) => void
  drawer: DrawerSnapshotBridge
}

export function useCandidateDetailConfirmationMutations({
  itemsRef,
  confirmationOverridesRef,
  setItems,
  drawer,
}: UseCandidateDetailConfirmationMutationsParams) {
  const recordDetailConfirmationMutation = useCallback((
    itemUuid: string,
    isDetailConfirmed: boolean,
    confirmedSnapshot: OrderSnapshotDocumentV1 | null,
    updatedItem: CandidateItemDetail,
  ) => {
    const baseItem = itemsRef.current.find((item) => item.uuid === itemUuid)
    confirmationOverridesRef.current = {
      ...confirmationOverridesRef.current,
      [itemUuid]: createCandidateDetailConfirmationOverride(baseItem, isDetailConfirmed, confirmedSnapshot),
    }
    setItems((current) => current.map((item) => (
      item.uuid === itemUuid
        ? {
            ...item,
            isDetailConfirmed: updatedItem.isDetailConfirmed,
            isLatestLlmComment: updatedItem.isLatestLlmComment,
            dbUpdatedAt: updatedItem.dbUpdatedAt,
          }
        : item
    )))
    return baseItem?.dbUpdatedAt ?? null
  }, [confirmationOverridesRef, itemsRef, setItems])

  const markDrawerSnapshotConfirmed = useCallback((
    itemUuid: string,
    snapshot: OrderSnapshotDocumentV1,
    updatedItem: CandidateItemDetail,
  ) => {
    const baseDbUpdatedAt = recordDetailConfirmationMutation(itemUuid, true, snapshot, updatedItem)
    drawer.markDrawerSnapshotConfirmed(itemUuid, snapshot, baseDbUpdatedAt)
  }, [drawer, recordDetailConfirmationMutation])

  const markDrawerSnapshotUnconfirmed = useCallback((itemUuid: string, updatedItem: CandidateItemDetail) => {
    const baseDbUpdatedAt = recordDetailConfirmationMutation(itemUuid, false, null, updatedItem)
    drawer.markDrawerSnapshotUnconfirmed(itemUuid, baseDbUpdatedAt)
  }, [drawer, recordDetailConfirmationMutation])

  const markItemsDetailUnconfirmed = useCallback((updatedItems: CandidateItemDetail[]) => {
    const uniqueUuids = [...new Set(updatedItems.map((item) => item.uuid))]
    if (!uniqueUuids.length) return
    const uuidSet = new Set(uniqueUuids)
    const updatedItemByUuid = new Map(updatedItems.map((item) => [item.uuid, item]))
    const itemByUuid = new Map(itemsRef.current.map((item) => [item.uuid, item]))
    const nextOverrides = { ...confirmationOverridesRef.current }
    uniqueUuids.forEach((itemUuid) => {
      const baseItem = itemByUuid.get(itemUuid)
      nextOverrides[itemUuid] = createCandidateDetailConfirmationOverride(baseItem, false, null)
      drawer.markDrawerSnapshotUnconfirmed(itemUuid, baseItem?.dbUpdatedAt ?? null)
    })
    confirmationOverridesRef.current = nextOverrides
    setItems((current) => current.map((item) => (
      uuidSet.has(item.uuid)
        ? {
            ...item,
            isDetailConfirmed: updatedItemByUuid.get(item.uuid)?.isDetailConfirmed ?? false,
            isLatestLlmComment: updatedItemByUuid.get(item.uuid)?.isLatestLlmComment ?? false,
            dbUpdatedAt: updatedItemByUuid.get(item.uuid)?.dbUpdatedAt ?? item.dbUpdatedAt,
          }
        : item
    )))
  }, [confirmationOverridesRef, drawer, itemsRef, setItems])

  return {
    markDrawerSnapshotConfirmed,
    markDrawerSnapshotUnconfirmed,
    markItemsDetailUnconfirmed,
  }
}
