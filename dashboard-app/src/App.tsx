import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { DashboardLayout } from './dashboard/DashboardLayout'
import { CompetitorPage } from './dashboard/pages/CompetitorPage'
import { OrderPage } from './dashboard/pages/OrderPage'
import { SelfPage } from './dashboard/pages/SelfPage'
import styles from './app.module.css'

function AppRoutes() {
  return (
    <div className={styles.app}>
      <main className={`${styles.main} ${styles.mainShell}`.trim()}>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard/self" replace />} />
          <Route path="/v2/*" element={<Navigate to="/dashboard/self" replace />} />
          <Route path="/dashboard" element={<DashboardLayout />}>
            <Route index element={<Navigate to="self" replace />} />
            <Route path="self" element={<SelfPage />} />
            <Route path="competitor" element={<CompetitorPage />} />
            <Route path="order-sim" element={<OrderPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/dashboard/self" replace />} />
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
