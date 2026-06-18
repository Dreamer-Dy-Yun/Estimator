import type { OrderSnapshotDocument } from '../../snapshot/orderSnapshotTypes'

export const DEFAULT_CANDIDATE_STASH_CONTEXT: { readonly periodStart: '2025-01-01'; readonly periodEnd: '2025-12-31'; readonly forecastMonths: 8; } = {
  periodStart: '2025-01-01',
  periodEnd: '2025-12-31',
  forecastMonths: 8,
} as const

export type CandidateStashRecord = {
  uuid: string
  name: string
  note: string | null
  userUuid: string
  companyUuid: string
  periodStart: string
  periodEnd: string
  forecastMonths: number
  dbCreatedAt: string
  dbUpdatedAt: string
}

export type CandidateItemRecord = {
  uuid: string
  stashUuid: string
  /** CANDIDATE_ITEM.sku_uuid. Mock uses skuGroupKey as the stand-in SKU.uuid. */
  skuUuid: string
  skuGroupKey: string
  confirmedOrderSnapshot: OrderSnapshotDocument | null
  isLatestLlmComment: boolean
  dbCreatedAt: string
  dbUpdatedAt: string
}
