import { useCallback, type MutableRefObject } from 'react'
import type { CandidateItemDetail, CandidateItemSummary } from '../../../api'
import type { OrderSnapshotDocumentV2 } from '../../../snapshot/orderSnapshotTypes'
import {
  createCandidateDetailConfirmationOverride,
  type CandidateDetailConfirmationOverrideMap,
} from './candidateDetailConfirmationOverrideModel'

type ItemStateUpdater = CandidateItemSummary[] | ((current: CandidateItemSummary[]) => CandidateItemSummary[])

interface DrawerSnapshotBridge {
  markDrawerSnapshotConfirmed: (
    itemUuid: string,
    snapshot: OrderSnapshotDocumentV2,
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
    confirmedSnapshot: OrderSnapshotDocumentV2 | null,
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
    snapshot: OrderSnapshotDocumentV2,
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

  const markItemsDetailConfirmed = useCallback((updatedItems: CandidateItemDetail[]) => {
    const confirmedItems = updatedItems.filter((item) => item.details)
    const uniqueUuids = [...new Set(confirmedItems.map((item) => item.uuid))]
    if (!uniqueUuids.length) return
    const uuidSet = new Set(uniqueUuids)
    const updatedItemByUuid = new Map(confirmedItems.map((item) => [item.uuid, item]))
    const itemByUuid = new Map(itemsRef.current.map((item) => [item.uuid, item]))
    const nextOverrides = { ...confirmationOverridesRef.current }
    uniqueUuids.forEach((itemUuid) => {
      const updatedItem = updatedItemByUuid.get(itemUuid)
      if (!updatedItem?.details) return
      const baseItem = itemByUuid.get(itemUuid)
      nextOverrides[itemUuid] = createCandidateDetailConfirmationOverride(baseItem, true, updatedItem.details)
      drawer.markDrawerSnapshotConfirmed(itemUuid, updatedItem.details, baseItem?.dbUpdatedAt ?? null)
    })
    confirmationOverridesRef.current = nextOverrides
    setItems((current) => current.map((item) => {
      const updatedItem = updatedItemByUuid.get(item.uuid)
      return uuidSet.has(item.uuid) && updatedItem
        ? {
            ...item,
            isDetailConfirmed: updatedItem.isDetailConfirmed,
            isLatestLlmComment: updatedItem.isLatestLlmComment,
            dbUpdatedAt: updatedItem.dbUpdatedAt,
          }
        : item
    }))
  }, [confirmationOverridesRef, drawer, itemsRef, setItems])

  return {
    markDrawerSnapshotConfirmed,
    markDrawerSnapshotUnconfirmed,
    markItemsDetailConfirmed,
    markItemsDetailUnconfirmed,
  }
}
