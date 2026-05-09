import { mockAdminGptKeyApi } from '../mock'
import type { AdminGptKeyApi } from '../types'

/**
 * Admin GPT key request adapter.
 *
 * Backend switch point: replace the mock calls in this file with HTTP requests.
 * This contract is intentionally GPT-only. Do not reintroduce provider/baseUrl/
 * projectId fields unless the product scope changes.
 *
 * Watch points for the backend:
 * - create/rotate requests may contain plainKey, but list/update/test/delete
 *   responses must never return the raw key.
 * - Key storage, encryption, validation, and audit logs are backend concerns.
 * - All endpoints require an admin session.
 */
export const adminGptKeyRequests: AdminGptKeyApi = {
  getAdminGptKeys: () => mockAdminGptKeyApi.getAdminGptKeys(),
  createAdminGptKey: (payload) => mockAdminGptKeyApi.createAdminGptKey(payload),
  updateAdminGptKey: (payload) => mockAdminGptKeyApi.updateAdminGptKey(payload),
  rotateAdminGptKey: (payload) => mockAdminGptKeyApi.rotateAdminGptKey(payload),
  testAdminGptKey: (keyUuid) => mockAdminGptKeyApi.testAdminGptKey(keyUuid),
  deleteAdminGptKey: (keyUuid) => mockAdminGptKeyApi.deleteAdminGptKey(keyUuid),
}
