import { mockAdminGptKeyApi } from '../mock'
import type { AdminGptKeyApi } from '../types'

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
export const adminGptKeyRequests: AdminGptKeyApi = {
  getAdminGptKeys: () => mockAdminGptKeyApi.getAdminGptKeys(),
  createAdminGptKey: (payload) => mockAdminGptKeyApi.createAdminGptKey(payload),
  updateAdminGptKey: (payload) => mockAdminGptKeyApi.updateAdminGptKey(payload),
  testAdminGptKey: (keyUuid) => mockAdminGptKeyApi.testAdminGptKey(keyUuid),
  deleteAdminGptKey: (keyUuid) => mockAdminGptKeyApi.deleteAdminGptKey(keyUuid),
}
