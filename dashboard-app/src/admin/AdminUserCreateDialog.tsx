import { useState } from 'react'
import { createAdminUser } from '../api'
import type { AuthRole } from '../api'
import { useAppToast } from '../components/AppToastContext'
import { AdminActiveSwitch } from './AdminActiveSwitch'
import { AdminCreateDialogShell } from './AdminCreateDialogShell'
import { refreshAfterAdminMutation } from './adminMutationRefresh'
import { getErrorMessage, ROLE_OPTIONS } from './adminHelpers'
import styles from './AdminPage.module.css'

export interface AdminUserCreateDialogProps {
  onClose: () => void
  onCreated: () => Promise<void>
}

const formId = 'admin-user-create-form' as const

export function AdminUserCreateDialog({ onClose, onCreated }: AdminUserCreateDialogProps) : React.JSX.Element {
  const { showToast }: ReturnType<typeof useAppToast> = useAppToast()
  const [loginId, setLoginId]: [string, React.Dispatch<React.SetStateAction<string>>] = useState('')
  const [password, setPassword]: [string, React.Dispatch<React.SetStateAction<string>>] = useState('')
  const [name, setName]: [string, React.Dispatch<React.SetStateAction<string>>] = useState('')
  const [note, setNote]: [string, React.Dispatch<React.SetStateAction<string>>] = useState('')
  const [role, setRole]: [AuthRole, React.Dispatch<React.SetStateAction<AuthRole>>] = useState<AuthRole>('user')
  const [isActive, setIsActive]: [boolean, React.Dispatch<React.SetStateAction<boolean>>] = useState(true)
  const [errorMessage, setErrorMessage]: [string | null, React.Dispatch<React.SetStateAction<string | null>>] = useState<string | null>(null)
  const [isCreating, setIsCreating]: [boolean, React.Dispatch<React.SetStateAction<boolean>>] = useState(false)

  const handleCreate: (event: React.FormEvent<HTMLFormElement>) => Promise<void> = async (event: React.FormEvent<HTMLFormElement>) : Promise<void> => {
    event.preventDefault()
    setErrorMessage(null)
    setIsCreating(true)

    try {
      await createAdminUser({ loginId, password, name, note, role, isActive })
      const refreshWarningMessage: string | null = await refreshAfterAdminMutation(onCreated)
      showToast('사용자를 추가했습니다.')
      if (refreshWarningMessage) showToast(refreshWarningMessage, { variant: 'warning' })
      onClose()
    } catch (error: unknown) {
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
          onChange={(event: React.ChangeEvent<HTMLInputElement, HTMLInputElement>) : void => setLoginId(event.target.value)}
          placeholder="login-id"
          autoComplete="username"
          maxLength={32}
        />
      </label>
      <label className={styles.createField}>
        <span>비밀번호</span>
        <input
          value={password}
          onChange={(event: React.ChangeEvent<HTMLInputElement, HTMLInputElement>) : void => setPassword(event.target.value)}
          placeholder="초기 비밀번호"
          type="password"
          autoComplete="new-password"
        />
      </label>
      <label className={styles.createField}>
        <span>이름</span>
        <input
          value={name}
          onChange={(event: React.ChangeEvent<HTMLInputElement, HTMLInputElement>) : void => setName(event.target.value)}
          placeholder="사용자 이름"
          autoComplete="name"
          maxLength={80}
        />
      </label>
      <label className={styles.createField}>
        <span>권한</span>
        <select value={role} onChange={(event: React.ChangeEvent<HTMLSelectElement, HTMLSelectElement>) : void => setRole(event.target.value as AuthRole)}>
          {ROLE_OPTIONS.map((option: { value: AuthRole; label: string; }) : React.JSX.Element => (
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
        <input value={note} onChange={(event: React.ChangeEvent<HTMLInputElement, HTMLInputElement>) : void => setNote(event.target.value)} placeholder="직책, 부서 등" maxLength={200} />
      </label>
    </AdminCreateDialogShell>
  )
}
