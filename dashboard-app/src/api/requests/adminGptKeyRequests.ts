import type { AdminGptKeyPurpose, AdminGptKeyTestResult, CreateAdminGptKeyPayload, RotateAdminGptKeyPayload } from '..'
import { mockAdminGptKeyApi } from '../mock'
import type { AdminGptKeyApi, AdminGptKeySummary, UpdateAdminGptKeyPayload } from '../types'
import { apiRequest, USE_MOCK_API } from './httpClient'

/**
 * Admin GPT key request adapter.
 *
 * HTTP and mock GPT-key adapters are both implemented here.
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
function toMetadataPayload(payload: UpdateAdminGptKeyPayload) : { name: string; purpose: AdminGptKeyPurpose; model: string; isActive: boolean; note: string | null; } {
  const { uuid, plainKey, ...metadata }: UpdateAdminGptKeyPayload = payload
  void uuid
  void plainKey
  return metadata
}

const httpAdminGptKeyRequests: AdminGptKeyApi = {
  getAdminGptKeys: () : Promise<AdminGptKeySummary[]> => apiRequest('/admin/gpt-keys'),
  createAdminGptKey: (payload: CreateAdminGptKeyPayload) : Promise<AdminGptKeySummary> => apiRequest('/admin/gpt-keys', { method: 'POST', body: payload }),
  updateAdminGptKey: async (payload: UpdateAdminGptKeyPayload) : Promise<AdminGptKeySummary> => {
    const updated: AdminGptKeySummary = await apiRequest<AdminGptKeySummary>(`/admin/gpt-keys/${encodeURIComponent(payload.uuid)}`, {
      method: 'PATCH',
      body: toMetadataPayload(payload),
    })
    if (!payload.plainKey?.trim()) return updated
    return apiRequest(`/admin/gpt-keys/${encodeURIComponent(payload.uuid)}/rotate`, {
      method: 'POST',
      body: { plainKey: payload.plainKey },
    })
  },
  rotateAdminGptKey: (payload: RotateAdminGptKeyPayload) : Promise<AdminGptKeySummary> =>
    apiRequest(`/admin/gpt-keys/${encodeURIComponent(payload.uuid)}/rotate`, {
      method: 'POST',
      body: { plainKey: payload.plainKey },
    }),
  testAdminGptKey: (keyUuid: string) : Promise<AdminGptKeyTestResult> =>
    apiRequest(`/admin/gpt-keys/${encodeURIComponent(keyUuid)}/test`, { method: 'POST' }),
  deleteAdminGptKey: (keyUuid: string) : Promise<void> =>
    apiRequest(`/admin/gpt-keys/${encodeURIComponent(keyUuid)}`, { method: 'DELETE' }),
}

const mockAdminGptKeyRequests: AdminGptKeyApi = {
  getAdminGptKeys: () : Promise<AdminGptKeySummary[]> => mockAdminGptKeyApi.getAdminGptKeys(),
  createAdminGptKey: (payload: CreateAdminGptKeyPayload) : Promise<AdminGptKeySummary> => mockAdminGptKeyApi.createAdminGptKey(payload),
  updateAdminGptKey: (payload: UpdateAdminGptKeyPayload) : Promise<AdminGptKeySummary> => mockAdminGptKeyApi.updateAdminGptKey(payload),
  rotateAdminGptKey: (payload: RotateAdminGptKeyPayload) : Promise<AdminGptKeySummary> => mockAdminGptKeyApi.rotateAdminGptKey(payload),
  testAdminGptKey: (keyUuid: string) : Promise<AdminGptKeyTestResult> => mockAdminGptKeyApi.testAdminGptKey(keyUuid),
  deleteAdminGptKey: (keyUuid: string) : Promise<void> => mockAdminGptKeyApi.deleteAdminGptKey(keyUuid),
}

export const adminGptKeyRequests: AdminGptKeyApi = USE_MOCK_API
  ? mockAdminGptKeyRequests
  : httpAdminGptKeyRequests
