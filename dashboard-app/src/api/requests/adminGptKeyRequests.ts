import type { AdminGptKeyPurpose, AdminGptKeyTestResult, CreateAdminGptKeyPayload, RotateAdminGptKeyPayload } from '..'
import { mockAdminGptKeyApi } from '../mock'
import type { AdminGptKeyApi, AdminGptKeySummary, UpdateAdminGptKeyPayload } from '../types'
import { apiRequest, USE_MOCK_API } from './httpClient'
import { withMockApiAdapterErrors } from './mockApiError'

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
  // GET /admin/gpt-keys: GPT 키 목록 조회.
  getAdminGptKeys: () : Promise<AdminGptKeySummary[]> => apiRequest('/admin/gpt-keys'),
  // POST /admin/gpt-keys: GPT 키 생성.
  createAdminGptKey: (payload: CreateAdminGptKeyPayload) : Promise<AdminGptKeySummary> => apiRequest('/admin/gpt-keys', { method: 'POST', body: payload }),
  // PATCH /admin/gpt-keys/{uuid}: GPT 키 메타데이터 갱신.
  updateAdminGptKey: async (payload: UpdateAdminGptKeyPayload) : Promise<AdminGptKeySummary> => {
    const updated: AdminGptKeySummary = await apiRequest<AdminGptKeySummary>(`/admin/gpt-keys/${encodeURIComponent(payload.uuid)}`, {
      method: 'PATCH',
      body: toMetadataPayload(payload),
    })
    if (!payload.plainKey?.trim()) return updated
    // POST /admin/gpt-keys/{uuid}/rotate: GPT 키 회전.
    return apiRequest(`/admin/gpt-keys/${encodeURIComponent(payload.uuid)}/rotate`, {
      method: 'POST',
      body: { plainKey: payload.plainKey },
    })
  },
  // POST /admin/gpt-keys/{uuid}/rotate: GPT 키 회전(명시 호출).
  rotateAdminGptKey: (payload: RotateAdminGptKeyPayload) : Promise<AdminGptKeySummary> =>
    apiRequest(`/admin/gpt-keys/${encodeURIComponent(payload.uuid)}/rotate`, {
      method: 'POST',
      body: { plainKey: payload.plainKey },
    }),
  // POST /admin/gpt-keys/{uuid}/test: GPT 키 테스트.
  testAdminGptKey: (keyUuid: string) : Promise<AdminGptKeyTestResult> =>
    apiRequest(`/admin/gpt-keys/${encodeURIComponent(keyUuid)}/test`, { method: 'POST' }),
  // DELETE /admin/gpt-keys/{uuid}: GPT 키 삭제.
  deleteAdminGptKey: (keyUuid: string) : Promise<void> =>
    apiRequest(`/admin/gpt-keys/${encodeURIComponent(keyUuid)}`, { method: 'DELETE' }),
}

const mockAdminGptKeyRequests: AdminGptKeyApi = withMockApiAdapterErrors<AdminGptKeyApi>({
  // GET /admin/gpt-keys: GPT 키 목록 조회(목데이터).
  getAdminGptKeys: () : Promise<AdminGptKeySummary[]> => mockAdminGptKeyApi.getAdminGptKeys(),
  // POST /admin/gpt-keys: GPT 키 생성(목데이터).
  createAdminGptKey: (payload: CreateAdminGptKeyPayload) : Promise<AdminGptKeySummary> => mockAdminGptKeyApi.createAdminGptKey(payload),
  // PATCH /admin/gpt-keys/{uuid}: GPT 키 수정(목데이터).
  updateAdminGptKey: (payload: UpdateAdminGptKeyPayload) : Promise<AdminGptKeySummary> => mockAdminGptKeyApi.updateAdminGptKey(payload),
  // POST /admin/gpt-keys/{uuid}/rotate: GPT 키 회전(목데이터).
  rotateAdminGptKey: (payload: RotateAdminGptKeyPayload) : Promise<AdminGptKeySummary> => mockAdminGptKeyApi.rotateAdminGptKey(payload),
  // POST /admin/gpt-keys/{uuid}/test: GPT 키 테스트(목데이터).
  testAdminGptKey: (keyUuid: string) : Promise<AdminGptKeyTestResult> => mockAdminGptKeyApi.testAdminGptKey(keyUuid),
  // DELETE /admin/gpt-keys/{uuid}: GPT 키 삭제(목데이터).
  deleteAdminGptKey: (keyUuid: string) : Promise<void> => mockAdminGptKeyApi.deleteAdminGptKey(keyUuid),
})

export const adminGptKeyRequests: AdminGptKeyApi = USE_MOCK_API
  ? mockAdminGptKeyRequests
  : httpAdminGptKeyRequests
