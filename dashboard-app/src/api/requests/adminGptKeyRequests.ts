import { mockAdminGptKeyApi } from '../mock'
import type { AdminGptKeyApi, AdminGptKeySummary, UpdateAdminGptKeyPayload } from '../types'
import { apiRequest, USE_MOCK_API } from './httpClient'

/**
 * Admin GPT key request adapter.
 *
 * Backend switch point: replace the mock calls in this file with HTTP requests.
 * This contract is intentionally GPT-only. Do not reintroduce provider/baseUrl/
 * projectId fields unless the product scope changes.
 *
 * Contract watch points for the backend:
 * - This file is the only GPT-key API switch point. Admin screens receive only
 *   AdminGptKeySummary DTOs and should never hold raw keys after submit.
 * - create/update requests may contain plainKey, but list/update/test/delete
 *   responses must never return the raw key. update handles metadata changes and
 *   optional key replacement together because the admin UI has one "변경" action.
 * - Key storage, encryption, validation, and audit logs are backend concerns.
 * - All endpoints require an admin session.
 */
function toMetadataPayload(payload: UpdateAdminGptKeyPayload) {
  const { uuid, plainKey, ...metadata } = payload
  void uuid
  void plainKey
  return metadata
}

const httpAdminGptKeyRequests: AdminGptKeyApi = {
  getAdminGptKeys: () => apiRequest('/admin/gpt-keys'),
  createAdminGptKey: (payload) => apiRequest('/admin/gpt-keys', { method: 'POST', body: payload }),
  updateAdminGptKey: async (payload) => {
    const updated = await apiRequest<AdminGptKeySummary>(`/admin/gpt-keys/${encodeURIComponent(payload.uuid)}`, {
      method: 'PATCH',
      body: toMetadataPayload(payload),
    })
    if (!payload.plainKey?.trim()) return updated
    return apiRequest(`/admin/gpt-keys/${encodeURIComponent(payload.uuid)}/rotate`, {
      method: 'POST',
      body: { plainKey: payload.plainKey },
    })
  },
  rotateAdminGptKey: (payload) =>
    apiRequest(`/admin/gpt-keys/${encodeURIComponent(payload.uuid)}/rotate`, {
      method: 'POST',
      body: { plainKey: payload.plainKey },
    }),
  testAdminGptKey: (keyUuid) =>
    apiRequest(`/admin/gpt-keys/${encodeURIComponent(keyUuid)}/test`, { method: 'POST' }),
  deleteAdminGptKey: (keyUuid) =>
    apiRequest(`/admin/gpt-keys/${encodeURIComponent(keyUuid)}`, { method: 'DELETE' }),
}

const mockAdminGptKeyRequests: AdminGptKeyApi = {
  getAdminGptKeys: () => mockAdminGptKeyApi.getAdminGptKeys(),
  createAdminGptKey: (payload) => mockAdminGptKeyApi.createAdminGptKey(payload),
  updateAdminGptKey: (payload) => mockAdminGptKeyApi.updateAdminGptKey(payload),
  rotateAdminGptKey: (payload) => mockAdminGptKeyApi.rotateAdminGptKey(payload),
  testAdminGptKey: (keyUuid) => mockAdminGptKeyApi.testAdminGptKey(keyUuid),
  deleteAdminGptKey: (keyUuid) => mockAdminGptKeyApi.deleteAdminGptKey(keyUuid),
}

export const adminGptKeyRequests: AdminGptKeyApi = USE_MOCK_API
  ? mockAdminGptKeyRequests
  : httpAdminGptKeyRequests
