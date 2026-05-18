export type InventoryArrivalCollectionStatus = 'success' | 'partial' | 'failed'

export interface InventoryArrivalCollectionResult {
  status: InventoryArrivalCollectionStatus
  collectedCount: number
  failedCount: number
  message: string
  collectedAt: string
}

export interface InventoryArrivalApi {
  collectInventoryArrivalDates(): Promise<InventoryArrivalCollectionResult>
}
