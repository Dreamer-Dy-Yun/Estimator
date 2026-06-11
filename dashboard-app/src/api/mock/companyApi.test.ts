import type { CompanySummary } from '../types'
import { describe, expect, it } from 'vitest'
import { ALL_COMPANY_UUID } from '../types'
import { mockCompanyApi } from './companyApi'
import { MOCK_HANA_COMPANY_UUID, MOCK_T1_COMPANY_UUID } from './mockCompanyScope'

describe('mockCompanyApi', () : void => {
  it('returns only real company rows for /companies', async () : Promise<void> => {
    const companies: CompanySummary[] = await mockCompanyApi.getCompanies()

    expect(companies.map((company) : string => company.uuid)).toEqual([
      MOCK_HANA_COMPANY_UUID,
      MOCK_T1_COMPANY_UUID,
    ])
    expect(companies.some((company) : boolean => company.uuid === ALL_COMPANY_UUID)).toBe(false)
  })
})
