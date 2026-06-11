import type { CompanySummary } from '../api'
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

export function AdminGoogleSheetsPanel() : React.JSX.Element {
  const { showToast }: ReturnType<typeof useAppToast> = useAppToast()
  const { companies, selectedCompanyUuid }: ReturnType<typeof useAuth> = useAuth()
  const [configs, setConfigs]: [AdminGoogleSheetConfigSummary[], React.Dispatch<React.SetStateAction<AdminGoogleSheetConfigSummary[]>>] = useState<AdminGoogleSheetConfigSummary[]>([])
  const [errorMessage, setErrorMessage]: [string | null, React.Dispatch<React.SetStateAction<string | null>>] = useState<string | null>(null)
  const [isLoading, setIsLoading]: [boolean, React.Dispatch<React.SetStateAction<boolean>>] = useState(true)
  const [isCreateDialogOpen, setIsCreateDialogOpen]: [boolean, React.Dispatch<React.SetStateAction<boolean>>] = useState(false)
  const [selectedConfigUuid, setSelectedConfigUuid]: [string | null, React.Dispatch<React.SetStateAction<string | null>>] = useState<string | null>(null)
  const mountedRef: React.RefObject<boolean> = useRef(false)
  const loadSequenceRef: React.RefObject<number> = useRef(0)

  const concreteCompanies: CompanySummary[] = useMemo(
    () : CompanySummary[] => companies.filter((company: CompanySummary) : boolean => !isAllCompanyUuid(company.uuid)),
    [companies],
  )
  const selectedListCompanyUuid: string | undefined = useMemo(
    () : string | undefined => getCompanyUuidForOptionalScope(selectedCompanyUuid),
    [selectedCompanyUuid],
  )
  const selectedConfig: AdminGoogleSheetConfigSummary | null = configs.find((config: AdminGoogleSheetConfigSummary) : boolean => config.uuid === selectedConfigUuid) ?? null
  const defaultCreateCompanyUuid: string = selectedListCompanyUuid ?? concreteCompanies[0]?.uuid ?? ''
  const canCreate: boolean = concreteCompanies.length > 0

  const loadConfigs: () => Promise<AdminGoogleSheetConfigSummary[]> = useCallback(async () : Promise<AdminGoogleSheetConfigSummary[]> => {
    return getAdminGoogleSheetConfigs({ companyUuid: selectedListCompanyUuid })
  }, [selectedListCompanyUuid])

  const reloadConfigs: () => Promise<void> = useCallback(async () : Promise<void> => {
    const loadSequence: number = loadSequenceRef.current + 1
    loadSequenceRef.current = loadSequence
    const isCurrentLoad: () => boolean = () : boolean => mountedRef.current && loadSequenceRef.current === loadSequence
    if (mountedRef.current) {
      setIsLoading(true)
      setErrorMessage(null)
    }
    try {
      const nextConfigs: AdminGoogleSheetConfigSummary[] = await loadConfigs()
      if (isCurrentLoad()) setConfigs(nextConfigs)
    } catch (error: unknown) {
      if (!isCurrentLoad()) return
      setErrorMessage(getErrorMessage(error, '구글 시트 설정을 불러오지 못했습니다.'))
      throw error
    } finally {
      if (isCurrentLoad()) setIsLoading(false)
    }
  }, [loadConfigs])

  useEffect(() : () => void => {
    mountedRef.current = true
    let alive: boolean = true
    const loadSequence: number = loadSequenceRef.current + 1
    loadSequenceRef.current = loadSequence
    const isCurrentLoad: () => boolean = () : boolean => loadSequenceRef.current === loadSequence
    loadConfigs()
      .then((nextConfigs: AdminGoogleSheetConfigSummary[]) : void => {
        if (alive && isCurrentLoad()) setConfigs(nextConfigs)
      })
      .catch((error: unknown) : void => {
        if (!isCurrentLoad()) return
        if (alive) setErrorMessage(getErrorMessage(error, '구글 시트 설정을 불러오지 못했습니다.'))
      })
      .finally(() : void => {
        if (alive && isCurrentLoad()) setIsLoading(false)
      })
    return () : void => {
      alive = false
      mountedRef.current = false
      loadSequenceRef.current += 1
    }
  }, [loadConfigs])

  const handleDeleted: () => Promise<void> = async () : Promise<void> => {
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
            onClick={() : void => setIsCreateDialogOpen(true)}
          >
            구글 시트 추가
          </button>
        }
      >
        {configs.map((config: AdminGoogleSheetConfigSummary) : React.JSX.Element => (
          <AdminGoogleSheetRow
            key={config.uuid}
            config={config}
            onOpen={(nextConfig: AdminGoogleSheetConfigSummary) : void => setSelectedConfigUuid(nextConfig.uuid)}
          />
        ))}
      </AdminListPanel>
      {isCreateDialogOpen ? (
        <AdminGoogleSheetCreateDialog
          companies={concreteCompanies}
          defaultCompanyUuid={defaultCreateCompanyUuid}
          onClose={() : void => setIsCreateDialogOpen(false)}
          onCreated={reloadConfigs}
        />
      ) : null}
      {selectedConfig ? (
        <AdminGoogleSheetDialog
          key={selectedConfig.uuid}
          config={selectedConfig}
          companies={concreteCompanies}
          onClose={() : void => setSelectedConfigUuid(null)}
          onChanged={reloadConfigs}
          onDeleted={handleDeleted}
        />
      ) : null}
    </>
  )
}
