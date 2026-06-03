import type { AdminUserSummary, AuthSession, ChangePasswordPayload, CreateAdminUserPayload, LoginRequest, LoginResult, ResetAdminUserPasswordResult, UpdateAdminUserPayload, UpdateAuthUserPayload } from '..'
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
  getCurrentSession: async () : Promise<AuthSession | null> => {
    try {
      return await apiRequest('/auth/session')
    } catch (error) {
      if (error instanceof ApiHttpError && error.status === 401) return null
      throw error
    }
  },
  login: (payload: LoginRequest) : Promise<LoginResult> => apiRequest('/auth/login', { method: 'POST', body: payload }),
  updateCurrentUser: (payload: UpdateAuthUserPayload) : Promise<AuthSession> => apiRequest('/auth/me', { method: 'PATCH', body: payload }),
  changeCurrentUserPassword: (payload: ChangePasswordPayload) : Promise<void> => apiRequest('/auth/me/password', { method: 'POST', body: payload }),
  getAdminUsers: () : Promise<AdminUserSummary[]> => apiRequest('/admin/users'),
  createAdminUser: (payload: CreateAdminUserPayload) : Promise<AdminUserSummary> => apiRequest('/admin/users', { method: 'POST', body: payload }),
  updateAdminUser: (payload: UpdateAdminUserPayload) : Promise<AdminUserSummary> =>
    apiRequest(`/admin/users/${encodeURIComponent(payload.uuid)}`, { method: 'PATCH', body: payload }),
  resetAdminUserPassword: (userUuid: string) : Promise<ResetAdminUserPasswordResult> =>
    apiRequest(`/admin/users/${encodeURIComponent(userUuid)}/password-reset`, { method: 'POST' }),
  deleteAdminUser: (userUuid: string) : Promise<void> =>
    apiRequest(`/admin/users/${encodeURIComponent(userUuid)}`, { method: 'DELETE' }),
  logout: () : Promise<void> => apiRequest('/auth/logout', { method: 'POST' }),
}

const mockAuthRequests: AuthApi = {
  getCurrentSession: () : Promise<AuthSession | null> => mockAuthApi.getCurrentSession(),
  login: (payload: LoginRequest) : Promise<LoginResult> => mockAuthApi.login(payload),
  updateCurrentUser: (payload: UpdateAuthUserPayload) : Promise<AuthSession> => mockAuthApi.updateCurrentUser(payload),
  changeCurrentUserPassword: (payload: ChangePasswordPayload) : Promise<void> => mockAuthApi.changeCurrentUserPassword(payload),
  getAdminUsers: () : Promise<AdminUserSummary[]> => mockAuthApi.getAdminUsers(),
  createAdminUser: (payload: CreateAdminUserPayload) : Promise<AdminUserSummary> => mockAuthApi.createAdminUser(payload),
  updateAdminUser: (payload: UpdateAdminUserPayload) : Promise<AdminUserSummary> => mockAuthApi.updateAdminUser(payload),
  resetAdminUserPassword: (userUuid: string) : Promise<ResetAdminUserPasswordResult> => mockAuthApi.resetAdminUserPassword(userUuid),
  deleteAdminUser: (userUuid: string) : Promise<void> => mockAuthApi.deleteAdminUser(userUuid),
  logout: () : Promise<void> => mockAuthApi.logout(),
}

export const authRequests: AuthApi = USE_MOCK_API ? mockAuthRequests : httpAuthRequests
