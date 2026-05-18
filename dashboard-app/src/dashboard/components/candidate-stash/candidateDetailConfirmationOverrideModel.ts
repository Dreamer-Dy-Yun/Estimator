import type { CandidateItemSummary } from '../../../api'
import type { OrderSnapshotDocumentV1 } from '../../../snapshot/orderSnapshotTypes'

export interface CandidateDetailConfirmationOverride {
  isDetailConfirmed: boolean
  confirmedSnapshot: OrderSnapshotDocumentV1 | null
  baseDbUpdatedAt: string | null
}

export type CandidateDetailConfirmationOverrideMap = Record<string, CandidateDetailConfirmationOverride>

export interface CandidateDetailConfirmationOverrideResult {
  items: CandidateItemSummary[]
  overrides: CandidateDetailConfirmationOverrideMap
}

export function createCandidateDetailConfirmationOverride(
  baseItem: Pick<CandidateItemSummary, 'dbUpdatedAt'> | null | undefined,
  isDetailConfirmed: boolean,
  confirmedSnapshot: OrderSnapshotDocumentV1 | null,
): CandidateDetailConfirmationOverride {
  return {
    isDetailConfirmed,
    confirmedSnapshot,
    baseDbUpdatedAt: baseItem?.dbUpdatedAt ?? null,
  }
}

export function applyCandidateDetailConfirmationOverrides(
  items: CandidateItemSummary[],
  overrides: CandidateDetailConfirmationOverrideMap,
): CandidateDetailConfirmationOverrideResult {
  const nextOverrides: CandidateDetailConfirmationOverrideMap = {}
  const nextItems = items.map((item) => {
    const override = overrides[item.uuid]
    if (!override) return item
    if (isServerConfirmationFresh(item, override)) return item
    nextOverrides[item.uuid] = override
    return {
      ...item,
      isDetailConfirmed: override.isDetailConfirmed,
      isLatestLlmComment: false,
    }
  })

  return { items: nextItems, overrides: nextOverrides }
}

function isServerConfirmationFresh(
  item: CandidateItemSummary,
  override: CandidateDetailConfirmationOverride,
): boolean {
  if (override.baseDbUpdatedAt == null) return false
  return item.dbUpdatedAt !== override.baseDbUpdatedAt && item.isDetailConfirmed === override.isDetailConfirmed
}
