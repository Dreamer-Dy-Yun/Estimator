import { mockCompanyApi } from '../mock'
import type { CompanyApi } from '../types'
import { apiRequest, USE_MOCK_API } from './httpClient'

const httpCompanyRequests: CompanyApi = {
  getCompanies: () => apiRequest('/companies'),
}

const mockCompanyRequests: CompanyApi = {
  getCompanies: () => mockCompanyApi.getCompanies(),
}

export const companyRequests: CompanyApi = USE_MOCK_API ? mockCompanyRequests : httpCompanyRequests
