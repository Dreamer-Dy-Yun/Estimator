import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { V2DashboardLayout } from './v2/V2DashboardLayout'
import { V2CompetitorPage } from './v2/pages/V2CompetitorPage'
import { V2OrderPage } from './v2/pages/V2OrderPage'
import { V2SelfPage } from './v2/pages/V2SelfPage'
import styles from './app.module.css'

function AppRoutes() {
  return (
    <div className={styles.app}>
      <main className={`${styles.main} ${styles.mainV2}`.trim()}>
        <Routes>
          <Route path="/" element={<Navigate to="/v2/self" replace />} />
          <Route path="/v2" element={<V2DashboardLayout />}>
            <Route index element={<Navigate to="self" replace />} />
            <Route path="self" element={<V2SelfPage />} />
            <Route path="competitor" element={<V2CompetitorPage />} />
            <Route path="order-sim" element={<V2OrderPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/v2/self" replace />} />
        </Routes>
      </main>
    </div>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  )
}

export default App
