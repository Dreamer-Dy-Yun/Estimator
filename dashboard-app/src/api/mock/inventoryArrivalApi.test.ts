import { afterEach, describe, expect, it } from 'vitest'
import { ALL_COMPANY_UUID } from '../types/company'
import { mockAuthApi } from './authApi'
import { mockInventoryArrivalApi } from './inventoryArrivalApi'
import {
  MOCK_HANA_COMPANY_UUID,
  MOCK_SINGLE_COMPANY_SCOPE_REQUIRED_MESSAGE,
} from './mockCompanyScope'

describe('mockInventoryArrivalApi', () => {
  afterEach(async () => {
    await mockAuthApi.logout()
  })

  it('collects inbound dates for authenticated non-admin users with a single company scope', async () => {
    await mockAuthApi.login({ loginId: 'mock-user', password: 'user' })

    const result = await mockInventoryArrivalApi.collectInventoryArrivalDates({
      companyUuid: MOCK_HANA_COMPANY_UUID,
    })

    expect(result.status).toBe('success')
    expect(result.collectedCount).toBeGreaterThan(0)
    expect(result.failedCount).toBe(0)
  })

  it('rejects ALL company scope for inbound date collection', async () => {
    await mockAuthApi.login({ loginId: 'mock-user', password: 'user' })

    await expect(mockInventoryArrivalApi.collectInventoryArrivalDates({
      companyUuid: ALL_COMPANY_UUID,
    })).rejects.toThrow(MOCK_SINGLE_COMPANY_SCOPE_REQUIRED_MESSAGE)
  })

  it('rejects blank company scope for inbound date collection', async () => {
    await mockAuthApi.login({ loginId: 'mock-user', password: 'user' })

    await expect(mockInventoryArrivalApi.collectInventoryArrivalDates({
      companyUuid: '',
    })).rejects.toThrow(MOCK_SINGLE_COMPANY_SCOPE_REQUIRED_MESSAGE)
  })
})
