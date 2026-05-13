import { mockAuthApi } from '../mock'
import type { AuthApi } from '../types'

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
export const authRequests: AuthApi = {
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
