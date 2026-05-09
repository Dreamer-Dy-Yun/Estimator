import { useEffect, useState, type FormEvent } from 'react'
import {
  createAdminUser,
  deleteAdminUser,
  getAdminUsers,
  resetAdminUserPassword,
  updateAdminUser,
} from '../api'
import type { AdminUserSummary, AuthRole, ResetAdminUserPasswordResult } from '../api'
import { useAuth } from '../auth/AuthContext'
import { formatUpdatedAt, getErrorMessage, ROLE_OPTIONS } from './adminHelpers'
import styles from './AdminPage.module.css'

function AdminUserRow({
  user,
  currentUserUuid,
  onSaved,
  onDeleted,
  onPasswordReset,
}: {
  user: AdminUserSummary
  currentUserUuid: string
  onSaved: () => Promise<void>
  onDeleted: () => Promise<void>
  onPasswordReset: (user: AdminUserSummary) => Promise<void>
}) {
  const [loginId, setLoginId] = useState(user.loginId)
  const [name, setName] = useState(user.name)
  const [note, setNote] = useState(user.note ?? '')
  const [role, setRole] = useState<AuthRole>(user.role)
  const [isActive, setIsActive] = useState(user.isActive)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isResettingPassword, setIsResettingPassword] = useState(false)
  const isCurrentUser = user.uuid === currentUserUuid
  const isDirty =
    loginId !== user.loginId ||
    name !== user.name ||
    note !== (user.note ?? '') ||
    role !== user.role ||
    isActive !== user.isActive

  useEffect(() => {
    setLoginId(user.loginId)
    setName(user.name)
    setNote(user.note ?? '')
    setRole(user.role)
    setIsActive(user.isActive)
    setErrorMessage(null)
    setIsSaving(false)
    setIsDeleting(false)
    setIsResettingPassword(false)
  }, [user])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setErrorMessage(null)
    setIsSaving(true)

    try {
      await updateAdminUser({
        uuid: user.uuid,
        loginId,
        name,
        note,
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

  const handlePasswordReset = async () => {
    const ok = window.confirm(`${user.loginId} 계정의 임시 비밀번호를 발급할까요?`)
    if (!ok) return

    setErrorMessage(null)
    setIsResettingPassword(true)
    try {
      await onPasswordReset(user)
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    } finally {
      setIsResettingPassword(false)
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
        <span>이름</span>
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          autoComplete="name"
          maxLength={80}
        />
      </label>
      <label className={styles.fieldCell}>
        <span>비고</span>
        <input value={note} onChange={(event) => setNote(event.target.value)} maxLength={200} />
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
        <button className={styles.saveButton} type="submit" disabled={!isDirty || isSaving}>
          {isSaving ? '변경 중' : '변경'}
        </button>
        <button
          className={styles.resetButton}
          type="button"
          onClick={handlePasswordReset}
          disabled={isResettingPassword}
        >
          {isResettingPassword ? '재설정 중' : '비밀번호 재설정'}
        </button>
        <button
          className={styles.deleteButton}
          type="button"
          onClick={handleDelete}
          disabled={isCurrentUser || isDeleting}
        >
          {isDeleting ? '제거 중' : '제거'}
        </button>
      </div>
      {errorMessage ? <p className={styles.rowError}>{errorMessage}</p> : null}
    </form>
  )
}

type PasswordResetNotice = ResetAdminUserPasswordResult & {
  loginId: string
}

export function AdminUsersPanel() {
  const { session, refreshSession } = useAuth()
  const [users, setUsers] = useState<AdminUserSummary[]>([])
  const [newLoginId, setNewLoginId] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newName, setNewName] = useState('')
  const [newNote, setNewNote] = useState('')
  const [newRole, setNewRole] = useState<AuthRole>('user')
  const [newIsActive, setNewIsActive] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [createErrorMessage, setCreateErrorMessage] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [passwordResetNotice, setPasswordResetNotice] = useState<PasswordResetNotice | null>(null)
  const [passwordCopyMessage, setPasswordCopyMessage] = useState<string | null>(null)

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

  const handlePasswordReset = async (user: AdminUserSummary) => {
    const result = await resetAdminUserPassword(user.uuid)
    setUsers((currentUsers) =>
      currentUsers.map((currentUser) =>
        currentUser.uuid === user.uuid
          ? {
              ...currentUser,
              mustChangePassword: result.mustChangePassword,
              dbUpdatedAt: result.dbUpdatedAt,
            }
          : currentUser,
      ),
    )
    setPasswordResetNotice({
      loginId: user.loginId,
      ...result,
    })
    setPasswordCopyMessage(null)
  }

  const closePasswordResetNotice = () => {
    setPasswordResetNotice(null)
    setPasswordCopyMessage(null)
  }

  const copyTemporaryPassword = async () => {
    if (!passwordResetNotice) return
    try {
      await window.navigator.clipboard.writeText(passwordResetNotice.temporaryPassword)
      setPasswordCopyMessage('복사됨')
    } catch {
      setPasswordCopyMessage('복사 실패')
    }
  }

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setCreateErrorMessage(null)
    setIsCreating(true)

    try {
      await createAdminUser({
        loginId: newLoginId,
        password: newPassword,
        name: newName,
        note: newNote,
        role: newRole,
        isActive: newIsActive,
      })
      await reloadUsers()
      setNewLoginId('')
      setNewPassword('')
      setNewName('')
      setNewNote('')
      setNewRole('user')
      setNewIsActive(true)
    } catch (error) {
      setCreateErrorMessage(getErrorMessage(error))
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <>
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
            <span>이름</span>
            <input
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
              placeholder="사용자 이름"
              autoComplete="name"
              maxLength={80}
            />
          </label>
          <label className={styles.createField}>
            <span>비고</span>
            <input
              value={newNote}
              onChange={(event) => setNewNote(event.target.value)}
              placeholder="직책, 부서 등"
              maxLength={200}
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
          <span>이름</span>
          <span>비고</span>
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
                onDeleted={reloadUsers}
                onPasswordReset={handlePasswordReset}
              />
            ))}
          </div>
        ) : null}
      </div>

      {passwordResetNotice ? (
        <div
          className={styles.resetNoticeBackdrop}
          role="presentation"
          onClick={closePasswordResetNotice}
        >
          <div
            className={styles.resetNoticeDialog}
            role="dialog"
            aria-modal="true"
            onClick={(event) => event.stopPropagation()}
          >
            <div className={styles.resetNoticeDialogHeader}>
              <strong className={styles.resetNoticeTitle}>
                {passwordResetNotice.loginId} 임시 비밀번호
              </strong>
              <button
                type="button"
                className={styles.resetNoticeCloseButton}
                onClick={closePasswordResetNotice}
                aria-label="닫기"
              >
                x
              </button>
            </div>
            <p>로그인 사용자에게 다음 임시 비밀번호를 안내해주세요. 비밀번호를 클릭하면 복사됩니다.</p>
            <button
              type="button"
              className={styles.resetNoticePasswordButton}
              onClick={copyTemporaryPassword}
              aria-label={`${passwordResetNotice.loginId} 임시 비밀번호 복사`}
            >
              <code>{passwordResetNotice.temporaryPassword}</code>
            </button>
            {passwordCopyMessage ? (
              <span className={styles.resetNoticeCopyState} role="status">
                {passwordCopyMessage}
              </span>
            ) : null}
            <div className={styles.resetNoticeActions}>
              <button type="button" onClick={closePasswordResetNotice}>
                닫기
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
