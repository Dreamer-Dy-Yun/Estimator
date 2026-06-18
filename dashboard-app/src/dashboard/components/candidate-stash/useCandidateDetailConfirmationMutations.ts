import type { CandidateDetailConfirmationOverride } from './candidateDetailConfirmationOverrideModel'
import { useCallback, type MutableRefObject } from 'react'
import type { CandidateItemDetail, CandidateItemSummary } from '../../../api'
import { parseOrderSnapshot } from '../../../snapshot/parseOrderSnapshot'
import type { OrderSnapshotDocument } from '../../../snapshot/orderSnapshotTypes'
import {
  createCandidateDetailConfirmationOverride,
  type CandidateDetailConfirmationOverrideMap,
} from './candidateDetailConfirmationOverrideModel'
import { assertCandidateItemDetailSnapshotFlag, assertCandidateItemDetailSnapshotFlags } from './candidateItemDetailContract'
import type { CandidateSetItems } from './candidateStashDetailTypes'

export interface DrawerSnapshotBridge {
  markDrawerSnapshotConfirmed: (
    itemUuid: string,
    snapshot: OrderSnapshotDocument,
    baseDbUpdatedAt: string | null,
  ) => void
  markDrawerSnapshotUnconfirmed: (itemUuid: string, baseDbUpdatedAt: string | null) => void
}

export interface UseCandidateDetailConfirmationMutationsParams {
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
    hasConfirmedOrderSnapshot: updatedItem.hasConfirmedOrderSnapshot,
    isLatestLlmComment: updatedItem.isLatestLlmComment,
    dbUpdatedAt: updatedItem.dbUpdatedAt,
  }
}

function parseConfirmedUpdatedItems(
  updatedItems: CandidateItemDetail[],
): Array<{ item: CandidateItemDetail; snapshot: OrderSnapshotDocument }> {
  assertCandidateItemDetailSnapshotFlags(updatedItems)
  return updatedItems
    .filter((item: CandidateItemDetail) : boolean => item.hasConfirmedOrderSnapshot)
    .map((item: CandidateItemDetail) : { item: CandidateItemDetail; snapshot: OrderSnapshotDocument; } => {
      try {
        return { item, snapshot: parseOrderSnapshot(item.confirmedOrderSnapshot) }
      } catch (error) {
        const message: string = error instanceof Error ? error.message : String(error)
        throw new Error(`Candidate item snapshot parse failed: ${item.uuid}: ${message}`)
      }
    })
}

