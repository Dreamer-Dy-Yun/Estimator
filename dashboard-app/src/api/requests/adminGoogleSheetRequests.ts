import { mockAdminGoogleSheetApi } from '../mock'
import type { AdminGoogleSheetApi, CompanyMutationScopeParams, CompanyScopeParams } from '../types'
import {
  getRequiredCompanyUuidForMutationScope,
  normalizeCompanyScopeParams,
} from '../types'
import { apiRequest, USE_MOCK_API } from './httpClient'

function toCompanyQuery(params?: CompanyScopeParams) {
  const normalized = normalizeCompanyScopeParams(params)
  if (!normalized?.companyUuid) return ''
  return `?${new URLSearchParams({ companyUuid: normalized.companyUuid }).toString()}`
}

function toRequiredCompanyQuery(params: CompanyMutationScopeParams) {
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
  getAdminGoogleSheetConfigs: (params) => apiRequest(`/admin/google-sheets${toCompanyQuery(params)}`),
  createAdminGoogleSheetConfig: (payload) =>
    apiRequest('/admin/google-sheets', { method: 'POST', body: payload }),
  updateAdminGoogleSheetConfig: (payload) =>
    apiRequest(`/admin/google-sheets/${encodeURIComponent(payload.uuid)}`, {
      method: 'PATCH',
      body: payload,
    }),
  deleteAdminGoogleSheetConfig: (configUuid, params) =>
    apiRequest(`/admin/google-sheets/${encodeURIComponent(configUuid)}${toRequiredCompanyQuery(params)}`, {
      method: 'DELETE',
    }),
}

const mockAdminGoogleSheetRequests: AdminGoogleSheetApi = {
  getAdminGoogleSheetConfigs: (params) => mockAdminGoogleSheetApi.getAdminGoogleSheetConfigs(params),
  createAdminGoogleSheetConfig: (payload) => mockAdminGoogleSheetApi.createAdminGoogleSheetConfig(payload),
  updateAdminGoogleSheetConfig: (payload) => mockAdminGoogleSheetApi.updateAdminGoogleSheetConfig(payload),
  deleteAdminGoogleSheetConfig: (configUuid, params) => mockAdminGoogleSheetApi.deleteAdminGoogleSheetConfig(configUuid, params),
}

export const adminGoogleSheetRequests: AdminGoogleSheetApi = USE_MOCK_API
  ? mockAdminGoogleSheetRequests
  : httpAdminGoogleSheetRequests
