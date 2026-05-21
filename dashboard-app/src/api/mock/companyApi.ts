import type { CompanyApi } from '../types'
import { MOCK_COMPANIES } from './mockCompanyScope'
import { sleep } from './utils'

export const mockCompanyApi: CompanyApi = {
  getCompanies: async () => {
    await sleep(60)
    return MOCK_COMPANIES.map((company) => ({ ...company }))
  },
}
