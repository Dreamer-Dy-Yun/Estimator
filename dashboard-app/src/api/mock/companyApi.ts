import type { CompanySummary } from '..'
import type { CompanyApi } from '../types'
import { MOCK_REAL_COMPANIES } from './mockCompanyScope'
import { sleep } from './utils'

export const mockCompanyApi: CompanyApi = {
  getCompanies: async () : Promise<CompanySummary[]> => {
    await sleep(60)
    return MOCK_REAL_COMPANIES.map((company: CompanySummary) : CompanySummary => ({ ...company }))
  },
}
