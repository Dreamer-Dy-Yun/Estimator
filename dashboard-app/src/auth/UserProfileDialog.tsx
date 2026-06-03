import { useEffect, useState } from 'react'
import { getApiErrorDisplayMessage } from '../api'
import { isApiClientError } from '../api/types/api-error'
import { useAuth } from './AuthContext'
import { useAppToast } from '../components/AppToastContext'
import { LoadingSpinner } from '../components/LoadingSpinner'
import styles from './UserProfileDialog.module.css'

const DEFAULT_PROFILE_ERROR_MESSAGE = '사용자 정보 저장 중 오류가 발생했습니다.' as const

const ROLE_LABELS: { readonly admin: '관리자'; readonly user: '사용자'; } = {
  admin: '관리자',
  user: '사용자',
} as const

function formatExpiresAt(value: string) : string {
  const date: Date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'

  return new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

function getErrorMessage(error: unknown) : string {
  if (isApiClientError(error)) return getApiErrorDisplayMessage(error, DEFAULT_PROFILE_ERROR_MESSAGE)
  return error instanceof Error ? error.message : DEFAULT_PROFILE_ERROR_MESSAGE
}

export function UserProfileDialog({ open, onClose }: { open: boolean; onClose: () => void }) : React.JSX.Element | null {
  const { session, updateUser, changePassword }: ReturnType<typeof useAuth> = useAuth()
  const { showToast }: ReturnType<typeof useAppToast> = useAppToast()
  const [loginId, setLoginId]: [string, React.Dispatch<React.SetStateAction<string>>] = useState('')
  const [currentPassword, setCurrentPassword]: [string, React.Dispatch<React.SetStateAction<string>>] = useState('')
  const [newPassword, setNewPassword]: [string, React.Dispatch<React.SetStateAction<string>>] = useState('')
  const [confirmPassword, setConfirmPassword]: [string, React.Dispatch<React.SetStateAction<string>>] = useState('')
  const [errorMessage, setErrorMessage]: [string | null, React.Dispatch<React.SetStateAction<string | null>>] = useState<string | null>(null)
  const [isSaving, setIsSaving]: [boolean, React.Dispatch<React.SetStateAction<boolean>>] = useState(false)

  useEffect(() : (() => void) | undefined => {
    if (!open) return
    let alive: boolean = true
    queueMicrotask(() : void => {
      if (!alive) return
      setLoginId(session?.user.loginId ?? '')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setErrorMessage(null)
      setIsSaving(false)
    })
    return () : void => {
      alive = false
    }
  }, [open, session?.user.loginId])

  if (!open || !session) return null

  const handleSubmit: (event: React.FormEvent<HTMLFormElement>) => Promise<void> = async (event: React.FormEvent<HTMLFormElement>) : Promise<void> => {
    event.preventDefault()
    setErrorMessage(null)
    setIsSaving(true)

    try {
      const wantsPasswordChange: boolean = Boolean(currentPassword || newPassword || confirmPassword)
      if (wantsPasswordChange) {
        if (!currentPassword || !newPassword || !confirmPassword) {
          throw new Error('비밀번호 변경 항목을 모두 입력해 주세요.')
        }
        if (newPassword !== confirmPassword) {
          throw new Error('새 비밀번호 확인이 일치하지 않습니다.')
        }
      }

      await updateUser({ loginId })
      if (wantsPasswordChange) {
        await changePassword({ currentPassword, newPassword })
      }
      onClose()
      showToast(wantsPasswordChange ? '사용자 정보와 비밀번호를 변경했습니다.' : '사용자 정보를 변경했습니다.')
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
      setIsSaving(false)
    }
  }

  return (
    <div className={styles.overlay} role="presentation" onMouseDown={onClose}>
      <section
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="user-profile-title"
        onMouseDown={(event: React.MouseEvent<HTMLElement, MouseEvent>) : void => event.stopPropagation()}
      >
        <div className={styles.header}>
          <div>
            <p className={styles.kicker}>사용자 정보</p>
            <h2 id="user-profile-title">계정</h2>
          </div>
          <button className={styles.closeButton} type="button" onClick={onClose} aria-label="닫기">
            x
          </button>
        </div>

        <dl className={styles.metaList}>
          <div>
            <dt>UUID</dt>
            <dd>{session.user.uuid}</dd>
          </div>
          <div>
            <dt>권한</dt>
            <dd>{ROLE_LABELS[session.user.role]}</dd>
          </div>
          <div>
            <dt>세션 만료</dt>
            <dd>{formatExpiresAt(session.expiresAt)}</dd>
          </div>
        </dl>

        <form className={styles.form} onSubmit={handleSubmit}>
          <label className={styles.field}>
            <span>로그인 ID</span>
            <input
              value={loginId}
              onChange={(event: React.ChangeEvent<HTMLInputElement, HTMLInputElement>) : void => setLoginId(event.target.value)}
              autoComplete="username"
              maxLength={32}
            />
          </label>

          <div className={styles.passwordGroup}>
            <div className={styles.groupHeader}>
              <h3>비밀번호 변경</h3>
            </div>
            <label className={styles.field}>
              <span>현재 비밀번호</span>
              <input
                value={currentPassword}
                onChange={(event: React.ChangeEvent<HTMLInputElement, HTMLInputElement>) : void => setCurrentPassword(event.target.value)}
                type="password"
                autoComplete="current-password"
              />
            </label>
            <label className={styles.field}>
              <span>새 비밀번호</span>
              <input
                value={newPassword}
                onChange={(event: React.ChangeEvent<HTMLInputElement, HTMLInputElement>) : void => setNewPassword(event.target.value)}
                type="password"
                autoComplete="new-password"
              />
            </label>
            <label className={styles.field}>
              <span>새 비밀번호 확인</span>
              <input
                value={confirmPassword}
                onChange={(event: React.ChangeEvent<HTMLInputElement, HTMLInputElement>) : void => setConfirmPassword(event.target.value)}
                type="password"
                autoComplete="new-password"
              />
            </label>
          </div>

          {errorMessage ? <p className={styles.errorMessage}>{errorMessage}</p> : null}

          <div className={styles.actions}>
            <button className={styles.secondaryButton} type="button" onClick={onClose}>
              취소
            </button>
            <button className={styles.primaryButton} type="submit" disabled={isSaving}>
              {isSaving ? <LoadingSpinner size="inline" label="저장 중" /> : '저장'}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}
