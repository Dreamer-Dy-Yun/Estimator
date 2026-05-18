import { afterEach, describe, expect, it } from 'vitest'
import { mockAuthApi } from './authApi'
import { mockInventoryArrivalApi } from './inventoryArrivalApi'

describe('mockInventoryArrivalApi', () => {
  afterEach(async () => {
    await mockAuthApi.logout()
  })

  it('collects inbound dates for authenticated non-admin users', async () => {
    await mockAuthApi.login({ loginId: 'mock-user', password: 'user' })

    const result = await mockInventoryArrivalApi.collectInventoryArrivalDates()

    expect(result.status).toBe('success')
    expect(result.collectedCount).toBeGreaterThan(0)
    expect(result.failedCount).toBe(0)
  })
})
