import { useEffect, useState, type FormEvent } from 'react'
import { deleteAdminUser, updateAdminUser } from '../api'
import type { AdminUserSummary, AuthRole } from '../api'
import { formatUpdatedAt, getErrorMessage, ROLE_OPTIONS } from './adminHelpers'
import styles from './AdminPage.module.css'

export function AdminUserRow({
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