import { NavLink, Outlet } from 'react-router-dom'
import { PageHeader } from './components/PageHeader'
import styles from './layout.module.css'

const tabs = [
  { to: '/dashboard/self', label: '자사 분석' },
  { to: '/dashboard/competitor', label: '경쟁사 분석' },
  { to: '/dashboard/snapshot-confirm', label: '오더 후보군' },
]

export const DashboardLayout = () => {
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
          <PageHeader title="" badge="" />
          <div className={styles.pageContent}>
            <Outlet />
          </div>
        </div>
      </div>
    </section>
  )
}
