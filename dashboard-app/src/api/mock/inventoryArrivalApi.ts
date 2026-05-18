import type { InventoryArrivalApi, InventoryArrivalCollectionResult } from '../types'
import { assertMockSession } from './authApi'
import { sleep } from './utils'

export const mockInventoryArrivalApi: InventoryArrivalApi = {
  collectInventoryArrivalDates: async (): Promise<InventoryArrivalCollectionResult> => {
    await sleep(480)
    assertMockSession()
    return {
      status: 'success',
      collectedCount: 42,
      failedCount: 0,
      message: '입고예정일 42건 수집 완료',
      collectedAt: new Date().toISOString(),
    }
  },
}
