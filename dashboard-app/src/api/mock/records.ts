import type { SecondaryOrderSnapshotPayload } from '../types'

export type CandidateStashRecord = {
  uuid: string
  name: string
  note: string | null
  productId: string
  dbCreatedAt: string
  dbUpdatedAt: string
}

export type CandidateItemRecord = {
  uuid: string
  stashUuid: string
  skuUuid: string
  details: SecondaryOrderSnapshotPayload
  isLatestLlmComment?: boolean
  dbCreatedAt: string
  dbUpdatedAt: string
}
