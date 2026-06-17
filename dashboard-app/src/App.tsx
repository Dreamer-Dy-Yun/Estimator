import { Suspense, lazy, useEffect, useRef, useState } from 'react'
import { BrowserRouter, HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { getApiErrorDisplayMessage, getDashboardRuntimeConfig, type DashboardRuntimeConfig } from './api'
import { AuthProvider } from './auth/AuthProvider'
import { useAuth } from './auth/AuthContext'
import { AppToastProvider } from './components/AppToast'
import { useAppToast } from './components/AppToastContext'
import { RequireAdmin } from './auth/RequireAdmin'
import { RequireAuth } from './auth/RequireAuth'
import { DashboardLayout } from './dashboard/DashboardLayout'
import { InjectedDashboardDisplayPolicy } from './dashboard/policy/DashboardDisplayPolicy'
import type { DashboardDisplayPolicy } from './dashboard/policy/DashboardDisplayPolicy'
import { DashboardDisplayPolicyProvider } from './dashboard/policy/DashboardDisplayPolicyProvider'
import type { SnapshotConfirmPageProps } from './dashboard/pages/SnapshotConfirmPage'
import styles from './app.module.css'

const AdminPage: React.LazyExoticComponent<() => React.JSX.Element> = lazy(() : Promise<{ default: never; } | { default: () => React.JSX.Element; }> => import('./admin/AdminPage').then((module: typeof import("./admin/AdminPage")) : { default: () => React.JSX.Element; } => ({ default: module.AdminPage })))
const LoginPage: React.LazyExoticComponent<() => React.JSX.Element> = lazy(() : Promise<{ default: never; } | { default: () => React.JSX.Element; }> => import('./auth/LoginPage').then((module: typeof import("./auth/LoginPage")) : { default: () => React.JSX.Element; } => ({ default: module.LoginPage })))
const SelfPage: React.LazyExoticComponent<() => React.JSX.Element> = lazy(() : Promise<{ default: never; } | { default: () => React.JSX.Element; }> => import('./dashboard/pages/SelfPage').then((module: typeof import("./dashboard/pages/SelfPage")) : { default: () => React.JSX.Element; } => ({ default: module.SelfPage })))
const CompetitorPage: React.LazyExoticComponent<() => React.JSX.Element> = lazy(() : Promise<{ default: never; } | { default: () => React.JSX.Element; }> =>
  import('./dashboard/pages/CompetitorPage').then((module: typeof import("./dashboard/pages/CompetitorPage")) : { default: () => React.JSX.Element; } => ({ default: module.CompetitorPage })),
)
const SnapshotConfirmPage: React.LazyExoticComponent<(props: SnapshotConfirmPageProps) => React.JSX.Element> = lazy(() : Promise<{ default: never; } | { default: (props: SnapshotConfirmPageProps) => React.JSX.Element; }> =>
  import('./dashboard/pages/SnapshotConfirmPage').then((module: typeof import("./dashboard/pages/SnapshotConfirmPage")) : { default: (props: SnapshotConfirmPageProps) => React.JSX.Element; } => ({ default: module.SnapshotConfirmPage })),
)

const routerMode: 'hash' | 'browser' = import.meta.env.VITE_ROUTER_MODE === 'hash' ? 'hash' : 'browser'
const browserRouterBasename: string = (import.meta.env.VITE_ROUTER_BASENAME ?? import.meta.env.BASE_URL).replace(/\/$/, '') || '/'
const dashboardScatterPointRadiusScale = 0.6 as const
const dashboardDisplayPolicy: DashboardDisplayPolicy = new InjectedDashboardDisplayPolicy({
  scatterPointRadius: {
    cellSizeRatio: 0.405 * dashboardScatterPointRadiusScale,
    minRadius: 3.8 * dashboardScatterPointRadiusScale,
    maxRadius: 13.5 * dashboardScatterPointRadiusScale,
  },
})
type DashboardRuntimeConfigState =
  | { userUuid: null; status: 'idle'; config: null }
  | { userUuid: string; status: 'loaded'; config: DashboardRuntimeConfig }
  | { userUuid: string; status: 'failed'; config: null }
const INITIAL_DASHBOARD_RUNTIME_CONFIG_STATE: DashboardRuntimeConfigState = { userUuid: null, status: 'idle', config: null }

function AppRouter({ children }: { children: React.ReactNode }) : React.JSX.Element {
  if (routerMode === 'hash') {
    return <HashRouter>{children}</HashRouter>
  }

  return <BrowserRouter basename={browserRouterBasename}>{children}</BrowserRouter>
}

function AppRoutes() : React.JSX.Element {
  const { session }: ReturnType<typeof useAuth> = useAuth()
  const { showToast }: ReturnType<typeof useAppToast> = useAppToast()
  const runtimeConfigUserUuid: string | null = session?.user.uuid ?? null
  const runtimeConfigRequestUserUuidRef: React.RefObject<string | null> = useRef<string | null>(null)
  const [dashboardRuntimeConfigState, setDashboardRuntimeConfigState]: [DashboardRuntimeConfigState, React.Dispatch<React.SetStateAction<DashboardRuntimeConfigState>>] = useState<DashboardRuntimeConfigState>(INITIAL_DASHBOARD_RUNTIME_CONFIG_STATE)

  useEffect(() : (() => void) | void => {
    if (runtimeConfigUserUuid == null) {
      runtimeConfigRequestUserUuidRef.current = null
      return
    }
    if (runtimeConfigRequestUserUuidRef.current === runtimeConfigUserUuid) return

    let alive: boolean = true
    runtimeConfigRequestUserUuidRef.current = runtimeConfigUserUuid
    getDashboardRuntimeConfig()
      .then((nextConfig: DashboardRuntimeConfig) : void => {
        if (alive) setDashboardRuntimeConfigState({ userUuid: runtimeConfigUserUuid, status: 'loaded', config: nextConfig })
      })
      .catch((error: unknown) : void => {
        if (!alive) return
        setDashboardRuntimeConfigState({ userUuid: runtimeConfigUserUuid, status: 'failed', config: null })
        showToast(getApiErrorDisplayMessage(error, '대시보드 전역 설정을 불러오지 못했습니다.'), { variant: 'error' })
      })

    return () : void => {
      alive = false
    }
  }, [runtimeConfigUserUuid, showToast])
  const dashboardRuntimeConfig: DashboardRuntimeConfig | null = dashboardRuntimeConfigState.userUuid === runtimeConfigUserUuid && dashboardRuntimeConfigState.status === 'loaded'
    ? dashboardRuntimeConfigState.config
    : null
  const dashboardRuntimeConfigLoading: boolean = runtimeConfigUserUuid != null && dashboardRuntimeConfigState.userUuid !== runtimeConfigUserUuid

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
                <Route path="snapshot-confirm" element={<SnapshotConfirmPage dashboardRuntimeConfig={dashboardRuntimeConfig} dashboardRuntimeConfigLoading={dashboardRuntimeConfigLoading} />} />
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
