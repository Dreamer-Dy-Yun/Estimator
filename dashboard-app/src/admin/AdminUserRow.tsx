import type { AdminUserSummary } from '../api'
import { formatUpdatedAt, ROLE_OPTIONS } from './adminHelpers'
import styles from './AdminPage.module.css'

interface AdminUserRowProps {
  user: AdminUserSummary
  onOpen: (user: AdminUserSummary) => void
}

function getRoleLabel(value: AdminUserSummary['role']) {
  return ROLE_OPTIONS.find((option) => option.value === value)?.label ?? value
}

export function AdminUserRow({ user, onOpen }: AdminUserRowProps) {
  return (
    <button className={styles.userRow} type="button" onClick={() => onOpen(user)}>
      <span className={styles.gptKeyNameCell}>
        <strong>{user.loginId}</strong>
        <small>{user.mustChangePassword ? '비밀번호 변경 필요' : '비밀번호 변경 완료'}</small>
      </span>
      <span>{user.name}</span>
      <span>{user.note ?? '-'}</span>
      <span>{getRoleLabel(user.role)}</span>
      <span className={styles.statusCell}>
        <span className={`${styles.statusPill} ${user.isActive ? styles.status_success : styles.status_failed}`}>
          {user.isActive ? '활성' : '비활성'}
        </span>
      </span>
      <span>{formatUpdatedAt(user.dbUpdatedAt)}</span>
    </button>
  )
}
