import { NavLink, Outlet } from 'react-router-dom'
import styles from './v2-layout.module.css'

const tabs = [
  { to: '/v2/self', label: '자사 분석' },
  { to: '/v2/competitor', label: '경쟁사 분석' },
  { to: '/v2/order-sim', label: '오더 시뮬레이션' },
]

export const V2DashboardLayout = () => {
  return (
    <section className={styles.shell}>
      <div className={styles.frame}>
        <div className={styles.nav}>
          {tabs.map((tab) => (
            <NavLink key={tab.to} to={tab.to} className={({ isActive }) => `${styles.tab} ${isActive ? styles.active : ''}`}>
              {tab.label}
            </NavLink>
          ))}
        </div>
        <div className={styles.content}>
          <Outlet />
        </div>
      </div>
    </section>
  )
}
