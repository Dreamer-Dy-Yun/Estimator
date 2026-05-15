import { useEffect, useState } from 'react'
import { deleteAdminGoogleSheetConfig, getAdminGoogleSheetConfigs } from '../api'
import type {
  AdminGoogleSheetConfigSummary,
} from '../api'
import { useAppToast } from '../components/AppToastContext'
import { LoadingSpinner } from '../components/LoadingSpinner'
import { AdminGoogleSheetCreateDialog } from './AdminGoogleSheetCreateDialog'
import { AdminGoogleSheetRow } from './AdminGoogleSheetRow'
import {
  getErrorMessage,
} from './adminHelpers'
import styles from './AdminPage.module.css'

export function AdminGoogleSheetsPanel() {
  const { showToast } = useAppToast()
  const [configs, setConfigs] = useState<AdminGoogleSheetConfigSummary[]>([])
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)

  useEffect(() => {
    let alive = true
    getAdminGoogleSheetConfigs()
      .then((nextConfigs) => {
        if (alive) setConfigs(nextConfigs)
      })
      .catch((error) => {
        if (alive) setErrorMessage(getErrorMessage(error))
      })
      .finally(() => {
        if (alive) setIsLoading(false)
      })
    return () => {
      alive = false
    }
  }, [])

  const reloadConfigs = async () => {
    const nextConfigs = await getAdminGoogleSheetConfigs()
    setConfigs(nextConfigs)
  }

  const handleDelete = async (config: AdminGoogleSheetConfigSummary) => {
    if (!window.confirm(`${config.name} 설정을 제거할까요?`)) return
    try {
      await deleteAdminGoogleSheetConfig(config.uuid)
      await reloadConfigs()
      showToast('구글 시트 설정을 삭제했습니다.')
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    }
  }

  return (
    <div className={styles.panel}>
      <div className={styles.panelHeader}>
        <div>
          <h2>구글 시트</h2>
          <p>{configs.length}개</p>
        </div>
        <button className={styles.createButton} type="button" onClick={() => setIsCreateDialogOpen(true)}>
          구글 시트 추가
        </button>
      </div>

      <div className={styles.googleSheetTableHeader} aria-hidden="true">
        <span>이름</span>
        <span>용도</span>
        <span>서비스 계정</span>
        <span>시트</span>
        <span>상태</span>
        <span>작업</span>
      </div>

      {isLoading ? (
        <div className={styles.emptyState}>
          <LoadingSpinner label="구글 시트 설정 로딩 중" />
        </div>
      ) : null}
      {errorMessage ? <div className={styles.errorState}>{errorMessage}</div> : null}
      {!isLoading && !errorMessage ? (
        <div className={styles.userList}>
          {configs.map((config) => (
            <AdminGoogleSheetRow key={config.uuid} config={config} onDelete={handleDelete} />
          ))}
        </div>
      ) : null}
      {isCreateDialogOpen ? (
        <AdminGoogleSheetCreateDialog onClose={() => setIsCreateDialogOpen(false)} onCreated={reloadConfigs} />
      ) : null}
    </div>
  )
}
