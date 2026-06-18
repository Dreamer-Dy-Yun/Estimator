import type { AdminUserSummary, AuthSession, ChangePasswordPayload, CreateAdminUserPayload, LoginRequest, LoginResult, ResetAdminUserPasswordResult, UpdateAdminUserPayload, UpdateAuthUserPayload } from '..'
import { mockAuthApi } from '../mock'
import type { AuthApi } from '../types'
import { ApiHttpError, apiRequest, USE_MOCK_API } from './httpClient'
import { withMockApiAdapterErrors } from './mockApiError'

/**
 * Auth/admin-user request adapter.
 *
 * HTTP and mock auth adapters are both implemented here.
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
  // GET /auth/session: 현재 로그인 세션 조회.
  getCurrentSession: async () : Promise<AuthSession | null> => {
    try {
      return await apiRequest('/auth/session')
    } catch (error: unknown) {
      if (error instanceof ApiHttpError && error.status === 401) return null
      throw error
    }
  },
  // POST /auth/login: 사용자 로그인.
  login: (payload: LoginRequest) : Promise<LoginResult> => apiRequest('/auth/login', { method: 'POST', body: payload }),
  // PATCH /auth/me: 내 계정 정보 수정.
  // Self profile update. Backend owns normalized loginId uniqueness and returns 409 conflict on duplicate loginId.
  updateCurrentUser: (payload: UpdateAuthUserPayload) : Promise<AuthSession> => apiRequest('/auth/me', { method: 'PATCH', body: payload }),
  // POST /auth/me/password: 비밀번호 변경.
  changeCurrentUserPassword: (payload: ChangePasswordPayload) : Promise<void> => apiRequest('/auth/me/password', { method: 'POST', body: payload }),
  // GET /admin/users: 관리자 사용자 목록 조회.
  getAdminUsers: () : Promise<AdminUserSummary[]> => apiRequest('/admin/users'),
  // POST /admin/users: 관리자 사용자 생성.
  createAdminUser: (payload: CreateAdminUserPayload) : Promise<AdminUserSummary> => apiRequest('/admin/users', { method: 'POST', body: payload }),
  // PATCH /admin/users/{uuid}: 관리자 사용자 수정.
  updateAdminUser: (payload: UpdateAdminUserPayload) : Promise<AdminUserSummary> =>
    apiRequest(`/admin/users/${encodeURIComponent(payload.uuid)}`, { method: 'PATCH', body: payload }),
  // POST /admin/users/{uuid}/password-reset: 관리자 임시 비밀번호 재설정.
  resetAdminUserPassword: (userUuid: string) : Promise<ResetAdminUserPasswordResult> =>
    apiRequest(`/admin/users/${encodeURIComponent(userUuid)}/password-reset`, { method: 'POST' }),
  // DELETE /admin/users/{uuid}: 관리자 사용자 삭제.
  deleteAdminUser: (userUuid: string) : Promise<void> =>
    apiRequest(`/admin/users/${encodeURIComponent(userUuid)}`, { method: 'DELETE' }),
  // POST /auth/logout: 로그아웃.
  logout: () : Promise<void> => apiRequest('/auth/logout', { method: 'POST' }),
}

const mockAuthRequests: AuthApi = withMockApiAdapterErrors<AuthApi>({
  // GET /auth/session: 현재 로그인 세션 조회(목데이터).
  getCurrentSession: () : Promise<AuthSession | null> => mockAuthApi.getCurrentSession(),
  // POST /auth/login: 사용자 로그인(목데이터).
  login: (payload: LoginRequest) : Promise<LoginResult> => mockAuthApi.login(payload),
  // PATCH /auth/me: 내 계정 정보 수정(목데이터).
  updateCurrentUser: (payload: UpdateAuthUserPayload) : Promise<AuthSession> => mockAuthApi.updateCurrentUser(payload),
  // POST /auth/me/password: 비밀번호 변경(목데이터).
  changeCurrentUserPassword: (payload: ChangePasswordPayload) : Promise<void> => mockAuthApi.changeCurrentUserPassword(payload),
  // GET /admin/users: 관리자 사용자 목록 조회(목데이터).
  getAdminUsers: () : Promise<AdminUserSummary[]> => mockAuthApi.getAdminUsers(),
  // POST /admin/users: 관리자 사용자 생성(목데이터).
  createAdminUser: (payload: CreateAdminUserPayload) : Promise<AdminUserSummary> => mockAuthApi.createAdminUser(payload),
  // PATCH /admin/users/{uuid}: 관리자 사용자 수정(목데이터).
  updateAdminUser: (payload: UpdateAdminUserPayload) : Promise<AdminUserSummary> => mockAuthApi.updateAdminUser(payload),
  // POST /admin/users/{uuid}/password-reset: 관리자 임시 비밀번호 재설정(목데이터).
  resetAdminUserPassword: (userUuid: string) : Promise<ResetAdminUserPasswordResult> => mockAuthApi.resetAdminUserPassword(userUuid),
  // DELETE /admin/users/{uuid}: 관리자 사용자 삭제(목데이터).
  deleteAdminUser: (userUuid: string) : Promise<void> => mockAuthApi.deleteAdminUser(userUuid),
  // POST /auth/logout: 로그아웃(목데이터).
  logout: () : Promise<void> => mockAuthApi.logout(),
})

export const authRequests: AuthApi = USE_MOCK_API ? mockAuthRequests : httpAuthRequests
