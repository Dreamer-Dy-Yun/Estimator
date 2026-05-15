import { useEffect, useState } from 'react'
import { getAdminGoogleSheetConfigs } from '../api'
import type { AdminGoogleSheetConfigSummary } from '../api'
import { useAppToast } from '../components/AppToastContext'
import { LoadingSpinner } from '../components/LoadingSpinner'
import { AdminGoogleSheetCreateDialog } from './AdminGoogleSheetCreateDialog'
import { AdminGoogleSheetDialog } from './AdminGoogleSheetDialog'
import { AdminGoogleSheetRow } from './AdminGoogleSheetRow'
import { getErrorMessage } from './adminHelpers'
import styles from './AdminPage.module.css'

export function AdminGoogleSheetsPanel() {
  const { showToast } = useAppToast()
  const [configs, setConfigs] = useState<AdminGoogleSheetConfigSummary[]>([])
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [selectedConfigUuid, setSelectedConfigUuid] = useState<string | null>(null)
  const selectedConfig = configs.find((config) => config.uuid === selectedConfigUuid) ?? null

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

  const handleDeleted = async () => {
    await reloadConfigs()
    setSelectedConfigUuid(null)
    showToast('구글 시트 설정을 삭제했습니다.')
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
            <AdminGoogleSheetRow
              key={config.uuid}
              config={config}
              onOpen={(nextConfig) => setSelectedConfigUuid(nextConfig.uuid)}
            />
          ))}
        </div>
      ) : null}
      {isCreateDialogOpen ? (
        <AdminGoogleSheetCreateDialog onClose={() => setIsCreateDialogOpen(false)} onCreated={reloadConfigs} />
      ) : null}
      {selectedConfig ? (
        <AdminGoogleSheetDialog
          key={selectedConfig.uuid}
          config={selectedConfig}
          onClose={() => setSelectedConfigUuid(null)}
          onChanged={reloadConfigs}
          onDeleted={handleDeleted}
        />
      ) : null}
    </div>
  )
}