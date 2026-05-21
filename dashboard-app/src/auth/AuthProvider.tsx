import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import {
  changeCurrentUserPassword,
  getCompanies,
  getCurrentAuthSession,
  getApiErrorDisplayMessage,
  getCompanyUuidForOptionalScope,
  login as requestLogin,
  logout as requestLogout,
  updateCurrentUser,
} from '../api'
import type {
  AuthSession,
  ChangePasswordPayload,
  CompanySummary,
  LoginRequest,
  UpdateAuthUserPayload,
} from '../api'
import { isApiClientError } from '../api/types/api-error'
import { AuthContext } from './AuthContext'

const AUTH_SESSION_ERROR_STORAGE_KEY = 'han-a.auth.session-error-message'
const DEFAULT_COMPANY_ERROR_MESSAGE = 'Failed to load companies.'

function getDefaultCompanyUuid(companies: CompanySummary[]) {
  return companies.find((company) => getCompanyUuidForOptionalScope(company.uuid))?.uuid
    ?? companies[0]?.uuid
    ?? null
}
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
  const [companies, setCompanies] = useState<CompanySummary[]>([])
  const [selectedCompanyUuid, setSelectedCompanyUuid] = useState<string | null>(null)
  const [isCompanyLoading, setIsCompanyLoading] = useState(false)
  const [companyError, setCompanyError] = useState<string | null>(null)
  const companyRequestSeq = useRef(0)

  const applyCompanies = useCallback((nextCompanies: CompanySummary[]) => {
    setCompanies(nextCompanies)
    setSelectedCompanyUuid((currentUuid) => {
      if (currentUuid && nextCompanies.some((company) => company.uuid === currentUuid)) {
        return currentUuid
      }
      return getDefaultCompanyUuid(nextCompanies)
    })
  }, [])

  const resetCompanyState = useCallback(() => {
    companyRequestSeq.current += 1
    setCompanies([])
    setSelectedCompanyUuid(null)
    setIsCompanyLoading(false)
    setCompanyError(null)
  }, [])

  const loadCompanies = useCallback(async () => {
    const requestSeq = companyRequestSeq.current + 1
    companyRequestSeq.current = requestSeq
    setIsCompanyLoading(true)
    setCompanyError(null)

    try {
      const nextCompanies = await getCompanies()
      if (companyRequestSeq.current === requestSeq) {
        applyCompanies(nextCompanies)
      }
      return nextCompanies
    } catch (error) {
      if (companyRequestSeq.current === requestSeq) {
        setCompanies([])
        setSelectedCompanyUuid(null)
        setCompanyError(getApiErrorDisplayMessage(error, DEFAULT_COMPANY_ERROR_MESSAGE))
      }
      return []
    } finally {
      if (companyRequestSeq.current === requestSeq) {
        setIsCompanyLoading(false)
      }
    }
  }, [applyCompanies])

  useEffect(() => {
    let alive = true
    getCurrentAuthSession()
      .then(async (nextSession) => {
        if (!alive) return
        setSession(nextSession)
        clearSessionCheckErrorMessage()
        if (!nextSession) {
          resetCompanyState()
          return
        }
        await loadCompanies()
      })
      .catch((error) => {
        if (alive) {
          setSession(null)
          resetCompanyState()
          persistSessionCheckErrorMessage(error)
        }
      })
      .finally(() => {
        if (alive) setIsLoading(false)
      })

    return () => {
      alive = false
      companyRequestSeq.current += 1
    }
  }, [loadCompanies, resetCompanyState])

  const refreshSession = useCallback(async () => {
    const nextSession = await getCurrentAuthSession()
    setSession(nextSession)
    if (nextSession) {
      await loadCompanies()
    } else {
      resetCompanyState()
    }
    return nextSession
  }, [loadCompanies, resetCompanyState])

  const login = useCallback(async (payload: LoginRequest) => {
    const result = await requestLogin(payload)
    setSession(result.session)
    await loadCompanies()
    return result.session
  }, [loadCompanies])

  const logout = useCallback(async () => {
    await requestLogout()
    setSession(null)
    resetCompanyState()
  }, [resetCompanyState])

  const updateUser = useCallback(async (payload: UpdateAuthUserPayload) => {
    const nextSession = await updateCurrentUser(payload)
    setSession(nextSession)
    return nextSession
  }, [])

  const changePassword = useCallback(async (payload: ChangePasswordPayload) => {
    await changeCurrentUserPassword(payload)
  }, [])

  const selectedCompany = useMemo(
    () => companies.find((company) => company.uuid === selectedCompanyUuid) ?? null,
    [companies, selectedCompanyUuid],
  )

  const selectCompany = useCallback((companyUuid: string) => {
    setSelectedCompanyUuid((currentUuid) => {
      if (companies.some((company) => company.uuid === companyUuid)) {
        return companyUuid
      }
      return currentUuid
    })
  }, [companies])

  const value = useMemo(
    () => ({
      session,
      isLoading,
      companies,
      selectedCompanyUuid,
      selectedCompany,
      isCompanyLoading,
      companyError,
      refreshSession,
      login,
      updateUser,
      changePassword,
      selectCompany,
      logout,
    }),
    [
      changePassword,
      companies,
      companyError,
      isCompanyLoading,
      isLoading,
      login,
      logout,
      refreshSession,
      selectCompany,
      selectedCompany,
      selectedCompanyUuid,
      session,
      updateUser,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
