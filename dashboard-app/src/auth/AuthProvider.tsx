import type { LoginResult } from '../api'
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import {
  ALL_COMPANY_UUID,
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
const ALL_COMPANY_OPTION: CompanySummary = {
  uuid: ALL_COMPANY_UUID,
  name: '\uC804\uCCB4',
} as const

function getDisplayCompanies(apiCompanies: CompanySummary[]) : CompanySummary[] {
  const realCompanies: CompanySummary[] = apiCompanies.filter((company: CompanySummary) : boolean => company.uuid !== ALL_COMPANY_UUID)
  return [ALL_COMPANY_OPTION, ...realCompanies]
}

function getDefaultCompanyUuid(companies: CompanySummary[]) : string | null {
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
  const authRequestSeq: React.RefObject<number> = useRef(0)

  const beginAuthRequest: () => number = useCallback(() : number => {
    const requestSeq: number = authRequestSeq.current + 1
    authRequestSeq.current = requestSeq
    return requestSeq
  }, [])

  const isCurrentAuthRequest: (requestSeq: number) => boolean = useCallback((requestSeq: number) : boolean => authRequestSeq.current === requestSeq, [])

  const applyCompanies: (nextCompanies: CompanySummary[]) => CompanySummary[] = useCallback((nextCompanies: CompanySummary[]) : CompanySummary[] => {
    const displayCompanies: CompanySummary[] = getDisplayCompanies(nextCompanies)
    setCompanies(displayCompanies)
    setSelectedCompanyUuid((currentUuid: string | null) : string | null => {
      if (currentUuid && displayCompanies.some((company: CompanySummary) : boolean => company.uuid === currentUuid)) {
        return currentUuid
      }
      return getDefaultCompanyUuid(displayCompanies)
    })
    return displayCompanies
  }, [])

  const resetCompanyState: () => void = useCallback(() : void => {
    companyRequestSeq.current += 1
    setCompanies([])
    setSelectedCompanyUuid(null)
    setIsCompanyLoading(false)
    setCompanyError(null)
  }, [])

  const loadCompanies: (authSeq?: number) => Promise<CompanySummary[]> = useCallback(async (authSeq?: number) : Promise<CompanySummary[]> => {
    const requestSeq: number = companyRequestSeq.current + 1
    companyRequestSeq.current = requestSeq
    const canSetCompanyLoading: () => boolean = () : boolean => companyRequestSeq.current === requestSeq
    const canApplyCompanyResponse: () => boolean = () : boolean =>
      canSetCompanyLoading() && (authSeq === undefined || authRequestSeq.current === authSeq)
    setIsCompanyLoading(true)
    setCompanyError(null)

    try {
      const nextCompanies: CompanySummary[] = await getCompanies()
      if (canApplyCompanyResponse()) {
        applyCompanies(nextCompanies)
      }
      return nextCompanies
    } catch (error) {
      if (canApplyCompanyResponse()) {
        setCompanies([])
        setSelectedCompanyUuid(null)
        setCompanyError(getApiErrorDisplayMessage(error, DEFAULT_COMPANY_ERROR_MESSAGE))
      }
      return []
    } finally {
      if (canSetCompanyLoading()) {
        setIsCompanyLoading(false)
      }
    }
  }, [applyCompanies])

  useEffect(() : () => void => {
    let alive: boolean = true
    const requestSeq: number = beginAuthRequest()
    getCurrentAuthSession()
      .then(async (nextSession: AuthSession | null) : Promise<void> => {
        if (!alive || !isCurrentAuthRequest(requestSeq)) return
        setSession(nextSession)
        clearSessionCheckErrorMessage()
        if (!nextSession) {
          resetCompanyState()
          return
        }
        await loadCompanies(requestSeq)
      })
      .catch((error: unknown) : void => {
        if (alive && isCurrentAuthRequest(requestSeq)) {
          setSession(null)
          resetCompanyState()
          persistSessionCheckErrorMessage(error)
        }
      })
      .finally(() : void => {
        if (alive && isCurrentAuthRequest(requestSeq)) setIsLoading(false)
      })

    return () : void => {
      alive = false
      authRequestSeq.current += 1
      companyRequestSeq.current += 1
    }
  }, [beginAuthRequest, isCurrentAuthRequest, loadCompanies, resetCompanyState])

  const refreshSession: () => Promise<AuthSession | null> = useCallback(async () : Promise<AuthSession | null> => {
    const requestSeq: number = beginAuthRequest()
    try {
      const nextSession: AuthSession | null = await getCurrentAuthSession()
      if (!isCurrentAuthRequest(requestSeq)) return nextSession
      setSession(nextSession)
      if (nextSession) {
        await loadCompanies(requestSeq)
      } else {
        resetCompanyState()
      }
      return nextSession
    } finally {
      if (isCurrentAuthRequest(requestSeq)) setIsLoading(false)
    }
  }, [beginAuthRequest, isCurrentAuthRequest, loadCompanies, resetCompanyState])

  const login: (payload: LoginRequest) => Promise<AuthSession> = useCallback(async (payload: LoginRequest) : Promise<AuthSession> => {
    const requestSeq: number = beginAuthRequest()
    try {
      const result: LoginResult = await requestLogin(payload)
      if (!isCurrentAuthRequest(requestSeq)) return result.session
      setSession(result.session)
      await loadCompanies(requestSeq)
      return result.session
    } finally {
      if (isCurrentAuthRequest(requestSeq)) setIsLoading(false)
    }
  }, [beginAuthRequest, isCurrentAuthRequest, loadCompanies])

  const logout: () => Promise<void> = useCallback(async () : Promise<void> => {
    const requestSeq: number = beginAuthRequest()
    try {
      await requestLogout()
      if (!isCurrentAuthRequest(requestSeq)) return
      setSession(null)
      resetCompanyState()
    } finally {
      if (isCurrentAuthRequest(requestSeq)) setIsLoading(false)
    }
  }, [beginAuthRequest, isCurrentAuthRequest, resetCompanyState])

  const updateUser: (payload: UpdateAuthUserPayload) => Promise<AuthSession> = useCallback(async (payload: UpdateAuthUserPayload) : Promise<AuthSession> => {
    const requestSeq: number = beginAuthRequest()
    const nextSession: AuthSession = await updateCurrentUser(payload)
    if (isCurrentAuthRequest(requestSeq)) setSession(nextSession)
    return nextSession
  }, [beginAuthRequest, isCurrentAuthRequest])

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
