import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { createAdminUser, deleteAdminUser, getAdminUsers, updateAdminUser } from '../api'
import type { AdminUserSummary, AuthRole } from '../api'
import { useAuth } from '../auth/AuthProvider'
import styles from './AdminUsersPage.module.css'

const ROLE_OPTIONS: Array<{ value: AuthRole; label: string }> = [
  { value: 'admin', label: '관리자' },
  { value: 'operator', label: '운영자' },
  { value: 'viewer', label: '조회자' },
]

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : '사용자 정보를 처리하는 중 오류가 발생했습니다.'
}

function formatUpdatedAt(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

function sortUsers(users: AdminUserSummary[]) {
  return [...users].sort((a, b) => a.id.localeCompare(b.id))
}

function AdminUserRow({
  user,
  currentUserId,
  onSaved,
  onDeleted,
}: {
  user: AdminUserSummary
  currentUserId: string
  onSaved: (user: AdminUserSummary) => void
  onDeleted: (userId: string) => void
}) {
  const [name, setName] = useState(user.name)
  const [role, setRole] = useState<AuthRole>(user.role)
  const [isActive, setIsActive] = useState(user.isActive)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const isCurrentUser = user.id === currentUserId
  const isDirty = name !== user.name || role !== user.role || isActive !== user.isActive

  useEffect(() => {
    setName(user.name)
    setRole(user.role)
    setIsActive(user.isActive)
    setErrorMessage(null)
    setIsSaving(false)
    setIsDeleting(false)
  }, [user])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setErrorMessage(null)
    setIsSaving(true)

    try {
      const updated = await updateAdminUser({
        userId: user.id,
        name,
        role,
        isActive,
      })
      onSaved(updated)
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (isCurrentUser) return
    const ok = window.confirm(`${user.name} 사용자를 제거할까요?`)
    if (!ok) return

    setErrorMessage(null)
    setIsDeleting(true)
    try {
      await deleteAdminUser(user.id)
      onDeleted(user.id)
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
      setIsDeleting(false)
    }
  }

  return (
    <form className={styles.userRow} onSubmit={handleSubmit}>
      <div className={styles.identityCell}>
        <strong>{user.id}</strong>
      </div>
      <label className={styles.fieldCell}>
        <span>이름</span>
        <input value={name} onChange={(event) => setName(event.target.value)} maxLength={40} />
      </label>
      <label className={styles.fieldCell}>
        <span>권한</span>
        <select
          value={role}
          onChange={(event) => setRole(event.target.value as AuthRole)}
          disabled={isCurrentUser}
        >
          {ROLE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <label className={styles.activeCell}>
        <input
          type="checkbox"
          checked={isActive}
          onChange={(event) => setIsActive(event.target.checked)}
          disabled={isCurrentUser}
        />
        <span>활성</span>
      </label>
      <div className={styles.updatedCell}>{formatUpdatedAt(user.dbUpdatedAt)}</div>
      <div className={styles.actionCell}>
        <button type="submit" disabled={!isDirty || isSaving}>
          {isSaving ? '저장 중' : '저장'}
        </button>
        <button type="button" onClick={handleDelete} disabled={isCurrentUser || isDeleting}>
          {isDeleting ? '제거 중' : '제거'}
        </button>
      </div>
      {errorMessage ? <p className={styles.rowError}>{errorMessage}</p> : null}
    </form>
  )
}

export function AdminUsersPage() {
  const navigate = useNavigate()
  const { session, logout, refreshSession } = useAuth()
  const [users, setUsers] = useState<AdminUserSummary[]>([])
  const [newUserId, setNewUserId] = useState('')
  const [newName, setNewName] = useState('')
  const [newInitialPassword, setNewInitialPassword] = useState('')
  const [newRole, setNewRole] = useState<AuthRole>('viewer')
  const [newIsActive, setNewIsActive] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [createErrorMessage, setCreateErrorMessage] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)

  useEffect(() => {
    let alive = true
    setIsLoading(true)
    getAdminUsers()
      .then((nextUsers) => {
        if (alive) setUsers(nextUsers)
      })
      .catch((error) => {
        if (alive) setErrorMessage(getErrorMessage(error))
      })
      .finally(() => {
        if (alive) setIsLoading(false)
      })

    return () => {
      alive = false
    }
  }, [])

  const handleSaved = (updated: AdminUserSummary) => {
    setUsers((prev) => prev.map((user) => (user.id === updated.id ? updated : user)))
    if (updated.id === session?.user.id) {
      void refreshSession()
    }
  }

  const handleDeleted = (userId: string) => {
    setUsers((prev) => prev.filter((user) => user.id !== userId))
  }

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setCreateErrorMessage(null)
    setIsCreating(true)

    try {
      const created = await createAdminUser({
        userId: newUserId,
        name: newName,
        initialPassword: newInitialPassword,
        role: newRole,
        isActive: newIsActive,
      })
      setUsers((prev) => sortUsers([...prev, created]))
      setNewUserId('')
      setNewName('')
      setNewInitialPassword('')
      setNewRole('viewer')
      setNewIsActive(true)
    } catch (error) {
      setCreateErrorMessage(getErrorMessage(error))
    } finally {
      setIsCreating(false)
    }
  }

  const handleLogout = () => {
    void logout().then(() => navigate('/login', { replace: true }))
  }

  return (
    <section className={styles.adminPage}>
      <header className={styles.header}>
        <div>
          <p className={styles.kicker}>관리자</p>
          <h1>유저 정보 관리</h1>
        </div>
        <div className={styles.headerActions}>
          <span className={styles.currentUser}>{session?.user.name ?? '관리자'}</span>
          <Link className={styles.navButton} to="/dashboard/self">
            대시보드
          </Link>
          <button className={styles.logoutButton} type="button" onClick={handleLogout}>
            로그아웃
          </button>
        </div>
      </header>

      <div className={styles.panel}>
        <div className={styles.panelHeader}>
          <div>
            <h2>사용자</h2>
            <p>{users.length}명</p>
          </div>
        </div>

        <form className={styles.createForm} onSubmit={handleCreate}>
          <label className={styles.createField}>
            <span>로그인 ID</span>
            <input
              value={newUserId}
              onChange={(event) => setNewUserId(event.target.value)}
              placeholder="login-id"
              autoComplete="username"
              maxLength={32}
            />
          </label>
          <label className={styles.createField}>
            <span>이름</span>
            <input
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
              placeholder="표시 이름"
              maxLength={40}
            />
          </label>
          <label className={styles.createField}>
            <span>임시 PW</span>
            <input
              value={newInitialPassword}
              onChange={(event) => setNewInitialPassword(event.target.value)}
              placeholder="초기 비밀번호"
              type="password"
              autoComplete="new-password"
            />
          </label>
          <label className={styles.createField}>
            <span>권한</span>
            <select value={newRole} onChange={(event) => setNewRole(event.target.value as AuthRole)}>
              {ROLE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className={styles.createActiveField}>
            <input
              type="checkbox"
              checked={newIsActive}
              onChange={(event) => setNewIsActive(event.target.checked)}
            />
            <span>활성</span>
          </label>
          <button className={styles.createButton} type="submit" disabled={isCreating}>
            {isCreating ? '추가 중' : '유저 추가'}
          </button>
          {createErrorMessage ? <p className={styles.createError}>{createErrorMessage}</p> : null}
        </form>

        <div className={styles.tableHeader} aria-hidden="true">
          <span>로그인 ID</span>
          <span>이름</span>
          <span>권한</span>
          <span>상태</span>
          <span>변경일</span>
          <span>작업</span>
        </div>

        {isLoading ? <div className={styles.emptyState}>사용자 목록 로딩 중</div> : null}
        {errorMessage ? <div className={styles.errorState}>{errorMessage}</div> : null}
        {!isLoading && !errorMessage ? (
          <div className={styles.userList}>
            {users.map((user) => (
              <AdminUserRow
                key={user.id}
                user={user}
                currentUserId={session?.user.id ?? ''}
                onSaved={handleSaved}
                onDeleted={handleDeleted}
              />
            ))}
          </div>
        ) : null}
      </div>
    </section>
  )
}
