import type { AdminGoogleSheetConfigSummary, CreateAdminGoogleSheetConfigPayload, UpdateAdminGoogleSheetConfigPayload } from '..'
import { mockAdminGoogleSheetApi } from '../mock'
import type { AdminGoogleSheetApi, CompanyMutationScopeParams, CompanyScopeParams } from '../types'
import {
  getRequiredCompanyUuidForMutationScope,
  normalizeCompanyScopeParams,
} from '../types'
import { apiRequest, USE_MOCK_API } from './httpClient'
import { withMockApiAdapterErrors } from './mockApiError'

function toCompanyQuery(params?: CompanyScopeParams) : string {
  const normalized: CompanyScopeParams | undefined = normalizeCompanyScopeParams(params)
  if (!normalized?.companyUuid) return ''
  return `?${new URLSearchParams({ companyUuid: normalized.companyUuid }).toString()}`
}

function toRequiredCompanyQuery(params: CompanyMutationScopeParams) : string {
  return `?${new URLSearchParams({
    companyUuid: getRequiredCompanyUuidForMutationScope(params.companyUuid),
  }).toString()}`
}

/**
 * Backend contract switch point for Google Sheets integrations.
 *
 * Python backend direction:
 * - Google Sheet configs belong to one concrete COMPANY. `companyUuid` is
 *   required for create/update/delete and optional for list filtering.
 * - Keep the service account JSON key on the server only. The frontend may send
 *   `serviceAccountKeyJson` on create/update, but list responses must return
 *   only `maskedServiceAccountKey`.
 * - The backend should parse `client_email` from the JSON key and expose it as
 *   `serviceAccountEmail` in summary responses. The UI does not ask the admin
 *   to duplicate that value.
 * - `spreadsheetUrl` is the user-facing address, while `spreadsheetId` should be
 *   parsed and stored server-side for Google Sheets API calls.
 * - `purpose` and `note` describe how this sheet is used; they are not UI-only
 *   fields and should be persisted with the config.
 */
const httpAdminGoogleSheetRequests: AdminGoogleSheetApi = {
  // GET /admin/google-sheets: 구글시트 설정 목록 조회.
  getAdminGoogleSheetConfigs: (params: CompanyScopeParams | undefined) : Promise<AdminGoogleSheetConfigSummary[]> => apiRequest(`/admin/google-sheets${toCompanyQuery(params)}`),
  // POST /admin/google-sheets: 구글시트 설정 생성.
  createAdminGoogleSheetConfig: (payload: CreateAdminGoogleSheetConfigPayload) : Promise<AdminGoogleSheetConfigSummary> =>
    apiRequest('/admin/google-sheets', { method: 'POST', body: payload }),
  // PATCH /admin/google-sheets/{uuid}: 구글시트 설정 수정.
  updateAdminGoogleSheetConfig: (payload: UpdateAdminGoogleSheetConfigPayload) : Promise<AdminGoogleSheetConfigSummary> =>
    apiRequest(`/admin/google-sheets/${encodeURIComponent(payload.uuid)}`, {
      method: 'PATCH',
      body: payload,
    }),
  // DELETE /admin/google-sheets/{uuid}: 구글시트 설정 삭제.
  deleteAdminGoogleSheetConfig: (configUuid: string, params: CompanyMutationScopeParams) : Promise<void> =>
    apiRequest(`/admin/google-sheets/${encodeURIComponent(configUuid)}${toRequiredCompanyQuery(params)}`, {
      method: 'DELETE',
    }),
}

const mockAdminGoogleSheetRequests: AdminGoogleSheetApi = withMockApiAdapterErrors<AdminGoogleSheetApi>({
  // GET /admin/google-sheets: 구글시트 설정 목록 조회(목데이터).
  getAdminGoogleSheetConfigs: (params: CompanyScopeParams | undefined) : Promise<AdminGoogleSheetConfigSummary[]> => mockAdminGoogleSheetApi.getAdminGoogleSheetConfigs(params),
  // POST /admin/google-sheets: 구글시트 설정 생성(목데이터).
  createAdminGoogleSheetConfig: (payload: CreateAdminGoogleSheetConfigPayload) : Promise<AdminGoogleSheetConfigSummary> => mockAdminGoogleSheetApi.createAdminGoogleSheetConfig(payload),
  // PATCH /admin/google-sheets/{uuid}: 구글시트 설정 수정(목데이터).
  updateAdminGoogleSheetConfig: (payload: UpdateAdminGoogleSheetConfigPayload) : Promise<AdminGoogleSheetConfigSummary> => mockAdminGoogleSheetApi.updateAdminGoogleSheetConfig(payload),
  // DELETE /admin/google-sheets/{uuid}: 구글시트 설정 삭제(목데이터).
  deleteAdminGoogleSheetConfig: (configUuid: string, params: CompanyMutationScopeParams) : Promise<void> => mockAdminGoogleSheetApi.deleteAdminGoogleSheetConfig(configUuid, params),
})

export const adminGoogleSheetRequests: AdminGoogleSheetApi = USE_MOCK_API
  ? mockAdminGoogleSheetRequests
  : httpAdminGoogleSheetRequests
