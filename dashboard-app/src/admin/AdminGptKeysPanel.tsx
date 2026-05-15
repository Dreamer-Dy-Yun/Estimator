import { useEffect, useState } from 'react'
import { getAdminGptKeys } from '../api'
import { useAppToast } from '../components/AppToastContext'
import { LoadingSpinner } from '../components/LoadingSpinner'
import type {
  AdminGptKeySummary,
  AdminGptKeyTestResult,
} from '../api'
import { getErrorMessage } from './adminHelpers'
import { AdminGptKeyCreateDialog } from './AdminGptKeyCreateDialog'
import { AdminGptKeyDialog } from './AdminGptKeyDialog'
import { AdminGptKeyRow } from './AdminGptKeyRow'
import styles from './AdminPage.module.css'

export function AdminGptKeysPanel() {
  const { showToast } = useAppToast()
  const [gptKeys, setGptKeys] = useState<AdminGptKeySummary[]>([])
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [testMessage, setTestMessage] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [selectedGptKeyUuid, setSelectedGptKeyUuid] = useState<string | null>(null)
  const selectedGptKey = gptKeys.find((gptKey) => gptKey.uuid === selectedGptKeyUuid) ?? null

  useEffect(() => {
    let alive = true
    getAdminGptKeys()
      .then((nextGptKeys) => {
        if (alive) setGptKeys(nextGptKeys)
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

  const reloadGptKeys = async () => {
    const nextGptKeys = await getAdminGptKeys()
    setGptKeys(nextGptKeys)
    return nextGptKeys
  }

  const handleTested = (result: AdminGptKeyTestResult) => {
    setGptKeys((currentGptKeys) =>
      currentGptKeys.map((gptKey) =>
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

  const handleDeleted = async () => {
    await reloadGptKeys()
    setSelectedGptKeyUuid(null)
    setTestMessage('GPT 키가 삭제되었습니다.')
    showToast('GPT 키를 삭제했습니다.')
  }

  return (
    <div className={styles.panel}>
      <div className={styles.panelHeader}>
        <div>
          <h2>GPT 키</h2>
          <p>{gptKeys.length}개</p>
        </div>
        <div className={styles.panelHeaderActions}>
          {testMessage ? <span className={styles.panelNotice}>{testMessage}</span> : null}
          <button className={styles.createButton} type="button" onClick={() => setIsCreateDialogOpen(true)}>
            GPT 키 추가
          </button>
        </div>
      </div>

      <div className={styles.gptKeyTableHeader} aria-hidden="true">
        <span>이름</span>
        <span>용도</span>
        <span>모델</span>
        <span>키</span>
        <span>상태</span>
      </div>

      {isLoading ? (
        <div className={styles.emptyState}>
          <LoadingSpinner label="GPT 키 목록 로딩 중" />
        </div>
      ) : null}
      {errorMessage ? <div className={styles.errorState}>{errorMessage}</div> : null}
      {!isLoading && !errorMessage ? (
        <div className={styles.userList}>
          {gptKeys.map((gptKey) => (
            <AdminGptKeyRow
              key={gptKey.uuid}
              gptKey={gptKey}
              onOpen={(nextGptKey) => setSelectedGptKeyUuid(nextGptKey.uuid)}
            />
          ))}
        </div>
      ) : null}

      {selectedGptKey ? (
        <AdminGptKeyDialog
          key={selectedGptKey.uuid}
          gptKey={selectedGptKey}
          onClose={() => setSelectedGptKeyUuid(null)}
          onChanged={reloadGptKeys}
          onDeleted={handleDeleted}
          onTested={handleTested}
        />
      ) : null}
      {isCreateDialogOpen ? (
        <AdminGptKeyCreateDialog
          onClose={() => setIsCreateDialogOpen(false)}
          onCreated={async () => {
            setTestMessage(null)
            await reloadGptKeys()
          }}
        />
      ) : null}
    </div>
  )
}
