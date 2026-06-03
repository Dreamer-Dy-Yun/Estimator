import { Suspense, lazy } from 'react'
import { BrowserRouter, HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './auth/AuthProvider'
import { AppToastProvider } from './components/AppToast'
import { RequireAdmin } from './auth/RequireAdmin'
import { RequireAuth } from './auth/RequireAuth'
import { DashboardLayout } from './dashboard/DashboardLayout'
import { InjectedDashboardDisplayPolicy } from './dashboard/policy/DashboardDisplayPolicy'
import type { DashboardDisplayPolicy } from './dashboard/policy/DashboardDisplayPolicy'
import { DashboardDisplayPolicyProvider } from './dashboard/policy/DashboardDisplayPolicyProvider'
import styles from './app.module.css'

const AdminPage: React.LazyExoticComponent<() => React.JSX.Element> = lazy(() : Promise<{ default: never; } | { default: () => React.JSX.Element; }> => import('./admin/AdminPage').then((module: typeof import("./admin/AdminPage")) : { default: () => React.JSX.Element; } => ({ default: module.AdminPage })))
const LoginPage: React.LazyExoticComponent<() => React.JSX.Element> = lazy(() : Promise<{ default: never; } | { default: () => React.JSX.Element; }> => import('./auth/LoginPage').then((module: typeof import("./auth/LoginPage")) : { default: () => React.JSX.Element; } => ({ default: module.LoginPage })))
const SelfPage: React.LazyExoticComponent<() => React.JSX.Element> = lazy(() : Promise<{ default: never; } | { default: () => React.JSX.Element; }> => import('./dashboard/pages/SelfPage').then((module: typeof import("./dashboard/pages/SelfPage")) : { default: () => React.JSX.Element; } => ({ default: module.SelfPage })))
const CompetitorPage: React.LazyExoticComponent<() => React.JSX.Element> = lazy(() : Promise<{ default: never; } | { default: () => React.JSX.Element; }> =>
  import('./dashboard/pages/CompetitorPage').then((module: typeof import("./dashboard/pages/CompetitorPage")) : { default: () => React.JSX.Element; } => ({ default: module.CompetitorPage })),
)
const SnapshotConfirmPage: React.LazyExoticComponent<() => React.JSX.Element> = lazy(() : Promise<{ default: never; } | { default: () => React.JSX.Element; }> =>
  import('./dashboard/pages/SnapshotConfirmPage').then((module: typeof import("./dashboard/pages/SnapshotConfirmPage")) : { default: () => React.JSX.Element; } => ({ default: module.SnapshotConfirmPage })),
)

const routerMode: 'hash' | 'browser' = import.meta.env.VITE_ROUTER_MODE === 'hash' ? 'hash' : 'browser'
const browserRouterBasename: string = (import.meta.env.VITE_ROUTER_BASENAME ?? import.meta.env.BASE_URL).replace(/\/$/, '') || '/'
const dashboardScatterPointRadiusScale = 0.5 as const
const dashboardDisplayPolicy: DashboardDisplayPolicy = new InjectedDashboardDisplayPolicy({
  scatterPointRadius: {
    cellSizeRatio: 0.405 * dashboardScatterPointRadiusScale,
    minRadius: 3.8 * dashboardScatterPointRadiusScale,
    maxRadius: 13.5 * dashboardScatterPointRadiusScale,
  },
})

function AppRouter({ children }: { children: React.ReactNode }) : React.JSX.Element {
  if (routerMode === 'hash') {
    return <HashRouter>{children}</HashRouter>
  }

  return <BrowserRouter basename={browserRouterBasename}>{children}</BrowserRouter>
}

function AppRoutes() : React.JSX.Element {
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
                  <Route path="/admin" element={<AdminPage />} />
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

function App() : React.JSX.Element {
  return (
    <AppRouter>
      <AppToastProvider>
        <DashboardDisplayPolicyProvider policy={dashboardDisplayPolicy}>
          <AuthProvider>
            <AppRoutes />
          </AuthProvider>
        </DashboardDisplayPolicyProvider>
      </AppToastProvider>
    </AppRouter>
  )
}

export default App
