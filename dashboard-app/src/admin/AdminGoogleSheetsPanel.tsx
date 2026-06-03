import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { getAdminGoogleSheetConfigs, getCompanyUuidForOptionalScope, isAllCompanyUuid } from '../api'
import type { AdminGoogleSheetConfigSummary } from '../api'
import { useAuth } from '../auth/AuthContext'
import { useAppToast } from '../components/AppToastContext'
import { AdminGoogleSheetCreateDialog } from './AdminGoogleSheetCreateDialog'
import { AdminGoogleSheetDialog } from './AdminGoogleSheetDialog'
import { AdminGoogleSheetRow } from './AdminGoogleSheetRow'
import { AdminListPanel } from './AdminListPanel'
import { getErrorMessage } from './adminHelpers'
import styles from './AdminPage.module.css'

export function AdminGoogleSheetsPanel() {
  const { showToast } = useAppToast()
  const { companies, selectedCompanyUuid } = useAuth()
  const [configs, setConfigs] = useState<AdminGoogleSheetConfigSummary[]>([])
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [selectedConfigUuid, setSelectedConfigUuid] = useState<string | null>(null)
  const mountedRef = useRef(false)
  const loadSequenceRef = useRef(0)

  const concreteCompanies = useMemo(
    () => companies.filter((company) => !isAllCompanyUuid(company.uuid)),
    [companies],
  )
  const selectedListCompanyUuid = useMemo(
    () => getCompanyUuidForOptionalScope(selectedCompanyUuid),
    [selectedCompanyUuid],
  )
  const selectedConfig = configs.find((config) => config.uuid === selectedConfigUuid) ?? null
  const defaultCreateCompanyUuid = selectedListCompanyUuid ?? concreteCompanies[0]?.uuid ?? ''
  const canCreate = concreteCompanies.length > 0

  const loadConfigs = useCallback(async () => {
    return getAdminGoogleSheetConfigs({ companyUuid: selectedListCompanyUuid })
  }, [selectedListCompanyUuid])

  const reloadConfigs = useCallback(async () => {
    const loadSequence = loadSequenceRef.current + 1
    loadSequenceRef.current = loadSequence
    const isCurrentLoad = () => mountedRef.current && loadSequenceRef.current === loadSequence
    if (mountedRef.current) {
      setIsLoading(true)
      setErrorMessage(null)
    }
    try {
      const nextConfigs = await loadConfigs()
      if (isCurrentLoad()) setConfigs(nextConfigs)
    } catch (error) {
      if (!isCurrentLoad()) return
      setErrorMessage(getErrorMessage(error, '구글 시트 설정을 불러오지 못했습니다.'))
      throw error
    } finally {
      if (isCurrentLoad()) setIsLoading(false)
    }
  }, [loadConfigs])

  useEffect(() => {
    mountedRef.current = true
    let alive = true
    const loadSequence = loadSequenceRef.current + 1
    loadSequenceRef.current = loadSequence
    const isCurrentLoad = () => loadSequenceRef.current === loadSequence
    loadConfigs()
      .then((nextConfigs) => {
        if (alive && isCurrentLoad()) setConfigs(nextConfigs)
      })
      .catch((error) => {
        if (!isCurrentLoad()) return
        if (alive) setErrorMessage(getErrorMessage(error, '구글 시트 설정을 불러오지 못했습니다.'))
      })
      .finally(() => {
        if (alive && isCurrentLoad()) setIsLoading(false)
      })
    return () => {
      alive = false
      mountedRef.current = false
      loadSequenceRef.current += 1
    }
  }, [loadConfigs])

  const handleDeleted = async () => {
    await reloadConfigs()
    if (!mountedRef.current) return
    setSelectedConfigUuid(null)
    showToast('구글 시트 설정을 삭제했습니다.')
  }

  return (
    <>
      <AdminListPanel
        title="구글 시트"
        countLabel={`${configs.length}개`}
        headerClassName={styles.googleSheetTableHeader}
        columns={['자사', '이름', '용도', '서비스 계정', '시트', '상태', '변경일', '이동']}
        loadingLabel="구글 시트 설정 로딩 중"
        isLoading={isLoading}
        errorMessage={errorMessage}
        actions={
          <button
            className={styles.createButton}
            type="button"
            disabled={!canCreate}
            title={canCreate ? undefined : '등록 가능한 회사가 없습니다.'}
            onClick={() => setIsCreateDialogOpen(true)}
          >
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
        <AdminGoogleSheetCreateDialog
          companies={concreteCompanies}
          defaultCompanyUuid={defaultCreateCompanyUuid}
          onClose={() => setIsCreateDialogOpen(false)}
          onCreated={reloadConfigs}
        />
      ) : null}
      {selectedConfig ? (
        <AdminGoogleSheetDialog
          key={selectedConfig.uuid}
          config={selectedConfig}
          companies={concreteCompanies}
          onClose={() => setSelectedConfigUuid(null)}
          onChanged={reloadConfigs}
          onDeleted={handleDeleted}
        />
      ) : null}
    </>
  )
}
