import { createContext, useContext } from 'react'
import type {
  AuthSession,
  ChangePasswordPayload,
  CompanySummary,
  LoginRequest,
  UpdateAuthUserPayload,
} from '../api'

export type AuthContextValue = {
  session: AuthSession | null
  isLoading: boolean
  companies: CompanySummary[]
  selectedCompanyUuid: string | null
  selectedCompany: CompanySummary | null
  isCompanyLoading: boolean
  companyError: string | null
  refreshSession(): Promise<AuthSession | null>
  login(payload: LoginRequest): Promise<AuthSession>
  updateUser(payload: UpdateAuthUserPayload): Promise<AuthSession>
  changePassword(payload: ChangePasswordPayload): Promise<void>
  selectCompany(companyUuid: string): void
  logout(): Promise<void>
}

export const AuthContext: React.Context<AuthContextValue | null> = createContext<AuthContextValue | null>(null)

export function useAuth() : AuthContextValue {
  const value: AuthContextValue | null = useContext(AuthContext)
  if (!value) {
    throw new Error('useAuth must be used inside AuthProvider.')
  }
  return value
}
