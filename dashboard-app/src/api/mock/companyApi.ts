import type { CompanySummary } from '..'
import type { CompanyApi } from '../types'
import { MOCK_COMPANIES } from './mockCompanyScope'
import { sleep } from './utils'

export const mockCompanyApi: CompanyApi = {
  getCompanies: async () : Promise<{ uuid: string; name: string; }[]> => {
    await sleep(60)
    return MOCK_COMPANIES.map((company: CompanySummary) : { uuid: string; name: string; } => ({ ...company }))
  },
}
