import type { SecondaryOrderSnapshotPayload } from '../types/snapshot'

export const DEFAULT_CANDIDATE_STASH_CONTEXT = {
  periodStart: '2025-01-01',
  periodEnd: '2025-12-31',
  forecastMonths: 8,
} as const

export type CandidateStashRecord = {
  uuid: string
  name: string
  note: string | null
  createdByUserUuid: string
  productId: string
  periodStart: string
  periodEnd: string
  forecastMonths: number
  dbCreatedAt: string
  dbUpdatedAt: string
}

export type CandidateItemRecord = {
  uuid: string
  stashUuid: string
  skuUuid: string
  details: SecondaryOrderSnapshotPayload
  isLatestLlmComment: boolean
  dbCreatedAt: string
  dbUpdatedAt: string
}
