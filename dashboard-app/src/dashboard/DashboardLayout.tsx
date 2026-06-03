import { useState } from 'react'
import { NavLink, Outlet, useNavigate, type NavLinkRenderProps } from 'react-router-dom'
import { USE_MOCK_API, isAllCompanyUuid } from '../api'
import { useAuth } from '../auth/AuthContext'
import { UserProfileDialog } from '../auth/UserProfileDialog'
import { CompanySelector } from './CompanySelector'
import { InventoryArrivalCollectButton } from './InventoryArrivalCollectButton'
import styles from './layout.module.css'

const tabs: { to: string; label: string; }[] = [
  { to: '/dashboard/self', label: '자사 분석' },
  { to: '/dashboard/competitor', label: '경쟁사 분석' },
  { to: '/dashboard/snapshot-confirm', label: '오더 후보군' },
]

const roleLabels: { readonly admin: '관리자'; readonly user: '사용자'; } = {
  admin: '관리자',
  user: '사용자',
} as const

const snapshotConfirmDisabledReasonId = 'snapshot-confirm-disabled-reason' as const
const snapshotConfirmDisabledReason = '전체 선택 상태에서는 오더 후보군을 사용할 수 없습니다. 회사를 선택하세요.' as const
const inventoryArrivalCollectDisabledReason =
  '전체 선택 상태에서는 입고예정일 수집을 사용할 수 없습니다. 회사를 선택하세요.' as const

export const DashboardLayout: () => React.JSX.Element = () : React.JSX.Element => {
  const navigate: ReturnType<typeof useNavigate> = useNavigate()
  const { session, logout, selectedCompanyUuid }: ReturnType<typeof useAuth> = useAuth()
  const [isProfileOpen, setIsProfileOpen]: [boolean, React.Dispatch<React.SetStateAction<boolean>>] = useState(false)
  const isAllCompanySelected: boolean = isAllCompanyUuid(selectedCompanyUuid)
  const inventoryArrivalCompanyUuid: string | null = isAllCompanySelected ? null : selectedCompanyUuid

  const handleLogout: () => void = () : void => {
    void logout().then(() : void | Promise<void> => navigate('/login', { replace: true }))
  }

  return (
    <section className={styles.shell}>
      <div className={styles.frame}>
        <div className={styles.nav}>
          <div className={styles.tabList}>
            {tabs.map((tab: { to: string; label: string; }) : React.JSX.Element => {
              if (tab.to === '/dashboard/snapshot-confirm' && isAllCompanySelected) {
                return (
                  <button
                    key={tab.to}
                    type="button"
                    className={`${styles.tab} ${styles.disabledTab}`}
                    aria-disabled="true"
                    aria-describedby={snapshotConfirmDisabledReasonId}
                    onClick={(event: React.MouseEvent<HTMLButtonElement, MouseEvent>) : void => {
                      event.preventDefault()
                      event.stopPropagation()
                    }}
                    onKeyDown={(event: React.KeyboardEvent<HTMLButtonElement>) : void => {
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
                <NavLink key={tab.to} to={tab.to} className={({ isActive }: NavLinkRenderProps) : string => `${styles.tab} ${isActive ? styles.active : ''}`}>
                  {tab.label}
                </NavLink>
              )
            })}
            {session?.user.role === 'admin' ? (
              <NavLink
                to="/admin"
                className={({ isActive }: NavLinkRenderProps) : string =>
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
            <InventoryArrivalCollectButton
              companyUuid={inventoryArrivalCompanyUuid}
              disabledReason={isAllCompanySelected ? inventoryArrivalCollectDisabledReason : undefined}
            />
            <button className={styles.userButton} type="button" onClick={() : void => setIsProfileOpen(true)}>
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
      <UserProfileDialog open={isProfileOpen} onClose={() : void => setIsProfileOpen(false)} />
    </section>
  )
}
