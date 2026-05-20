import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  changeCurrentUserPassword,
  getCurrentAuthSession,
  getApiErrorDisplayMessage,
  login as requestLogin,
  logout as requestLogout,
  updateCurrentUser,
} from '../api'
import type {
  AuthSession,
  ChangePasswordPayload,
  LoginRequest,
  UpdateAuthUserPayload,
} from '../api'
import { isApiClientError } from '../api/types/api-error'
import { AuthContext } from './AuthContext'

const AUTH_SESSION_ERROR_STORAGE_KEY = 'han-a.auth.session-error-message'
const DEFAULT_SESSION_ERROR_MESSAGE = '세션 확인 중 오류가 발생했습니다.'

function getSessionStorage() {
  if (typeof window === 'undefined') return null
  try {
    return window.sessionStorage
  } catch {
    return null
  }
}

function clearSessionCheckErrorMessage() {
  getSessionStorage()?.removeItem(AUTH_SESSION_ERROR_STORAGE_KEY)
}

function persistSessionCheckErrorMessage(error: unknown) {
  const storage = getSessionStorage()
  if (!storage) return
  if (isApiClientError(error) && error.kind === 'auth') {
    storage.removeItem(AUTH_SESSION_ERROR_STORAGE_KEY)
    return
  }
  storage.setItem(
    AUTH_SESSION_ERROR_STORAGE_KEY,
    getApiErrorDisplayMessage(error, DEFAULT_SESSION_ERROR_MESSAGE),
  )
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let alive = true
    getCurrentAuthSession()
      .then((nextSession) => {
        if (alive) {
          setSession(nextSession)
          clearSessionCheckErrorMessage()
        }
      })
      .catch((error) => {
        if (alive) {
          setSession(null)
          persistSessionCheckErrorMessage(error)
        }
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
