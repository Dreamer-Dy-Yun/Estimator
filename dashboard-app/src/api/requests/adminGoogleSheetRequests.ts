import { mockAdminGoogleSheetApi } from '../mock'
import type { AdminGoogleSheetApi } from '../types'
import { apiRequest, USE_MOCK_API } from './httpClient'

/**
 * Backend contract switch point for Google Sheets integrations.
 *
 * Python backend direction:
 * - Keep the service account JSON key on the server only. The frontend may send
 *   `serviceAccountKeyJson` on create/update, but list responses must return
 *   only `maskedServiceAccountKey`.
 * - The target spreadsheet must be shared with `serviceAccountEmail` using the
 *   requested `serviceAccountRole` before backend access will work.
 * - `spreadsheetUrl` is the user-facing address, while `spreadsheetId` should be
 *   parsed and stored server-side for Google Sheets API calls.
 * - `sheetRange`, `accessMode`, `purpose`, and `note` describe how this sheet is
 *   used; they are not UI-only fields and should be persisted with the config.
 */
const httpAdminGoogleSheetRequests: AdminGoogleSheetApi = {
  getAdminGoogleSheetConfigs: () => apiRequest('/admin/google-sheets'),
  createAdminGoogleSheetConfig: (payload) =>
    apiRequest('/admin/google-sheets', { method: 'POST', body: payload }),
  updateAdminGoogleSheetConfig: (payload) =>
    apiRequest(`/admin/google-sheets/${encodeURIComponent(payload.uuid)}`, {
      method: 'PATCH',
      body: payload,
    }),
  deleteAdminGoogleSheetConfig: (configUuid) =>
    apiRequest(`/admin/google-sheets/${encodeURIComponent(configUuid)}`, { method: 'DELETE' }),
}

const mockAdminGoogleSheetRequests: AdminGoogleSheetApi = {
  getAdminGoogleSheetConfigs: () => mockAdminGoogleSheetApi.getAdminGoogleSheetConfigs(),
  createAdminGoogleSheetConfig: (payload) => mockAdminGoogleSheetApi.createAdminGoogleSheetConfig(payload),
  updateAdminGoogleSheetConfig: (payload) => mockAdminGoogleSheetApi.updateAdminGoogleSheetConfig(payload),
  deleteAdminGoogleSheetConfig: (configUuid) => mockAdminGoogleSheetApi.deleteAdminGoogleSheetConfig(configUuid),
}

export const adminGoogleSheetRequests: AdminGoogleSheetApi = USE_MOCK_API
  ? mockAdminGoogleSheetRequests
  : httpAdminGoogleSheetRequests
