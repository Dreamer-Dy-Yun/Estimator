import { useMemo, useState } from 'react'
import { Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { API_ADAPTER_MODE, getApiErrorDisplayMessage } from '../api'
import { LoadingSpinner } from '../components/LoadingSpinner'
import { useAuth } from './AuthContext'
import styles from './LoginPage.module.css'

export type LoginLocationState = {
  redirectTo?: string
}

const DEFAULT_LOGIN_ID = 'mock-admin' as const
const DEFAULT_PASSWORD = 'admin' as const
const AUTH_SESSION_ERROR_STORAGE_KEY = 'han-a.auth.session-error-message' as const

function consumeSessionCheckErrorMessage() : string | null {
  if (typeof window === 'undefined') return null
  try {
    const message: string | null = window.sessionStorage.getItem(AUTH_SESSION_ERROR_STORAGE_KEY)
    window.sessionStorage.removeItem(AUTH_SESSION_ERROR_STORAGE_KEY)
    return message?.trim() ? message : null
  } catch {
    return null
  }
}

function getErrorMessage(error: unknown) : string {
  return getApiErrorDisplayMessage(error, '로그인 처리 중 오류가 발생했습니다.')
}

function getRedirectTo(queryRedirect: string | null, state: LoginLocationState | null) : string {
  const redirectTo: string | undefined = queryRedirect || state?.redirectTo
  if (!redirectTo || redirectTo.startsWith('/login')) return '/dashboard/self'
  return redirectTo
}

export function LoginPage() : React.JSX.Element {
  const location: ReturnType<typeof useLocation> = useLocation()
  const navigate: ReturnType<typeof useNavigate> = useNavigate()
  const [searchParams]: ReturnType<typeof useSearchParams> = useSearchParams()
  const { session, login }: ReturnType<typeof useAuth> = useAuth()
  const [loginId, setLoginId]: [string, React.Dispatch<React.SetStateAction<string>>] = useState<string>(DEFAULT_LOGIN_ID)
  const [password, setPassword]: [string, React.Dispatch<React.SetStateAction<string>>] = useState<string>(DEFAULT_PASSWORD)
  const [errorMessage, setErrorMessage]: [string | null, React.Dispatch<React.SetStateAction<string | null>>] = useState<string | null>(() : string | null => consumeSessionCheckErrorMessage())
  const [isSubmitting, setIsSubmitting]: [boolean, React.Dispatch<React.SetStateAction<boolean>>] = useState(false)
  const redirectTo: string = useMemo(
    () : string => getRedirectTo(searchParams.get('redirect'), location.state as LoginLocationState | null),
    [location.state, searchParams],
  )

  if (session) {
    return <Navigate to={redirectTo} replace />
  }

  const handleSubmit: (event: React.FormEvent<HTMLFormElement>) => Promise<void> = async (event: React.FormEvent<HTMLFormElement>) : Promise<void> => {
    event.preventDefault()
    setErrorMessage(null)
    setIsSubmitting(true)

    try {
      await login({ loginId, password })
      navigate(redirectTo, { replace: true })
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
      setIsSubmitting(false)
    }
  }

  return (
    <section className={styles.loginPage}>
      <div className={styles.loginPanel}>
        <div className={styles.brandRow}>
          <div className={styles.brandMark} aria-hidden="true">
            H
          </div>
          <div>
            <p className={styles.productName}>HAN.A Estimator</p>
            <h1 className={styles.title}>로그인</h1>
          </div>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          <label className={styles.field}>
            <span>아이디</span>
            <input
              value={loginId}
              onChange={(event: React.ChangeEvent<HTMLInputElement, HTMLInputElement>) : void => setLoginId(event.target.value)}
              placeholder={DEFAULT_LOGIN_ID}
              autoComplete="username"
            />
          </label>

          <label className={styles.field}>
            <span>비밀번호</span>
            <input
              value={password}
              onChange={(event: React.ChangeEvent<HTMLInputElement, HTMLInputElement>) : void => setPassword(event.target.value)}
              placeholder={DEFAULT_PASSWORD}
              type="password"
              autoComplete="current-password"
            />
          </label>

          {errorMessage ? <p className={styles.errorMessage}>{errorMessage}</p> : null}

          <button className={styles.submitButton} type="submit" disabled={isSubmitting}>
            {isSubmitting ? <LoadingSpinner size="inline" label="확인 중" /> : '로그인'}
          </button>
        </form>
        <div className={styles.environmentRow}>
          <span>{API_ADAPTER_MODE === 'mock' ? 'Mock API Mode' : 'HTTP API Mode'}</span>
          <strong>
            {API_ADAPTER_MODE === 'mock'
              ? 'Mock API를 사용 중입니다.'
              : 'HTTP API를 사용 중입니다.'}
          </strong>
        </div>
      </div>
    </section>
  )
}
