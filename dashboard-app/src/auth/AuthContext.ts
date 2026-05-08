import { createContext, useContext } from 'react'
import type { AuthSession, ChangePasswordPayload, LoginRequest, UpdateAuthUserPayload } from '../api'

export type AuthContextValue = {
  session: AuthSession | null
  isLoading: boolean
  refreshSession(): Promise<AuthSession | null>
  login(payload: LoginRequest): Promise<AuthSession>
  updateUser(payload: UpdateAuthUserPayload): Promise<AuthSession>
  changePassword(payload: ChangePasswordPayload): Promise<void>
  logout(): Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) {
    throw new Error('useAuth must be used inside AuthProvider.')
  }
  return value
}
