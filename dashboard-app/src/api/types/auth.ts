export interface LoginRequest {
  username: string
  password: string
}

export type AuthRole = 'admin' | 'operator' | 'viewer'

export interface UpdateAuthUserPayload {
  name: string
}

export interface ChangePasswordPayload {
  currentPassword: string
  newPassword: string
}

export interface AuthUser {
  id: string
  name: string
  role: AuthRole
}

export interface AdminUserSummary extends AuthUser {
  email: string
  isActive: boolean
  dbUpdatedAt: string
}

export interface CreateAdminUserPayload {
  name: string
  email: string
  role: AuthRole
  isActive: boolean
}

export interface UpdateAdminUserPayload {
  userId: string
  name: string
  role: AuthRole
  isActive: boolean
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
  deleteAdminUser(userId: string): Promise<void>
  logout(): Promise<void>
}
