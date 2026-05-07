import { useMemo, useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from './AuthProvider'
import styles from './LoginPage.module.css'

type LoginLocationState = {
  redirectTo?: string
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : '로그인 처리 중 오류가 발생했습니다.'
}

function getRedirectTo(queryRedirect: string | null, state: LoginLocationState | null) {
  const redirectTo = queryRedirect || state?.redirectTo
  if (!redirectTo || redirectTo.startsWith('/login')) return '/dashboard/self'
  return redirectTo
}

export function LoginPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { session, login } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const redirectTo = useMemo(
    () => getRedirectTo(searchParams.get('redirect'), location.state as LoginLocationState | null),
    [location.state, searchParams],
  )

  if (session) {
    return <Navigate to={redirectTo} replace />
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setErrorMessage(null)
    setIsSubmitting(true)

    try {
      await login({ username, password })
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
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="아이디"
              autoComplete="username"
            />
          </label>

          <label className={styles.field}>
            <span>비밀번호</span>
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="비밀번호"
              type="password"
              autoComplete="current-password"
            />
          </label>

          {errorMessage ? <p className={styles.errorMessage}>{errorMessage}</p> : null}

          <button className={styles.submitButton} type="submit" disabled={isSubmitting}>
            {isSubmitting ? '확인 중' : '로그인'}
          </button>
        </form>

        <div className={styles.environmentRow}>
          <span>Mock 인증</span>
          <strong>활성</strong>
        </div>
      </div>
    </section>
  )
}
