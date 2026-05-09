import { useState } from 'react'
import commonStyles from '../dashboard/components/common.module.css'
import { AdminApiKeysPanel } from './AdminApiKeysPanel'
import { AdminUsersPanel } from './AdminUsersPanel'
import styles from './AdminPage.module.css'

type AdminTab = 'users' | 'api-keys'

const ADMIN_TABS: Array<{ value: AdminTab; label: string }> = [
  { value: 'users', label: '사용자 관리' },
  { value: 'api-keys', label: 'API 키 관리' },
]

const HEADER_TEXT: Record<AdminTab, { title: string; meta: string }> = {
  users: {
    title: '사용자 정보 관리',
    meta: '로그인 ID, 이름, 비고, 권한, 활성 상태, 비밀번호 재설정을 관리합니다.',
  },
  'api-keys': {
    title: 'API 키 관리',
    meta: 'AI 코멘트와 추천 등에 사용할 외부 API 키의 공급자, 모델, 용도, 활성 상태를 관리합니다.',
  },
}

export function AdminPage() {
  const [activeTab, setActiveTab] = useState<AdminTab>('users')
  const header = HEADER_TEXT[activeTab]

  return (
    <section className={`${commonStyles.page} ${styles.adminPage}`}>
      <header className={styles.header}>
        <div>
          <div className={styles.headerTitleRow}>
            <h1>{header.title}</h1>
            <nav className={styles.tabBar} aria-label="관리자 메뉴">
              {ADMIN_TABS.map((tab) => (
                <button
                  key={tab.value}
                  type="button"
                  className={`${styles.tabButton} ${activeTab === tab.value ? styles.tabButtonSelected : ''}`.trim()}
                  aria-current={activeTab === tab.value ? 'page' : undefined}
                  onClick={() => setActiveTab(tab.value)}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
        </div>
        <p className={styles.headerMeta}>{header.meta}</p>
      </header>

      {activeTab === 'users' ? <AdminUsersPanel /> : <AdminApiKeysPanel />}
    </section>
  )
}
