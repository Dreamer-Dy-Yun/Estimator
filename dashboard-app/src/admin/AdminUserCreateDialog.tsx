import { useState, type FormEvent } from 'react'
import { createAdminUser } from '../api'
import type { AuthRole } from '../api'
import { useAppToast } from '../components/AppToastContext'
import { AdminActiveSwitch } from './AdminActiveSwitch'
import { AdminCreateDialogShell } from './AdminCreateDialogShell'
import { getErrorMessage, ROLE_OPTIONS } from './adminHelpers'
import styles from './AdminPage.module.css'

interface AdminUserCreateDialogProps {
  onClose: () => void
  onCreated: () => Promise<void>
}

const formId = 'admin-user-create-form'

export function AdminUserCreateDialog({ onClose, onCreated }: AdminUserCreateDialogProps) {
  const { showToast } = useAppToast()
  const [loginId, setLoginId] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [note, setNote] = useState('')
  const [role, setRole] = useState<AuthRole>('user')
  const [isActive, setIsActive] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setErrorMessage(null)
    setIsCreating(true)

    try {
      await createAdminUser({ loginId, password, name, note, role, isActive })
      await onCreated()
      showToast('사용자를 추가했습니다.')
      onClose()
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <AdminCreateDialogShell
      eyebrow="사용자 관리"
      title="사용자 추가"
      formId={formId}
      submitLabel="사용자 추가"
      submittingLabel="추가 중"
      isSubmitting={isCreating}
      errorMessage={errorMessage}
      onClose={onClose}
      onSubmit={handleCreate}
    >
      <label className={styles.createField}>
        <span>로그인 ID</span>
        <input
          value={loginId}
          onChange={(event) => setLoginId(event.target.value)}
          placeholder="login-id"
          autoComplete="username"
          maxLength={32}
        />
      </label>
      <label className={styles.createField}>
        <span>비밀번호</span>
        <input
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="초기 비밀번호"
          type="password"
          autoComplete="new-password"
        />
      </label>
      <label className={styles.createField}>
        <span>이름</span>
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="사용자 이름"
          autoComplete="name"
          maxLength={80}
        />
      </label>
      <label className={styles.createField}>
        <span>권한</span>
        <select value={role} onChange={(event) => setRole(event.target.value as AuthRole)}>
          {ROLE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <div className={styles.createActiveField}>
        <AdminActiveSwitch checked={isActive} onChange={setIsActive} />
      </div>
      <label className={`${styles.createField} ${styles.gptKeyDialogNote}`}>
        <span>비고</span>
        <input value={note} onChange={(event) => setNote(event.target.value)} placeholder="직책, 부서 등" maxLength={200} />
      </label>
    </AdminCreateDialogShell>
  )
}
