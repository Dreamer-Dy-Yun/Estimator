import { mockAuthApi } from '../mock'
import type { AuthApi } from '../types'

/**
 * Auth/admin-user request adapter.
 *
 * Backend switch point: replace the mock calls in this file with HTTP requests.
 * The UI depends only on AuthApi, so login/session/admin-user endpoint shape should
 * be decided from src/api/types/auth.ts and documented in MD/backend-api.
 *
 * Watch points for the backend:
 * - Prefer HttpOnly cookie session storage; do not persist tokens in the browser.
 * - Password and temporary password values should exist only in request bodies or
 *   one-time reset responses, never in list/session responses.
 * - Admin user mutation must be enforced server-side, including "last admin" and
 *   self-disable/delete protections.
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
