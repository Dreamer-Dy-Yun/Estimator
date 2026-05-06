import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { getCurrentAuthSession, login as requestLogin, logout as requestLogout } from '../api'
import type { AuthSession, LoginRequest } from '../api'

type AuthContextValue = {
  session: AuthSession | null
  isLoading: boolean
  login(payload: LoginRequest): Promise<AuthSession>
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

  const login = useCallback(async (payload: LoginRequest) => {
    const result = await requestLogin(payload)
    setSession(result.session)
    return result.session
  }, [])

  const logout = useCallback(async () => {
    await requestLogout()
    setSession(null)
  }, [])

  const value = useMemo(
    () => ({
      session,
      isLoading,
      login,
      logout,
    }),
    [isLoading, login, logout, session],
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
