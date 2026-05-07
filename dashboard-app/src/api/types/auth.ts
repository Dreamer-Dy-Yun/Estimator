export interface LoginRequest {
  loginId: string
  password: string
}

export type AuthRole = 'admin' | 'user'

export interface UpdateAuthUserPayload {
  loginId: string
}

export interface ChangePasswordPayload {
  currentPassword: string
  newPassword: string
}

export interface AuthUser {
  uuid: string
  loginId: string
  role: AuthRole
  mustChangePassword: boolean
}

export interface AdminUserSummary extends AuthUser {
  isActive: boolean
  dbUpdatedAt: string
}

export interface CreateAdminUserPayload {
  loginId: string
  password: string
  role: AuthRole
  isActive: boolean
}

export interface UpdateAdminUserPayload {
  uuid: string
  loginId: string
  role: AuthRole
  isActive: boolean
}

export interface ResetAdminUserPasswordResult {
  temporaryPassword: string
  mustChangePassword: boolean
  dbUpdatedAt: string
}

export interface AuthSession {
  user: AuthUser
  expiresAt: string
}

export interface LoginResult {
  session: AuthSession
}

export interface AuthApi {
  getCurrentSession(): Promise<AuthSession | null>
  login(payload: LoginRequest): Promise<LoginResult>
  updateCurrentUser(payload: UpdateAuthUserPayload): Promise<AuthSession>
  changeCurrentUserPassword(payload: ChangePasswordPayload): Promise<void>
  getAdminUsers(): Promise<AdminUserSummary[]>
  createAdminUser(payload: CreateAdminUserPayload): Promise<AdminUserSummary>
  updateAdminUser(payload: UpdateAdminUserPayload): Promise<AdminUserSummary>
  resetAdminUserPassword(userUuid: string): Promise<ResetAdminUserPasswordResult>
  deleteAdminUser(userUuid: string): Promise<void>
  logout(): Promise<void>
}
