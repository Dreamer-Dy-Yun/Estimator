import { Suspense, lazy, type ReactNode } from 'react'
import { BrowserRouter, HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './auth/AuthProvider'
import { RequireAdmin } from './auth/RequireAdmin'
import { RequireAuth } from './auth/RequireAuth'
import { DashboardLayout } from './dashboard/DashboardLayout'
import styles from './app.module.css'

const AdminUsersPage = lazy(() => import('./admin/AdminUsersPage').then((module) => ({ default: module.AdminUsersPage })))
const LoginPage = lazy(() => import('./auth/LoginPage').then((module) => ({ default: module.LoginPage })))
const SelfPage = lazy(() => import('./dashboard/pages/SelfPage').then((module) => ({ default: module.SelfPage })))
const CompetitorPage = lazy(() =>
  import('./dashboard/pages/CompetitorPage').then((module) => ({ default: module.CompetitorPage })),
)
const SnapshotConfirmPage = lazy(() =>
  import('./dashboard/pages/SnapshotConfirmPage').then((module) => ({ default: module.SnapshotConfirmPage })),
)

const routerMode = import.meta.env.VITE_ROUTER_MODE === 'hash' ? 'hash' : 'browser'
const browserRouterBasename = (import.meta.env.VITE_ROUTER_BASENAME ?? import.meta.env.BASE_URL).replace(/\/$/, '') || '/'

function AppRouter({ children }: { children: ReactNode }) {
  if (routerMode === 'hash') {
    return <HashRouter>{children}</HashRouter>
  }

  return <BrowserRouter basename={browserRouterBasename}>{children}</BrowserRouter>
}

function AppRoutes() {
  return (
    <div className={styles.app}>
      <main className={`${styles.main} ${styles.mainShell}`.trim()}>
        <Suspense fallback={null}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route element={<RequireAuth />}>
              <Route path="/" element={<Navigate to="/dashboard/self" replace />} />
              <Route path="/v2/*" element={<Navigate to="/dashboard/self" replace />} />
              <Route path="/dashboard" element={<DashboardLayout />}>
                <Route index element={<Navigate to="self" replace />} />
                <Route path="self" element={<SelfPage />} />
                <Route path="competitor" element={<CompetitorPage />} />
                <Route path="snapshot-confirm" element={<SnapshotConfirmPage />} />
                <Route path="snapshot-confirm/:stashUuid" element={<Navigate to="/dashboard/snapshot-confirm" replace />} />
              </Route>
              <Route element={<RequireAdmin />}>
                <Route element={<DashboardLayout />}>
                  <Route path="/admin" element={<AdminUsersPage />} />
                </Route>
              </Route>
            </Route>
            <Route path="*" element={<Navigate to="/dashboard/self" replace />} />
          </Routes>
        </Suspense>
      </main>
    </div>
  )
}

function App() {
  return (
    <AppRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </AppRouter>
  )
}

export default App
