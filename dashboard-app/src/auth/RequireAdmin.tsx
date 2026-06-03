import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { LoadingSpinner } from '../components/LoadingSpinner'
import { useAuth } from './AuthContext'
import styles from './authGate.module.css'

export function RequireAdmin() : React.JSX.Element {
  const location: ReturnType<typeof useLocation> = useLocation()
  const { session, isLoading }: ReturnType<typeof useAuth> = useAuth()

  if (isLoading) {
    return (
      <div className={styles.authFallback}>
        <LoadingSpinner size="page" label="세션 확인 중" />
      </div>
    )
  }

  if (!session) {
    const redirectTo: string = `${location.pathname}${location.search}${location.hash}`
    return <Navigate to={`/login?redirect=${encodeURIComponent(redirectTo)}`} replace state={{ redirectTo }} />
  }

  if (session.user.role !== 'admin') {
    return <Navigate to="/dashboard/self" replace />
  }

  return <Outlet />
}
