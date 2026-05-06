import { Suspense, lazy } from 'react'
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { DashboardLayout } from './dashboard/DashboardLayout'
import styles from './app.module.css'

const SelfPage = lazy(() => import('./dashboard/pages/SelfPage').then((module) => ({ default: module.SelfPage })))
const CompetitorPage = lazy(() =>
  import('./dashboard/pages/CompetitorPage').then((module) => ({ default: module.CompetitorPage })),
)
const SnapshotConfirmPage = lazy(() =>
  import('./dashboard/pages/SnapshotConfirmPage').then((module) => ({ default: module.SnapshotConfirmPage })),
)

function AppRoutes() {
  return (
    <div className={styles.app}>
      <main className={`${styles.main} ${styles.mainShell}`.trim()}>
        <Suspense fallback={null}>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard/self" replace />} />
            <Route path="/v2/*" element={<Navigate to="/dashboard/self" replace />} />
            <Route path="/dashboard" element={<DashboardLayout />}>
              <Route index element={<Navigate to="self" replace />} />
              <Route path="self" element={<SelfPage />} />
              <Route path="competitor" element={<CompetitorPage />} />
              <Route path="snapshot-confirm" element={<SnapshotConfirmPage />} />
              <Route path="snapshot-confirm/:stashUuid" element={<Navigate to="/dashboard/snapshot-confirm" replace />} />
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
    <HashRouter>
      <AppRoutes />
    </HashRouter>
  )
}

export default App
