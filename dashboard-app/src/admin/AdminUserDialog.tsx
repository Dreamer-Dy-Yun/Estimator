import { useState, type FormEvent } from 'react'
import { deleteAdminUser, updateAdminUser } from '../api'
import type { AdminUserSummary, AuthRole } from '../api'
import { useAppToast } from '../components/AppToastContext'
import { LoadingSpinner } from '../components/LoadingSpinner'
import { AdminActiveSwitch } from './AdminActiveSwitch'
import { getErrorMessage, ROLE_OPTIONS } from './adminHelpers'
import styles from './AdminPage.module.css'

interface AdminUserDialogProps {
  user: AdminUserSummary
  currentUserUuid: string
  onClose: () => void
  onChanged: () => Promise<unknown>
  onDeleted: () => Promise<void>
  onPasswordReset: (user: AdminUserSummary) => Promise<void>
}

const formId = 'admin-user-detail-form'

export function AdminUserDialog({
  user,
  currentUserUuid,
  onClose,
  onChanged,
  onDeleted,
  onPasswordReset,
}: AdminUserDialogProps) {
  const { showToast } = useAppToast()
  const [loginId, setLoginId] = useState(user.loginId)
  const [name, setName] = useState(user.name)
  const [note, setNote] = useState(user.note ?? '')
  const [role, setRole] = useState<AuthRole>(user.role)
  const [isActive, setIsActive] = useState(user.isActive)
  const [rowMessage, setRowMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isResettingPassword, setIsResettingPassword] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const isCurrentUser = user.uuid === currentUserUuid
  const isDirty =
    loginId !== user.loginId ||
    name !== user.name ||
    note !== (user.note ?? '') ||
    role !== user.role ||
    isActive !== user.isActive

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setErrorMessage(null)
    setRowMessage(null)
    setIsSaving(true)

    try {
      await updateAdminUser({ uuid: user.uuid, loginId, name, note, role, isActive })
      await onChanged()
      setRowMessage('변경됨')
      showToast('사용자 정보를 변경했습니다.')
      setDeleteConfirm(false)
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    } finally {
      setIsSaving(false)
    }
  }

  const handlePasswordReset = async () => {
    const ok = window.confirm(`${user.loginId} 계정의 임시 비밀번호를 발급할까요?`)
    if (!ok) return

    setErrorMessage(null)
    setRowMessage(null)
    setIsResettingPassword(true)
    try {
      await onPasswordReset(user)
      setRowMessage('임시 비밀번호 발급됨')
      setDeleteConfirm(false)
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    } finally {
      setIsResettingPassword(false)
    }
  }

  const handleDelete = async () => {
    if (isCurrentUser) return
    setErrorMessage(null)
    setRowMessage(null)

    if (!deleteConfirm) {
      setDeleteConfirm(true)
      setRowMessage('삭제 버튼을 한 번 더 누르면 사용자가 삭제됩니다.')
      return
    }

    setIsDeleting(true)
    try {
      await deleteAdminUser(user.uuid)
      await onDeleted()
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
      setIsDeleting(false)
      setDeleteConfirm(false)
    }
  }

  return (
    <div className={styles.gptKeyDialogBackdrop} role="presentation" onMouseDown={onClose}>
      <section
        className={styles.gptKeyDialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-user-dialog-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className={styles.gptKeyDialogHeader}>
          <div>
            <span>사용자 관리</span>
            <h3 id="admin-user-dialog-title">상세 설정</h3>
          </div>
          <button className={styles.gptKeyDialogCloseButton} type="button" onClick={onClose} aria-label="닫기">
            x
          </button>
        </header>

        <form id={formId} className={styles.gptKeyDialogForm} onSubmit={handleSubmit}>
          <label className={styles.createField}>
            <span>로그인 ID</span>
            <input value={loginId} onChange={(event) => setLoginId(event.target.value)} autoComplete="username" maxLength={32} />
          </label>
          <label className={styles.createField}>
            <span>이름</span>
            <input value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" maxLength={80} />
          </label>
          <label className={styles.createField}>
            <span>권한</span>
            <select value={role} onChange={(event) => setRole(event.target.value as AuthRole)} disabled={isCurrentUser}>
              {ROLE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <div className={styles.createActiveField}>
            <AdminActiveSwitch checked={isActive} onChange={setIsActive} disabled={isCurrentUser} />
          </div>
          <label className={`${styles.createField} ${styles.gptKeyDialogNote}`}>
            <span>비고</span>
            <input value={note} onChange={(event) => setNote(event.target.value)} maxLength={200} />
          </label>
        </form>

        {rowMessage ? <p className={styles.rowMessage}>{rowMessage}</p> : null}
        {errorMessage ? <p className={styles.rowError}>{errorMessage}</p> : null}

        <div className={styles.gptKeyDialogActions}>
          <button className={styles.dangerButton} type="button" onClick={handleDelete} disabled={isCurrentUser || isDeleting}>
            {isDeleting ? <LoadingSpinner size="inline" label="삭제 중" /> : deleteConfirm ? '삭제 확인' : '삭제'}
          </button>
          <button className={styles.secondaryButton} type="button" onClick={handlePasswordReset} disabled={isResettingPassword}>
            {isResettingPassword ? <LoadingSpinner size="inline" label="재설정 중" /> : '비밀번호 재설정'}
          </button>
          <button className={styles.createButton} type="submit" form={formId} disabled={!isDirty || isSaving}>
            {isSaving ? <LoadingSpinner size="inline" label="변경 중" /> : '변경'}
          </button>
          <button className={styles.secondaryButton} type="button" onClick={onClose}>
            닫기
          </button>
        </div>
      </section>
    </div>
  )
}