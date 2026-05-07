import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  changeCurrentUserPassword,
  getCurrentAuthSession,
  login as requestLogin,
  logout as requestLogout,
  updateCurrentUser,
} from '../api'
import type { AuthSession, ChangePasswordPayload, LoginRequest, UpdateAuthUserPayload } from '../api'

type AuthContextValue = {
  session: AuthSession | null
  isLoading: boolean
  refreshSession(): Promise<AuthSession | null>
  login(payload: LoginRequest): Promise<AuthSession>
  updateUser(payload: UpdateAuthUserPayload): Promise<AuthSession>
  changePassword(payload: ChangePasswordPayload): Promise<void>
  logout(): Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let alive = true
    getCurrentAuthSession()
      .then((nextSession) => {
        if (alive) setSession(nextSession)
      })
      .catch(() => {
        if (alive) setSession(null)
      })
      .finally(() => {
        if (alive) setIsLoading(false)
      })

    return () => {
      alive = false
    }
  }, [])

  const refreshSession = useCallback(async () => {
    const nextSession = await getCurrentAuthSession()
    setSession(nextSession)
    return nextSession
  }, [])

  const login = useCallback(async (payload: LoginRequest) => {
    const result = await requestLogin(payload)
    setSession(result.session)
    return result.session
  }, [])

  const logout = useCallback(async () => {
    await requestLogout()
    setSession(null)
  }, [])

  const updateUser = useCallback(async (payload: UpdateAuthUserPayload) => {
    const nextSession = await updateCurrentUser(payload)
    setSession(nextSession)
    return nextSession
  }, [])

  const changePassword = useCallback(async (payload: ChangePasswordPayload) => {
    await changeCurrentUserPassword(payload)
  }, [])

  const value = useMemo(
    () => ({
      session,
      isLoading,
      refreshSession,
      login,
      updateUser,
      changePassword,
      logout,
    }),
    [changePassword, isLoading, login, logout, refreshSession, session, updateUser],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) {
    throw new Error('useAuth must be used inside AuthProvider.')
  }
  return value
}
