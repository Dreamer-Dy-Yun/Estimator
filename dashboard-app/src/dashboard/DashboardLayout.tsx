import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { USE_MOCK_API, isAllCompanyUuid } from '../api'
import { useAuth } from '../auth/AuthContext'
import { UserProfileDialog } from '../auth/UserProfileDialog'
import { CompanySelector } from './CompanySelector'
import { InventoryArrivalCollectButton } from './InventoryArrivalCollectButton'
import styles from './layout.module.css'

const tabs = [
  { to: '/dashboard/self', label: '자사 분석' },
  { to: '/dashboard/competitor', label: '경쟁사 분석' },
  { to: '/dashboard/snapshot-confirm', label: '오더 후보군' },
]

const roleLabels = {
  admin: '관리자',
  user: '사용자',
} as const

const snapshotConfirmDisabledReasonId = 'snapshot-confirm-disabled-reason'
const snapshotConfirmDisabledReason = '전체 선택 상태에서는 오더 후보군을 사용할 수 없습니다. 회사를 선택하세요.'

export const DashboardLayout = () => {
  const navigate = useNavigate()
  const { session, logout, selectedCompanyUuid } = useAuth()
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const isAllCompanySelected = isAllCompanyUuid(selectedCompanyUuid)

  const handleLogout = () => {
    void logout().then(() => navigate('/login', { replace: true }))
  }

  return (
    <section className={styles.shell}>
      <div className={styles.frame}>
        <div className={styles.nav}>
          <div className={styles.tabList}>
            {tabs.map((tab) => {
              if (tab.to === '/dashboard/snapshot-confirm' && isAllCompanySelected) {
                return (
                  <button
                    key={tab.to}
                    type="button"
                    className={`${styles.tab} ${styles.disabledTab}`}
                    aria-disabled="true"
                    aria-describedby={snapshotConfirmDisabledReasonId}
                    onClick={(event) => {
                      event.preventDefault()
                      event.stopPropagation()
                    }}
                    onKeyDown={(event) => {
                      if (event.key !== 'Enter' && event.key !== ' ') return
                      event.preventDefault()
                      event.stopPropagation()
                    }}
                  >
                    {tab.label}
                    <span id={snapshotConfirmDisabledReasonId} className={styles.srOnly}>
                      {snapshotConfirmDisabledReason}
                    </span>
                  </button>
                )
              }

              return (
                <NavLink key={tab.to} to={tab.to} className={({ isActive }) => `${styles.tab} ${isActive ? styles.active : ''}`}>
                  {tab.label}
                </NavLink>
              )
            })}
            {session?.user.role === 'admin' ? (
              <NavLink
                to="/admin"
                className={({ isActive }) =>
                  `${styles.tab} ${styles.adminTab} ${isActive ? `${styles.active} ${styles.adminActive}` : ''}`
                }
              >
                관리자
              </NavLink>
            ) : null}
          </div>
          <CompanySelector />
          {USE_MOCK_API ? (
            <div className={styles.mockModeBadge} role="status" aria-live="polite">
              Mock Mode
            </div>
          ) : null}
          <div className={styles.sessionControls}>
            <InventoryArrivalCollectButton />
            <button className={styles.userButton} type="button" onClick={() => setIsProfileOpen(true)}>
              <span className={styles.userName}>{session?.user.loginId ?? '사용자'}</span>
              <span className={styles.roleBadge}>{session ? roleLabels[session.user.role] : '사용자'}</span>
            </button>
            <button className={styles.logoutButton} type="button" onClick={handleLogout}>
              로그아웃
            </button>
          </div>
        </div>
        <div className={styles.content}>
          <div className={styles.pageContent}>
            <Outlet />
          </div>
        </div>
      </div>
      <UserProfileDialog open={isProfileOpen} onClose={() => setIsProfileOpen(false)} />
    </section>
  )
}
