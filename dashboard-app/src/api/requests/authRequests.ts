import { mockAuthApi } from '../mock'
import type { AuthApi } from '../types'
import { ApiHttpError, apiRequest, USE_MOCK_API } from './httpClient'

/**
 * Auth/admin-user request adapter.
 *
 * Backend switch point: replace the mock calls in this file with HTTP requests.
 * The UI depends only on AuthApi, so login/session/admin-user endpoint shape should
 * be decided from src/api/types/auth.ts and documented in MD/backend-api.
 *
 * Contract watch points for the backend:
 * - This file is the only auth/admin-user API switch point. Components must not
 *   read browser storage directly to infer login state.
 * - Prefer HttpOnly cookie session storage; do not persist tokens in the browser.
 * - The mock accepts any login value for UI verification. Real backend login
 *   must validate password_hash, is_active, failed_login_count/lock policy, and
 *   must_change_password server-side.
 * - Password and temporary password values should exist only in request bodies or
 *   one-time reset responses, never in list/session responses.
 * - Admin user mutation must be enforced server-side, including "last admin" and
 *   self-disable/delete protections.
 * - USER_ACCOUNT.uuid is the external user identifier. loginId can change and
 *   must not be used as a foreign key for candidate ownership.
 */
const httpAuthRequests: AuthApi = {
  getCurrentSession: async () => {
    try {
      return await apiRequest('/auth/session')
    } catch (error) {
      if (error instanceof ApiHttpError && error.status === 401) return null
      throw error
    }
  },
  login: (payload) => apiRequest('/auth/login', { method: 'POST', body: payload }),
  updateCurrentUser: (payload) => apiRequest('/auth/me', { method: 'PATCH', body: payload }),
  changeCurrentUserPassword: (payload) => apiRequest('/auth/me/password', { method: 'POST', body: payload }),
  getAdminUsers: () => apiRequest('/admin/users'),
  createAdminUser: (payload) => apiRequest('/admin/users', { method: 'POST', body: payload }),
  updateAdminUser: (payload) =>
    apiRequest(`/admin/users/${encodeURIComponent(payload.uuid)}`, { method: 'PATCH', body: payload }),
  resetAdminUserPassword: (userUuid) =>
    apiRequest(`/admin/users/${encodeURIComponent(userUuid)}/password-reset`, { method: 'POST' }),
  deleteAdminUser: (userUuid) =>
    apiRequest(`/admin/users/${encodeURIComponent(userUuid)}`, { method: 'DELETE' }),
  logout: () => apiRequest('/auth/logout', { method: 'POST' }),
}

const mockAuthRequests: AuthApi = {
  getCurrentSession: () => mockAuthApi.getCurrentSession(),
  login: (payload) => mockAuthApi.login(payload),
  updateCurrentUser: (payload) => mockAuthApi.updateCurrentUser(payload),
  changeCurrentUserPassword: (payload) => mockAuthApi.changeCurrentUserPassword(payload),
  getAdminUsers: () => mockAuthApi.getAdminUsers(),
  createAdminUser: (payload) => mockAuthApi.createAdminUser(payload),
  updateAdminUser: (payload) => mockAuthApi.updateAdminUser(payload),
  resetAdminUserPassword: (userUuid) => mockAuthApi.resetAdminUserPassword(userUuid),
  deleteAdminUser: (userUuid) => mockAuthApi.deleteAdminUser(userUuid),
  logout: () => mockAuthApi.logout(),
}

export const authRequests: AuthApi = USE_MOCK_API ? mockAuthRequests : httpAuthRequests
