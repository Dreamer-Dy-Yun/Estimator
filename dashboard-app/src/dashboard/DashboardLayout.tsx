import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { PageHeader } from './components/PageHeader'
import styles from './layout.module.css'

const tabs = [
  { to: '/dashboard/self', label: '자사 분석' },
  { to: '/dashboard/competitor', label: '경쟁사 분석' },
  { to: '/dashboard/snapshot-confirm', label: '오더 후보군' },
]

export const DashboardLayout = () => {
  const navigate = useNavigate()
  const { session, logout } = useAuth()

  const handleLogout = () => {
    void logout().then(() => navigate('/login', { replace: true }))
  }

  return (
    <section className={styles.shell}>
      <div className={styles.frame}>
        <div className={styles.nav}>
          <div className={styles.tabList}>
            {tabs.map((tab) => (
              <NavLink key={tab.to} to={tab.to} className={({ isActive }) => `${styles.tab} ${isActive ? styles.active : ''}`}>
                {tab.label}
              </NavLink>
            ))}
          </div>
          <div className={styles.sessionControls}>
            <span className={styles.userName}>{session?.user.name ?? '사용자'}</span>
            <button className={styles.logoutButton} type="button" onClick={handleLogout}>
              로그아웃
            </button>
          </div>
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
