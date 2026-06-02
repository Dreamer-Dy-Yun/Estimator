import { useEffect, useState } from 'react'
import { getAdminUsers, resetAdminUserPassword } from '../api'
import type { AdminUserSummary, ResetAdminUserPasswordResult } from '../api'
import { useAuth } from '../auth/AuthContext'
import { useAppToast } from '../components/AppToastContext'
import { getErrorMessage } from './adminHelpers'
import { AdminListPanel } from './AdminListPanel'
import { AdminUserCreateDialog } from './AdminUserCreateDialog'
import { AdminUserDialog } from './AdminUserDialog'
import { AdminUserRow } from './AdminUserRow'
import styles from './AdminPage.module.css'

type PasswordResetNotice = ResetAdminUserPasswordResult & {
  loginId: string
}

export function AdminUsersPanel() {
  const { session, refreshSession } = useAuth()
  const { showToast } = useAppToast()
  const [users, setUsers] = useState<AdminUserSummary[]>([])
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [selectedUserUuid, setSelectedUserUuid] = useState<string | null>(null)
  const [passwordResetNotice, setPasswordResetNotice] = useState<PasswordResetNotice | null>(null)
  const [passwordCopyMessage, setPasswordCopyMessage] = useState<string | null>(null)
  const selectedUser = users.find((user) => user.uuid === selectedUserUuid) ?? null

  useEffect(() => {
    let alive = true
    getAdminUsers()
      .then((nextUsers) => {
        if (alive) setUsers(nextUsers)
      })
      .catch((error) => {
        if (alive) setErrorMessage(getErrorMessage(error, '사용자 목록을 불러오지 못했습니다.'))
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

  const handleChanged = async () => {
    await reloadUsers()
    await refreshSession()
  }

  const handleDeleted = async () => {
    await reloadUsers()
    setSelectedUserUuid(null)
    showToast('사용자를 제거했습니다.')
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
    setPasswordResetNotice({ loginId: user.loginId, ...result })
    setPasswordCopyMessage(null)
    showToast('임시 비밀번호를 발급했습니다.')
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
      showToast('임시 비밀번호를 복사했습니다.')
    } catch {
      setPasswordCopyMessage('복사 실패')
    }
  }

  return (
    <>
      <AdminListPanel
        title="사용자"
        countLabel={`${users.length}명`}
        headerClassName={styles.tableHeader}
        columns={['로그인 ID', '이름', '비고', '권한', '상태', '변경일']}
        loadingLabel="사용자 목록 로딩 중"
        isLoading={isLoading}
        errorMessage={errorMessage}
        actions={
          <button className={styles.createButton} type="button" onClick={() => setIsCreateDialogOpen(true)}>
            사용자 추가
          </button>
        }
      >
        {users.map((user) => (
          <AdminUserRow key={user.uuid} user={user} onOpen={(nextUser) => setSelectedUserUuid(nextUser.uuid)} />
        ))}
      </AdminListPanel>

      {isCreateDialogOpen ? (
        <AdminUserCreateDialog onClose={() => setIsCreateDialogOpen(false)} onCreated={reloadUsers} />
      ) : null}
      {selectedUser ? (
        <AdminUserDialog
          key={selectedUser.uuid}
          user={selectedUser}
          currentUserUuid={session?.user.uuid ?? ''}
          onClose={() => setSelectedUserUuid(null)}
          onChanged={handleChanged}
          onDeleted={handleDeleted}
          onPasswordReset={handlePasswordReset}
        />
      ) : null}

      {passwordResetNotice ? (
        <div className={styles.resetNoticeBackdrop} role="presentation" onClick={closePasswordResetNotice}>
          <div
            className={styles.resetNoticeDialog}
            role="dialog"
            aria-modal="true"
            onClick={(event) => event.stopPropagation()}
          >
            <div className={styles.resetNoticeDialogHeader}>
              <strong className={styles.resetNoticeTitle}>{passwordResetNotice.loginId} 임시 비밀번호</strong>
              <button type="button" className={styles.resetNoticeCloseButton} onClick={closePasswordResetNotice} aria-label="닫기">
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
