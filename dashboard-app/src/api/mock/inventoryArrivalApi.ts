import type { CompanyMutationScopeParams } from '../types'
import type { InventoryArrivalApi, InventoryArrivalCollectionResult } from '../types'
import { assertMockSession } from './authApi'
import { getMockMutationCompanyUuid } from './mockCompanyScope'
import { sleep } from './utils'

export const mockInventoryArrivalApi: InventoryArrivalApi = {
  collectInventoryArrivalDates: async (params: CompanyMutationScopeParams): Promise<InventoryArrivalCollectionResult> => {
    await sleep(480)
    assertMockSession()
    getMockMutationCompanyUuid(params)
    return {
      status: 'success',
      collectedCount: 42,
      failedCount: 0,
      message: '입고예정일 42건 수집 완료',
      collectedAt: new Date().toISOString(),
    }
  },
}
