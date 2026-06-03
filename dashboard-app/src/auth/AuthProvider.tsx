import type { LoginResult } from '../api'
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
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

const AUTH_SESSION_ERROR_STORAGE_KEY = 'han-a.auth.session-error-message' as const
const DEFAULT_COMPANY_ERROR_MESSAGE = 'Failed to load companies.' as const

function getDefaultCompanyUuid(companies: CompanySummary[]) : string {
  return companies.find((company: CompanySummary) : string | undefined => getCompanyUuidForOptionalScope(company.uuid))?.uuid
    ?? companies[0]?.uuid
    ?? null
}
const DEFAULT_SESSION_ERROR_MESSAGE = '세션 확인 중 오류가 발생했습니다.' as const

function getSessionStorage() : Storage | null {
  if (typeof window === 'undefined') return null
  try {
    return window.sessionStorage
  } catch {
    return null
  }
}

function clearSessionCheckErrorMessage() : void {
  getSessionStorage()?.removeItem(AUTH_SESSION_ERROR_STORAGE_KEY)
}

function persistSessionCheckErrorMessage(error: unknown) : void {
  const storage: Storage | null = getSessionStorage()
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

export function AuthProvider({ children }: { children: React.ReactNode }) : React.JSX.Element {
  const [session, setSession]: [AuthSession | null, React.Dispatch<React.SetStateAction<AuthSession | null>>] = useState<AuthSession | null>(null)
  const [isLoading, setIsLoading]: [boolean, React.Dispatch<React.SetStateAction<boolean>>] = useState(true)
  const [companies, setCompanies]: [CompanySummary[], React.Dispatch<React.SetStateAction<CompanySummary[]>>] = useState<CompanySummary[]>([])
  const [selectedCompanyUuid, setSelectedCompanyUuid]: [string | null, React.Dispatch<React.SetStateAction<string | null>>] = useState<string | null>(null)
  const [isCompanyLoading, setIsCompanyLoading]: [boolean, React.Dispatch<React.SetStateAction<boolean>>] = useState(false)
  const [companyError, setCompanyError]: [string | null, React.Dispatch<React.SetStateAction<string | null>>] = useState<string | null>(null)
  const companyRequestSeq: React.RefObject<number> = useRef(0)

  const applyCompanies: (nextCompanies: CompanySummary[]) => void = useCallback((nextCompanies: CompanySummary[]) : void => {
    setCompanies(nextCompanies)
    setSelectedCompanyUuid((currentUuid: string | null) : string => {
      if (currentUuid && nextCompanies.some((company: CompanySummary) : boolean => company.uuid === currentUuid)) {
        return currentUuid
      }
      return getDefaultCompanyUuid(nextCompanies)
    })
  }, [])

  const resetCompanyState: () => void = useCallback(() : void => {
    companyRequestSeq.current += 1
    setCompanies([])
    setSelectedCompanyUuid(null)
    setIsCompanyLoading(false)
    setCompanyError(null)
  }, [])

  const loadCompanies: () => Promise<CompanySummary[]> = useCallback(async () : Promise<CompanySummary[]> => {
    const requestSeq: number = companyRequestSeq.current + 1
    companyRequestSeq.current = requestSeq
    setIsCompanyLoading(true)
    setCompanyError(null)

    try {
      const nextCompanies: CompanySummary[] = await getCompanies()
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

  useEffect(() : () => void => {
    let alive: boolean = true
    getCurrentAuthSession()
      .then(async (nextSession: AuthSession | null) : Promise<void> => {
        if (!alive) return
        setSession(nextSession)
        clearSessionCheckErrorMessage()
        if (!nextSession) {
          resetCompanyState()
          return
        }
        await loadCompanies()
      })
      .catch((error: unknown) : void => {
        if (alive) {
          setSession(null)
          resetCompanyState()
          persistSessionCheckErrorMessage(error)
        }
      })
      .finally(() : void => {
        if (alive) setIsLoading(false)
      })

    return () : void => {
      alive = false
      companyRequestSeq.current += 1
    }
  }, [loadCompanies, resetCompanyState])

  const refreshSession: () => Promise<AuthSession | null> = useCallback(async () : Promise<AuthSession | null> => {
    const nextSession: AuthSession | null = await getCurrentAuthSession()
    setSession(nextSession)
    if (nextSession) {
      await loadCompanies()
    } else {
      resetCompanyState()
    }
    return nextSession
  }, [loadCompanies, resetCompanyState])

  const login: (payload: LoginRequest) => Promise<AuthSession> = useCallback(async (payload: LoginRequest) : Promise<AuthSession> => {
    const result: LoginResult = await requestLogin(payload)
    setSession(result.session)
    await loadCompanies()
    return result.session
  }, [loadCompanies])

  const logout: () => Promise<void> = useCallback(async () : Promise<void> => {
    await requestLogout()
    setSession(null)
    resetCompanyState()
  }, [resetCompanyState])

  const updateUser: (payload: UpdateAuthUserPayload) => Promise<AuthSession> = useCallback(async (payload: UpdateAuthUserPayload) : Promise<AuthSession> => {
    const nextSession: AuthSession = await updateCurrentUser(payload)
    setSession(nextSession)
    return nextSession
  }, [])

  const changePassword: (payload: ChangePasswordPayload) => Promise<void> = useCallback(async (payload: ChangePasswordPayload) : Promise<void> => {
    await changeCurrentUserPassword(payload)
  }, [])

  const selectedCompany: CompanySummary | null = useMemo(
    () : CompanySummary | null => companies.find((company: CompanySummary) : boolean => company.uuid === selectedCompanyUuid) ?? null,
    [companies, selectedCompanyUuid],
  )

  const selectCompany: (companyUuid: string) => void = useCallback((companyUuid: string) : void => {
    setSelectedCompanyUuid((currentUuid: string | null) : string | null => {
      if (companies.some((company: CompanySummary) : boolean => company.uuid === companyUuid)) {
        return companyUuid
      }
      return currentUuid
    })
  }, [companies])

  const value: { session: AuthSession | null; isLoading: boolean; companies: CompanySummary[]; selectedCompanyUuid: string | null; selectedCompany: CompanySummary | null; isCompanyLoading: boolean; companyError: string | null; refreshSession: () => Promise<AuthSession | null>; login: (payload: LoginRequest) => Promise<AuthSession>; updateUser: (payload: UpdateAuthUserPayload) => Promise<AuthSession>; changePassword: (payload: ChangePasswordPayload) => Promise<void>; selectCompany: (companyUuid: string) => void; logout: () => Promise<void>; } = useMemo(
    () : { session: AuthSession | null; isLoading: boolean; companies: CompanySummary[]; selectedCompanyUuid: string | null; selectedCompany: CompanySummary | null; isCompanyLoading: boolean; companyError: string | null; refreshSession: () => Promise<AuthSession | null>; login: (payload: LoginRequest) => Promise<AuthSession>; updateUser: (payload: UpdateAuthUserPayload) => Promise<AuthSession>; changePassword: (payload: ChangePasswordPayload) => Promise<void>; selectCompany: (companyUuid: string) => void; logout: () => Promise<void>; } => ({
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
