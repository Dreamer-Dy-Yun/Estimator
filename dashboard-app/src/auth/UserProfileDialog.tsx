import { useEffect, useState, type FormEvent } from 'react'
import { useAuth } from './AuthProvider'
import styles from './UserProfileDialog.module.css'

const ROLE_LABELS = {
  admin: '관리자',
  operator: '운영자',
  viewer: '조회자',
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
  const { session, updateUser } = useAuth()
  const [name, setName] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setName(session?.user.name ?? '')
    setErrorMessage(null)
    setIsSaving(false)
  }, [open, session?.user.name])

  if (!open || !session) return null

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setErrorMessage(null)
    setIsSaving(true)

    try {
      await updateUser({ name })
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
            <dt>사용자 ID</dt>
            <dd>{session.user.id}</dd>
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
            <span>표시 이름</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              autoComplete="name"
              maxLength={40}
            />
          </label>

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