export function useCandidateDetailConfirmationMutations({
  itemsRef,
  confirmationOverridesRef,
  setItems,
  drawer,
}: UseCandidateDetailConfirmationMutationsParams) : { markDrawerSnapshotConfirmed: (itemUuid: string, snapshot: OrderSnapshotDocument, updatedItem: CandidateItemDetail) => void; markDrawerSnapshotUnconfirmed: (itemUuid: string, updatedItem: CandidateItemDetail) => void; markItemsDetailConfirmed: (updatedItems: CandidateItemDetail[]) => void; markItemsDetailUnconfirmed: (updatedItems: CandidateItemDetail[]) => void; } {
  const recordDetailConfirmationMutation: (itemUuid: string, hasConfirmedOrderSnapshot: boolean, confirmedSnapshot: OrderSnapshotDocument | null, updatedItem: CandidateItemDetail) => string | null = useCallback((
    itemUuid: string,
    hasConfirmedOrderSnapshot: boolean,
    confirmedSnapshot: OrderSnapshotDocument | null,
    updatedItem: CandidateItemDetail,
  ) : string | null => {
    assertCandidateItemDetailSnapshotFlag(updatedItem)
    if (updatedItem.hasConfirmedOrderSnapshot !== hasConfirmedOrderSnapshot) {
      throw new Error(`Candidate item confirmation state mismatch: ${itemUuid}`)
    }
    const baseItem: CandidateItemSummary | undefined = itemsRef.current.find((item: CandidateItemSummary) : boolean => item.uuid === itemUuid)
    confirmationOverridesRef.current = {
      ...confirmationOverridesRef.current,
      [itemUuid]: createCandidateDetailConfirmationOverride(baseItem, hasConfirmedOrderSnapshot, confirmedSnapshot),
    }
    setItems((current: CandidateItemSummary[]) : CandidateItemSummary[] => current.map((item: CandidateItemSummary) : CandidateItemSummary => (
      item.uuid === itemUuid ? mergeDetailConfirmationState(item, updatedItem) : item
    )))
    return baseItem?.dbUpdatedAt ?? null
  }, [confirmationOverridesRef, itemsRef, setItems])

  const markDrawerSnapshotConfirmed: (itemUuid: string, snapshot: OrderSnapshotDocument, updatedItem: CandidateItemDetail) => void = useCallback((
    itemUuid: string,
    snapshot: OrderSnapshotDocument,
    updatedItem: CandidateItemDetail,
  ) : void => {
    const baseDbUpdatedAt: string | null = recordDetailConfirmationMutation(itemUuid, true, snapshot, updatedItem)
    drawer.markDrawerSnapshotConfirmed(itemUuid, snapshot, baseDbUpdatedAt)
  }, [drawer, recordDetailConfirmationMutation])

  const markDrawerSnapshotUnconfirmed: (itemUuid: string, updatedItem: CandidateItemDetail) => void = useCallback((itemUuid: string, updatedItem: CandidateItemDetail) : void => {
    const baseDbUpdatedAt: string | null = recordDetailConfirmationMutation(itemUuid, false, null, updatedItem)
    drawer.markDrawerSnapshotUnconfirmed(itemUuid, baseDbUpdatedAt)
  }, [drawer, recordDetailConfirmationMutation])

  const markItemsDetailUnconfirmed: (updatedItems: CandidateItemDetail[]) => void = useCallback((updatedItems: CandidateItemDetail[]) : void => {
    assertCandidateItemDetailSnapshotFlags(updatedItems)
    const stillConfirmedItem: CandidateItemDetail | undefined = updatedItems.find((item: CandidateItemDetail) : boolean => item.hasConfirmedOrderSnapshot)
    if (stillConfirmedItem) throw new Error(`Candidate item unconfirm response still has a snapshot: ${stillConfirmedItem.uuid}`)
    const uniqueUuids: string[] = [...new Set(updatedItems.map((item: CandidateItemDetail) : string => item.uuid))]
    if (!uniqueUuids.length) return
    const uuidSet: Set<string> = new Set(uniqueUuids)
    const updatedItemByUuid: Map<string, CandidateItemDetail> = new Map(updatedItems.map((item: CandidateItemDetail) : [string, CandidateItemDetail] => [item.uuid, item]))
    const itemByUuid: Map<string, CandidateItemSummary> = new Map(itemsRef.current.map((item: CandidateItemSummary) : [string, CandidateItemSummary] => [item.uuid, item]))
    const nextOverrides: { [x: string]: CandidateDetailConfirmationOverride; } = { ...confirmationOverridesRef.current }
    uniqueUuids.forEach((itemUuid: string) : void => {
      const baseItem: CandidateItemSummary | undefined = itemByUuid.get(itemUuid)
      nextOverrides[itemUuid] = createCandidateDetailConfirmationOverride(baseItem, false, null)
      drawer.markDrawerSnapshotUnconfirmed(itemUuid, baseItem?.dbUpdatedAt ?? null)
    })
    confirmationOverridesRef.current = nextOverrides
    setItems((current: CandidateItemSummary[]) : CandidateItemSummary[] => current.map((item: CandidateItemSummary) : CandidateItemSummary => (
      uuidSet.has(item.uuid) && updatedItemByUuid.has(item.uuid)
        ? mergeDetailConfirmationState(item, updatedItemByUuid.get(item.uuid)!)
        : item
    )))
  }, [confirmationOverridesRef, drawer, itemsRef, setItems])

  const markItemsDetailConfirmed: (updatedItems: CandidateItemDetail[]) => void = useCallback((updatedItems: CandidateItemDetail[]) : void => {
    const confirmedItems: { item: CandidateItemDetail; snapshot: OrderSnapshotDocument; }[] = parseConfirmedUpdatedItems(updatedItems)
    const uniqueUuids: string[] = [...new Set(confirmedItems.map(({ item }: { item: CandidateItemDetail; snapshot: OrderSnapshotDocument; }) : string => item.uuid))]
    if (!uniqueUuids.length) return
    const uuidSet: Set<string> = new Set(uniqueUuids)
    const confirmedItemByUuid: Map<string, { item: CandidateItemDetail; snapshot: OrderSnapshotDocument; }> = new Map(confirmedItems.map((entry: { item: CandidateItemDetail; snapshot: OrderSnapshotDocument; }) : [string, { item: CandidateItemDetail; snapshot: OrderSnapshotDocument; }] => [entry.item.uuid, entry]))
    const itemByUuid: Map<string, CandidateItemSummary> = new Map(itemsRef.current.map((item: CandidateItemSummary) : [string, CandidateItemSummary] => [item.uuid, item]))
    const nextOverrides: { [x: string]: CandidateDetailConfirmationOverride; } = { ...confirmationOverridesRef.current }
    uniqueUuids.forEach((itemUuid: string) : void => {
      const confirmedItem: { item: CandidateItemDetail; snapshot: OrderSnapshotDocument; } | undefined = confirmedItemByUuid.get(itemUuid)
      if (!confirmedItem) return
      const baseItem: CandidateItemSummary | undefined = itemByUuid.get(itemUuid)
      nextOverrides[itemUuid] = createCandidateDetailConfirmationOverride(baseItem, true, confirmedItem.snapshot)
      drawer.markDrawerSnapshotConfirmed(itemUuid, confirmedItem.snapshot, baseItem?.dbUpdatedAt ?? null)
    })
    confirmationOverridesRef.current = nextOverrides
    setItems((current: CandidateItemSummary[]) : CandidateItemSummary[] => current.map((item: CandidateItemSummary) : CandidateItemSummary => {
      const updatedItem: CandidateItemDetail | undefined = confirmedItemByUuid.get(item.uuid)?.item
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
