import type { CompanyApi, CompanySummary } from '../types'
import { sleep } from './utils'

const MOCK_COMPANIES: CompanySummary[] = [
  {
    uuid: '00000000-0000-4000-8000-000000000100',
    name: '전체',
  },
  {
    uuid: '00000000-0000-4000-8000-000000000101',
    name: '한아INT',
  },
  {
    uuid: '00000000-0000-4000-8000-000000000102',
    name: 'T1글로벌',
  },
]

export const mockCompanyApi: CompanyApi = {
  getCompanies: async () => {
    await sleep(60)
    return MOCK_COMPANIES.map((company) => ({ ...company }))
  },
}
