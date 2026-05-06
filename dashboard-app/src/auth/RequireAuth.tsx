import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from './AuthProvider'
import styles from './authGate.module.css'

export function RequireAuth() {
  const location = useLocation()
  const { session, isLoading } = useAuth()

  if (isLoading) {
    return <div className={styles.authFallback}>세션 확인 중</div>
  }

  if (!session) {
    const redirectTo = `${location.pathname}${location.search}${location.hash}`
    return <Navigate to="/login" replace state={{ redirectTo }} />
  }

  return <Outlet />
}
