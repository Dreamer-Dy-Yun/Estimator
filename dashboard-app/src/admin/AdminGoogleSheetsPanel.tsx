import { useEffect, useState } from 'react'
import { getAdminGoogleSheetConfigs } from '../api'
import type { AdminGoogleSheetConfigSummary } from '../api'
import { useAppToast } from '../components/AppToastContext'
import { AdminGoogleSheetCreateDialog } from './AdminGoogleSheetCreateDialog'
import { AdminGoogleSheetDialog } from './AdminGoogleSheetDialog'
import { AdminGoogleSheetRow } from './AdminGoogleSheetRow'
import { AdminListPanel } from './AdminListPanel'
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
        if (alive) setErrorMessage(getErrorMessage(error, '구글 시트 설정을 불러오지 못했습니다.'))
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
    <>
      <AdminListPanel
        title="구글 시트"
        countLabel={`${configs.length}개`}
        headerClassName={styles.googleSheetTableHeader}
        columns={['이름', '용도', '서비스 계정', '시트', '상태', '이동']}
        loadingLabel="구글 시트 설정 로딩 중"
        isLoading={isLoading}
        errorMessage={errorMessage}
        actions={
          <button className={styles.createButton} type="button" onClick={() => setIsCreateDialogOpen(true)}>
            구글 시트 추가
          </button>
        }
      >
        {configs.map((config) => (
          <AdminGoogleSheetRow
            key={config.uuid}
            config={config}
            onOpen={(nextConfig) => setSelectedConfigUuid(nextConfig.uuid)}
          />
        ))}
      </AdminListPanel>
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
    </>
  )
}
