import type { CompanySummary } from '..'
import { mockCompanyApi } from '../mock'
import type { CompanyApi } from '../types'
import { apiRequest, USE_MOCK_API } from './httpClient'
import { withMockApiAdapterErrors } from './mockApiError'

/**
 * Company selector endpoint.
 *
 * Backend doc: MD/backend-api/dashboard-api-contract-catalog.md section 6.
 * The frontend owns the all-company sentinel; backend should return real company rows.
 */
const httpCompanyRequests: CompanyApi = {
  // GET /companies: 회사 목록 조회.
  getCompanies: () : Promise<CompanySummary[]> => apiRequest('/companies'),
}

const mockCompanyRequests: CompanyApi = withMockApiAdapterErrors<CompanyApi>({
  // GET /companies: 회사 목록 조회(목데이터).
  getCompanies: () : Promise<CompanySummary[]> => mockCompanyApi.getCompanies(),
})

export const companyRequests: CompanyApi = USE_MOCK_API ? mockCompanyRequests : httpCompanyRequests
