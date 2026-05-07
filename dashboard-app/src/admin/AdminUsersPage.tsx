import { useEffect, useState, type FormEvent } from 'react'
import { createAdminUser, deleteAdminUser, getAdminUsers, updateAdminUser } from '../api'
import type { AdminUserSummary, AuthRole } from '../api'
import { useAuth } from '../auth/AuthProvider'
import commonStyles from '../dashboard/components/common.module.css'
import styles from './AdminUsersPage.module.css'

const ROLE_OPTIONS: Array<{ value: AuthRole; label: string }> = [
  { value: 'admin', label: '관리자' },
  { value: 'user', label: '사용자' },
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

function AdminUserRow({
  user,
  currentUserUuid,
  onSaved,
  onDeleted,
}: {
  user: AdminUserSummary
  currentUserUuid: string
  onSaved: () => Promise<void>
  onDeleted: () => Promise<void>
}) {
  const [loginId, setLoginId] = useState(user.loginId)
  const [role, setRole] = useState<AuthRole>(user.role)
  const [isActive, setIsActive] = useState(user.isActive)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const isCurrentUser = user.uuid === currentUserUuid
  const isDirty = loginId !== user.loginId || role !== user.role || isActive !== user.isActive

  useEffect(() => {
    setLoginId(user.loginId)
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
      await updateAdminUser({
        uuid: user.uuid,
        loginId,
        role,
        isActive,
      })
      await onSaved()
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (isCurrentUser) return
    const ok = window.confirm(`${user.loginId} 계정을 제거할까요?`)
    if (!ok) return

    setErrorMessage(null)
    setIsDeleting(true)
    try {
      await deleteAdminUser(user.uuid)
      await onDeleted()
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
      setIsDeleting(false)
    }
  }

  return (
    <form className={styles.userRow} onSubmit={handleSubmit}>
      <div className={styles.identityCell}>
        <span>UUID</span>
        <strong>{user.uuid}</strong>
      </div>
      <label className={styles.fieldCell}>
        <span>로그인 ID</span>
        <input
          value={loginId}
          onChange={(event) => setLoginId(event.target.value)}
          autoComplete="username"
          maxLength={32}
        />
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
  const { session, refreshSession } = useAuth()
  const [users, setUsers] = useState<AdminUserSummary[]>([])
  const [newLoginId, setNewLoginId] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newRole, setNewRole] = useState<AuthRole>('user')
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

  const reloadUsers = async () => {
    const nextUsers = await getAdminUsers()
    setUsers(nextUsers)
  }

  const handleSaved = async () => {
    await reloadUsers()
    await refreshSession()
  }

  const handleDeleted = async () => {
    await reloadUsers()
  }

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setCreateErrorMessage(null)
    setIsCreating(true)

    try {
      await createAdminUser({
        loginId: newLoginId,
        password: newPassword,
        role: newRole,
        isActive: newIsActive,
      })
      await reloadUsers()
      setNewLoginId('')
      setNewPassword('')
      setNewRole('user')
      setNewIsActive(true)
    } catch (error) {
      setCreateErrorMessage(getErrorMessage(error))
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <section className={`${commonStyles.page} ${styles.adminPage}`}>
      <header className={styles.header}>
        <div>
          <p className={styles.kicker}>관리자</p>
          <h1>사용자 정보 관리</h1>
        </div>
        <p className={styles.headerMeta}>로그인 ID, 권한, 활성 상태를 관리합니다.</p>
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
              value={newLoginId}
              onChange={(event) => setNewLoginId(event.target.value)}
              placeholder="login-id"
              autoComplete="username"
              maxLength={32}
            />
          </label>
          <label className={styles.createField}>
            <span>비밀번호</span>
            <input
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
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
            {isCreating ? '추가 중' : '사용자 추가'}
          </button>
          {createErrorMessage ? <p className={styles.createError}>{createErrorMessage}</p> : null}
        </form>

        <div className={styles.tableHeader} aria-hidden="true">
          <span>UUID</span>
          <span>로그인 ID</span>
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
                key={user.uuid}
                user={user}
                currentUserUuid={session?.user.uuid ?? ''}
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
