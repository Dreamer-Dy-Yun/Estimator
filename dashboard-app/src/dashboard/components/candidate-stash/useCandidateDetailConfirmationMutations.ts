import { useCallback, type MutableRefObject } from 'react'
import type { CandidateItemDetail, CandidateItemSummary } from '../../../api'
import { parseOrderSnapshot } from '../../../snapshot/parseOrderSnapshot'
import type { OrderSnapshotDocumentV2 } from '../../../snapshot/orderSnapshotTypes'
import {
  createCandidateDetailConfirmationOverride,
  type CandidateDetailConfirmationOverrideMap,
} from './candidateDetailConfirmationOverrideModel'
import type { CandidateSetItems } from './candidateStashDetailTypes'

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
  setItems: CandidateSetItems
  drawer: DrawerSnapshotBridge
}

function mergeDetailConfirmationState(
  item: CandidateItemSummary,
  updatedItem: CandidateItemDetail,
): CandidateItemSummary {
  return {
    ...item,
    isDetailConfirmed: updatedItem.isDetailConfirmed,
    isLatestLlmComment: updatedItem.isLatestLlmComment,
    dbUpdatedAt: updatedItem.dbUpdatedAt,
  }
}

function parseConfirmedUpdatedItems(
  updatedItems: CandidateItemDetail[],
): Array<{ item: CandidateItemDetail; snapshot: OrderSnapshotDocumentV2 }> {
  return updatedItems
    .filter((item) => item.details)
    .map((item) => {
      try {
        return { item, snapshot: parseOrderSnapshot(item.details) }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        throw new Error(`Candidate item snapshot parse failed: ${item.uuid}: ${message}`)
      }
    })
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
      item.uuid === itemUuid ? mergeDetailConfirmationState(item, updatedItem) : item
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
      uuidSet.has(item.uuid) && updatedItemByUuid.has(item.uuid)
        ? mergeDetailConfirmationState(item, updatedItemByUuid.get(item.uuid)!)
        : item
    )))
  }, [confirmationOverridesRef, drawer, itemsRef, setItems])

  const markItemsDetailConfirmed = useCallback((updatedItems: CandidateItemDetail[]) => {
    const confirmedItems = parseConfirmedUpdatedItems(updatedItems)
    const uniqueUuids = [...new Set(confirmedItems.map(({ item }) => item.uuid))]
    if (!uniqueUuids.length) return
    const uuidSet = new Set(uniqueUuids)
    const confirmedItemByUuid = new Map(confirmedItems.map((entry) => [entry.item.uuid, entry]))
    const itemByUuid = new Map(itemsRef.current.map((item) => [item.uuid, item]))
    const nextOverrides = { ...confirmationOverridesRef.current }
    uniqueUuids.forEach((itemUuid) => {
      const confirmedItem = confirmedItemByUuid.get(itemUuid)
      if (!confirmedItem) return
      const baseItem = itemByUuid.get(itemUuid)
      nextOverrides[itemUuid] = createCandidateDetailConfirmationOverride(baseItem, true, confirmedItem.snapshot)
      drawer.markDrawerSnapshotConfirmed(itemUuid, confirmedItem.snapshot, baseItem?.dbUpdatedAt ?? null)
    })
    confirmationOverridesRef.current = nextOverrides
    setItems((current) => current.map((item) => {
      const updatedItem = confirmedItemByUuid.get(item.uuid)?.item
      return uuidSet.has(item.uuid) && updatedItem ? mergeDetailConfirmationState(item, updatedItem) : item
    }))
  }, [confirmationOverridesRef, drawer, itemsRef, setItems])

  return {
    markDrawerSnapshotConfirmed,
    markDrawerSnapshotUnconfirmed,
    markItemsDetailConfirmed,
    markItemsDetailUnconfirmed,
  }
}
