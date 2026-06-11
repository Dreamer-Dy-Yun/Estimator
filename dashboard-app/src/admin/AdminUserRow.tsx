import type { AuthRole } from '../api'
import type { AdminUserSummary } from '../api'
import { formatUpdatedAt, ROLE_OPTIONS } from './adminHelpers'
import styles from './AdminPage.module.css'

export interface AdminUserRowProps {
  user: AdminUserSummary
  onOpen: (user: AdminUserSummary) => void
}

function getRoleLabel(value: AdminUserSummary['role']) : string {
  return ROLE_OPTIONS.find((option: { value: AuthRole; label: string; }) : boolean => option.value === value)?.label ?? value
}

export function AdminUserRow({ user, onOpen }: AdminUserRowProps) : React.JSX.Element {
  return (
    <button className={styles.userRow} type="button" onClick={() : void => onOpen(user)}>
      <span className={styles.gptKeyNameCell}>
        <strong>{user.loginId}</strong>
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
