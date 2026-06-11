import { useState } from 'react'
import { deleteAdminUser, updateAdminUser } from '../api'
import type { AdminUserSummary, AuthRole } from '../api'
import { useAppToast } from '../components/AppToastContext'
import { DialogCloseButton } from '../components/DialogCloseButton'
import { LoadingSpinner } from '../components/LoadingSpinner'
import { AdminActiveSwitch } from './AdminActiveSwitch'
import { refreshAfterAdminMutation } from './adminMutationRefresh'
import { getErrorMessage, ROLE_OPTIONS } from './adminHelpers'
import styles from './AdminPage.module.css'

export interface AdminUserDialogProps {
  user: AdminUserSummary
  currentUserUuid: string
  onClose: () => void
  onChanged: () => Promise<unknown>
  onDeleted: () => Promise<void>
  onPasswordReset: (user: AdminUserSummary) => Promise<void>
}

const formId = 'admin-user-detail-form' as const

export function AdminUserDialog({
  user,
  currentUserUuid,
  onClose,
  onChanged,
  onDeleted,
  onPasswordReset,
}: AdminUserDialogProps) : React.JSX.Element {
  const { showToast }: ReturnType<typeof useAppToast> = useAppToast()
  const [note, setNote]: [string, React.Dispatch<React.SetStateAction<string>>] = useState(user.note ?? '')
  const [role, setRole]: [AuthRole, React.Dispatch<React.SetStateAction<AuthRole>>] = useState<AuthRole>(user.role)
  const [isActive, setIsActive]: [boolean, React.Dispatch<React.SetStateAction<boolean>>] = useState(user.isActive)
  const [rowMessage, setRowMessage]: [string | null, React.Dispatch<React.SetStateAction<string | null>>] = useState<string | null>(null)
  const [errorMessage, setErrorMessage]: [string | null, React.Dispatch<React.SetStateAction<string | null>>] = useState<string | null>(null)
  const [isSaving, setIsSaving]: [boolean, React.Dispatch<React.SetStateAction<boolean>>] = useState(false)
  const [isDeleting, setIsDeleting]: [boolean, React.Dispatch<React.SetStateAction<boolean>>] = useState(false)
  const [isResettingPassword, setIsResettingPassword]: [boolean, React.Dispatch<React.SetStateAction<boolean>>] = useState(false)
  const [deleteConfirm, setDeleteConfirm]: [boolean, React.Dispatch<React.SetStateAction<boolean>>] = useState(false)
  const isBusy: boolean = isSaving || isDeleting || isResettingPassword
  const isCurrentUser: boolean = user.uuid === currentUserUuid
  const isDirty: boolean =
    note !== (user.note ?? '') ||
    role !== user.role ||
    isActive !== user.isActive

  const handleSubmit: (event: React.FormEvent<HTMLFormElement>) => Promise<void> = async (event: React.FormEvent<HTMLFormElement>) : Promise<void> => {
    event.preventDefault()
    setErrorMessage(null)
    setRowMessage(null)
    setIsSaving(true)

    try {
      await updateAdminUser({ uuid: user.uuid, note, role, isActive })
      const refreshWarningMessage: string | null = await refreshAfterAdminMutation(onChanged)
      const successRowMessage = '변경됨' as const
      const successToastMessage = '사용자 정보를 변경했습니다.' as const
      setRowMessage(refreshWarningMessage ? `${successRowMessage} · ${refreshWarningMessage}` : successRowMessage)
      showToast(refreshWarningMessage ?? successToastMessage, refreshWarningMessage ? { variant: 'warning' } : undefined)
      setDeleteConfirm(false)
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    } finally {
      setIsSaving(false)
    }
  }

  const handlePasswordReset: () => Promise<void> = async () : Promise<void> => {
    const ok: boolean = window.confirm(`${user.loginId} 계정의 임시 비밀번호를 발급할까요?`)
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

  const handleDelete: () => Promise<void> = async () : Promise<void> => {
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
      const refreshWarningMessage: string | null = await refreshAfterAdminMutation(onDeleted)
      if (refreshWarningMessage) showToast(refreshWarningMessage, { variant: 'warning' })
      onClose()
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
      setIsDeleting(false)
      setDeleteConfirm(false)
    }
  }

  return (
    <div className={styles.gptKeyDialogBackdrop} role="presentation" onMouseDown={isBusy ? undefined : onClose}>
      <section
        className={styles.gptKeyDialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-user-dialog-title"
        onMouseDown={(event: React.MouseEvent<HTMLElement, MouseEvent>) : void => event.stopPropagation()}
      >
        <header className={styles.gptKeyDialogHeader}>
          <div>
            <span>사용자 관리</span>
            <h3 id="admin-user-dialog-title">상세 설정</h3>
          </div>
          <DialogCloseButton className={styles.gptKeyDialogCloseButton} disabled={isBusy} onClose={onClose} />
        </header>

        <form id={formId} className={styles.gptKeyDialogForm} onSubmit={handleSubmit}>
          <div className={styles.createField}>
            <span>{'\uB85C\uADF8\uC778 ID'}</span>
            <strong className={styles.readonlyFieldValue}>{user.loginId}</strong>
          </div>
          <div className={styles.createField}>
            <span>{'\uC774\uB984'}</span>
            <strong className={styles.readonlyFieldValue}>{user.name}</strong>
          </div>
          <label className={styles.createField}>
            <span>권한</span>
            <select value={role} onChange={(event: React.ChangeEvent<HTMLSelectElement, HTMLSelectElement>) : void => setRole(event.target.value as AuthRole)} disabled={isCurrentUser}>
              {ROLE_OPTIONS.map((option: { value: AuthRole; label: string; }) : React.JSX.Element => (
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
            <input value={note} onChange={(event: React.ChangeEvent<HTMLInputElement, HTMLInputElement>) : void => setNote(event.target.value)} maxLength={200} />
          </label>
        </form>

        {rowMessage ? <p className={styles.rowMessage}>{rowMessage}</p> : null}
        {errorMessage ? <p className={styles.rowError}>{errorMessage}</p> : null}

        <div className={styles.gptKeyDialogActions}>
          <button className={styles.dangerButton} type="button" onClick={handleDelete} disabled={isCurrentUser || isBusy}>
            {isDeleting ? <LoadingSpinner size="inline" label="삭제 중" /> : deleteConfirm ? '삭제 확인' : '삭제'}
          </button>
          <button className={styles.secondaryButton} type="button" onClick={handlePasswordReset} disabled={isBusy}>
            {isResettingPassword ? <LoadingSpinner size="inline" label="재설정 중" /> : '비밀번호 재설정'}
          </button>
          <button className={styles.createButton} type="submit" form={formId} disabled={!isDirty || isBusy}>
            {isSaving ? <LoadingSpinner size="inline" label="변경 중" /> : '변경'}
          </button>
          <button className={styles.secondaryButton} type="button" onClick={onClose} disabled={isBusy}>
            닫기
          </button>
        </div>
      </section>
    </div>
  )
}
