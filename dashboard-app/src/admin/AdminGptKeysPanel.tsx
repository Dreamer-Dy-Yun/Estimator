import { useEffect, useState } from 'react'
import { getAdminGptKeys } from '../api'
import { useAppToast } from '../components/AppToastContext'
import type {
  AdminGptKeySummary,
  AdminGptKeyTestResult,
} from '../api'
import { getErrorMessage } from './adminHelpers'
import { AdminGptKeyCreateDialog } from './AdminGptKeyCreateDialog'
import { AdminGptKeyDialog } from './AdminGptKeyDialog'
import { AdminGptKeyRow } from './AdminGptKeyRow'
import { AdminListPanel } from './AdminListPanel'
import styles from './AdminPage.module.css'

export function AdminGptKeysPanel() : React.JSX.Element {
  const { showToast }: ReturnType<typeof useAppToast> = useAppToast()
  const [gptKeys, setGptKeys]: [AdminGptKeySummary[], React.Dispatch<React.SetStateAction<AdminGptKeySummary[]>>] = useState<AdminGptKeySummary[]>([])
  const [errorMessage, setErrorMessage]: [string | null, React.Dispatch<React.SetStateAction<string | null>>] = useState<string | null>(null)
  const [testMessage, setTestMessage]: [string | null, React.Dispatch<React.SetStateAction<string | null>>] = useState<string | null>(null)
  const [isLoading, setIsLoading]: [boolean, React.Dispatch<React.SetStateAction<boolean>>] = useState(true)
  const [isCreateDialogOpen, setIsCreateDialogOpen]: [boolean, React.Dispatch<React.SetStateAction<boolean>>] = useState(false)
  const [selectedGptKeyUuid, setSelectedGptKeyUuid]: [string | null, React.Dispatch<React.SetStateAction<string | null>>] = useState<string | null>(null)
  const selectedGptKey: AdminGptKeySummary | null = gptKeys.find((gptKey: AdminGptKeySummary) : boolean => gptKey.uuid === selectedGptKeyUuid) ?? null

  useEffect(() : () => void => {
    let alive: boolean = true
    getAdminGptKeys()
      .then((nextGptKeys: AdminGptKeySummary[]) : void => {
        if (alive) setGptKeys(nextGptKeys)
      })
      .catch((error: unknown) : void => {
        if (alive) setErrorMessage(getErrorMessage(error, 'GPT 키 목록을 불러오지 못했습니다.'))
      })
      .finally(() : void => {
        if (alive) setIsLoading(false)
      })

    return () : void => {
      alive = false
    }
  }, [])

  const reloadGptKeys: () => Promise<AdminGptKeySummary[]> = async () : Promise<AdminGptKeySummary[]> => {
    const nextGptKeys: AdminGptKeySummary[] = await getAdminGptKeys()
    setGptKeys(nextGptKeys)
    return nextGptKeys
  }

  const handleTested: (result: AdminGptKeyTestResult) => void = (result: AdminGptKeyTestResult) : void => {
    setGptKeys((currentGptKeys: AdminGptKeySummary[]) : AdminGptKeySummary[] =>
      currentGptKeys.map((gptKey: AdminGptKeySummary) : AdminGptKeySummary =>
        gptKey.uuid === result.uuid
          ? {
              ...gptKey,
              lastTestStatus: result.status,
              lastTestedAt: result.testedAt,
              dbUpdatedAt: result.testedAt,
            }
          : gptKey,
      ),
    )
    setTestMessage(result.message)
  }

  const handleDeleted: () => Promise<void> = async () : Promise<void> => {
    await reloadGptKeys()
    setSelectedGptKeyUuid(null)
    setTestMessage('GPT 키가 삭제되었습니다.')
    showToast('GPT 키를 삭제했습니다.')
  }

  return (
    <>
      <AdminListPanel
        title="GPT 키"
        countLabel={`${gptKeys.length}개`}
        headerClassName={styles.gptKeyTableHeader}
        columns={['이름', '용도', '모델', '키', '상태']}
        loadingLabel="GPT 키 목록 로딩 중"
        isLoading={isLoading}
        errorMessage={errorMessage}
        actions={
          <>
            {testMessage ? <span className={styles.panelNotice}>{testMessage}</span> : null}
            <button className={styles.createButton} type="button" onClick={() : void => setIsCreateDialogOpen(true)}>
              GPT 키 추가
            </button>
          </>
        }
      >
        {gptKeys.map((gptKey: AdminGptKeySummary) : React.JSX.Element => (
          <AdminGptKeyRow
            key={gptKey.uuid}
            gptKey={gptKey}
            onOpen={(nextGptKey: AdminGptKeySummary) : void => setSelectedGptKeyUuid(nextGptKey.uuid)}
          />
        ))}
      </AdminListPanel>

      {selectedGptKey ? (
        <AdminGptKeyDialog
          key={selectedGptKey.uuid}
          gptKey={selectedGptKey}
          onClose={() : void => setSelectedGptKeyUuid(null)}
          onChanged={reloadGptKeys}
          onDeleted={handleDeleted}
          onTested={handleTested}
        />
      ) : null}
      {isCreateDialogOpen ? (
        <AdminGptKeyCreateDialog
          onClose={() : void => setIsCreateDialogOpen(false)}
          onCreated={async () : Promise<void> => {
            setTestMessage(null)
            await reloadGptKeys()
          }}
        />
      ) : null}
    </>
  )
}
