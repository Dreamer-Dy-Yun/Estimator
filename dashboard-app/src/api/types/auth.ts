export interface LoginRequest {
  username: string
  password: string
}

export interface UpdateAuthUserPayload {
  name: string
}

export interface AuthUser {
  id: string
  name: string
  role: 'admin' | 'operator' | 'viewer'
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
  logout(): Promise<void>
}
