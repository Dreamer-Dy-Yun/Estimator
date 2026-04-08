import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { TopTabs } from './components/common/TopTabs'
import { CompetitorPage } from './pages/competitor-analysis/CompetitorPage'
import { OrderSimulationPage } from './pages/order-simulation/OrderSimulationPage'
import { SelfSalesPage } from './pages/self-analysis/SelfSalesPage'
import { V2DashboardLayout } from './v2/V2DashboardLayout'
import { V2CompetitorPage } from './v2/pages/V2CompetitorPage'
import { V2OrderPage } from './v2/pages/V2OrderPage'
import { V2SelfPage } from './v2/pages/V2SelfPage'
import styles from './App.module.css'

function AppRoutes() {
  const location = useLocation()
  const isV2 = location.pathname.startsWith('/v2')

  return (
    <div className={styles.app}>
      {!isV2 && <TopTabs />}
      <main className={styles.main}>
        <Routes>
          <Route path="/" element={<Navigate to="/self" replace />} />
          <Route path="/self" element={<SelfSalesPage />} />
          <Route path="/competitor" element={<CompetitorPage />} />
          <Route path="/order-sim" element={<OrderSimulationPage />} />

          <Route path="/v2" element={<Navigate to="/v2/self" replace />} />
          <Route path="/v2" element={<V2DashboardLayout />}>
            <Route path="self" element={<V2SelfPage />} />
            <Route path="competitor" element={<V2CompetitorPage />} />
            <Route path="order-sim" element={<V2OrderPage />} />
          </Route>
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
