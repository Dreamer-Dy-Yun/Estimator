import { useEffect, useState, type FormEvent } from 'react'
import { useAuth } from './AuthProvider'
import styles from './UserProfileDialog.module.css'

const ROLE_LABELS = {
  admin: '관리자',
  user: '사용자',
} as const

function formatExpiresAt(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'

  return new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : '사용자 정보 저장 중 오류가 발생했습니다.'
}

export function UserProfileDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { session, updateUser, changePassword } = useAuth()
  const [loginId, setLoginId] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setLoginId(session?.user.loginId ?? '')
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
    setErrorMessage(null)
    setIsSaving(false)
  }, [open, session?.user.loginId])

  if (!open || !session) return null

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setErrorMessage(null)
    setIsSaving(true)

    try {
      const wantsPasswordChange = Boolean(currentPassword || newPassword || confirmPassword)
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
        onMouseDown={(event) => event.stopPropagation()}
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
              onChange={(event) => setLoginId(event.target.value)}
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
                onChange={(event) => setCurrentPassword(event.target.value)}
                type="password"
                autoComplete="current-password"
              />
            </label>
            <label className={styles.field}>
              <span>새 비밀번호</span>
              <input
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                type="password"
                autoComplete="new-password"
              />
            </label>
            <label className={styles.field}>
              <span>새 비밀번호 확인</span>
              <input
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
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
              {isSaving ? '저장 중' : '저장'}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}
