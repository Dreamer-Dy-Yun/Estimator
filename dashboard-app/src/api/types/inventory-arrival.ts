import type { CompanyMutationScopeParams } from './company'

export type InventoryArrivalCollectionStatus = 'success' | 'partial' | 'failed'

export type InventoryArrivalCollectionParams = CompanyMutationScopeParams

export interface InventoryArrivalCollectionResult {
  status: InventoryArrivalCollectionStatus
  collectedCount: number
  failedCount: number
  message: string
  collectedAt: string
}

export interface InventoryArrivalApi {
  collectInventoryArrivalDates(
    params: InventoryArrivalCollectionParams,
  ): Promise<InventoryArrivalCollectionResult>
}
